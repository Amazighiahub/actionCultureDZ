# Cours — Sécurité CI/CD : DAST, SAST, SCA, Secrets

> Document pédagogique : comprendre **ce qu'on a mis en place dans `security.yml`** et **pourquoi**.
> Chaque section suit le format : définition → pourquoi c'est utile → comment c'est branché dans notre projet → pièges / bonnes pratiques.

---

## Table des matières

1. [Vue d'ensemble : pourquoi une CI de sécurité ?](#1-vue-densemble)
2. [La taxonomie des scans de sécurité](#2-taxonomie)
3. [Gitleaks — détection de secrets](#3-gitleaks)
4. [npm audit — Software Composition Analysis (SCA)](#4-npm-audit)
5. [OWASP ZAP — DAST](#5-owasp-zap)
6. [Cypress — tests de sécurité E2E](#6-cypress)
7. [GitHub Actions — les concepts clés utilisés](#7-github-actions)
8. [Docker networking en CI](#8-docker-networking)
9. [Concepts transverses](#9-concepts-transverses)
10. [Glossaire](#10-glossaire)

---

## 1. Vue d'ensemble

### Pourquoi automatiser la sécurité dans la CI ?

Historiquement, la sécurité était un *pentest* ponctuel (un audit externe 1 à 2 fois par an).
**Problèmes** : lent, cher, et les vulnérabilités introduites entre deux audits passent inaperçues.

**Shift-left security** = « déplacer la sécurité vers la gauche » du pipeline = intégrer les contrôles **dès le commit / la PR**, avant que le code n'atteigne la prod.

> **Mot-clé : Shift-left**
> Concept DevSecOps qui consiste à faire les contrôles de sécurité (scans, tests) le plus tôt possible dans le cycle de vie. Plus un bug est détecté tôt, moins il coûte cher à corriger. Source : [IBM, cost of a software bug](https://www.ibm.com/support/pages/cost-defect-depends-when-it-found).

### Notre pipeline (`.github/workflows/security.yml`)

Cinq jobs, chacun répondant à une menace différente :

| Job | Quand ? | Cherche quoi ? | Famille |
|---|---|---|---|
| `secrets-pr` | Sur PR | Secrets dans le diff | **Secrets scanning** |
| `secrets-history` | Push main + hebdo | Secrets dans l'historique complet | **Secrets scanning** |
| `audit-full` | PR + push + hebdo | CVE dans dépendances (backend + frontend) | **SCA** |
| `cypress-security` | PR + push | Régression sur nos fixes sécurité (CORS, uploads, rate-limit, `/health`) | **E2E security tests** |
| `zap-baseline` | Main + hebdo | Vulnérabilités web classiques (headers, CORS, XSS passifs…) | **DAST** |

---

## 2. Taxonomie des scans de sécurité

Il existe **quatre grandes familles** de scans. On les confond souvent.

### 2.1 SAST — Static Application Security Testing

> **Définition** : analyse du **code source** sans l'exécuter. Cherche des patterns vulnérables (SQL injection, XSS, path traversal…) directement dans le texte du code.

- **Outils** : SonarQube, Semgrep, CodeQL, ESLint (avec règles sécu).
- **Avantages** : trouve les bugs avant tout déploiement, 100 % des chemins de code couverts.
- **Inconvénients** : beaucoup de faux positifs (ne connaît pas le contexte runtime).
- **Dans notre projet** : *pas encore* de SAST (candidat futur : Semgrep ou CodeQL sur GitHub Advanced Security).

### 2.2 DAST — Dynamic Application Security Testing

> **Définition** : on lance l'application **pour de vrai** et on lui envoie des requêtes HTTP malveillantes pour voir comment elle réagit.

- **Outils** : OWASP ZAP, Burp Suite, Nuclei.
- **Avantages** : teste le système tel qu'en prod (middlewares, WAF, proxies inclus) ; zéro faux positif théorique (si ça fait boum, c'est vraiment cassé).
- **Inconvénients** : lent, n'explore que les endpoints qu'on lui indique, ne voit pas le code mort.
- **Dans notre projet** : `zap-baseline` job → **OWASP ZAP** (voir §5).

### 2.3 SCA — Software Composition Analysis

> **Définition** : audit des **dépendances tierces** (npm, Maven, pip, …) contre des bases de CVE publiques.

- **Outils** : `npm audit`, Snyk, Dependabot, Trivy.
- **Avantages** : 80 % des vulns viennent des deps tierces ; ROI énorme.
- **Inconvénients** : les CVE sont publiées *après* exploitation → délai d'alerte.
- **Dans notre projet** : `audit-full` job → **`npm audit`** sur backend et frontend, incluant devDeps (voir §4).

### 2.4 Secrets scanning

> **Définition** : grep ultra-sophistiqué qui cherche des motifs de secrets (JWT, AWS keys, Cloudinary tokens, PEM, etc.) dans le code et l'historique Git.

- **Outils** : Gitleaks, TruffleHog, `git-secrets` (AWS).
- **Avantages** : évite la fuite la plus commune (push accidentel d'un `.env` avec des credentials).
- **Inconvénients** : faux positifs (placeholders qui ressemblent à des secrets) → nécessite une *allowlist*.
- **Dans notre projet** : jobs `secrets-pr` + `secrets-history` → **Gitleaks** (voir §3).

### Schéma mental

```
┌─────────────────────┬──────────────┬──────────────────────┐
│ Quand ?             │ Quoi ?       │ Famille              │
├─────────────────────┼──────────────┼──────────────────────┤
│ Avant compilation   │ Source code  │ SAST                 │
│ Avant compilation   │ Git history  │ Secrets scanning     │
│ Build-time          │ package.json │ SCA                  │
│ Runtime (sur app)   │ HTTP traffic │ DAST                 │
│ Runtime (e2e)       │ User flows   │ Security regression  │
└─────────────────────┴──────────────┴──────────────────────┘
```

---

## 3. Gitleaks

### 3.1 Définition

**Gitleaks** est un outil open-source (Go) qui scanne des dépôts Git à la recherche de secrets **hardcodés**.

Il fonctionne en deux modes :
- **Mode détection** : applique des **regex** (patterns) pré-définies pour détecter 100+ formats de secrets connus (AWS, GitHub tokens, Stripe, JWT, Cloudinary, PEM privates keys, …).
- **Mode entropie** : détecte les chaînes à forte entropie de Shannon (≈ chaînes aléatoires) qui *ressemblent* à des secrets, même si elles ne matchent aucun pattern connu.

> **Mot-clé : Entropie de Shannon**
> Mesure du « désordre » d'une chaîne. Plus une chaîne est aléatoire, plus son entropie est haute.
> Ex : `password123` ≈ 2.5 bits, `a7f9c2d4e8b1…` ≈ 4.8 bits.
> Seuil usuel : entropie > 4.5 sur 20+ caractères → suspect.

### 3.2 Pourquoi c'est critique

Un secret commité dans un dépôt Git **reste dans l'historique à vie**, même après un `rm` + commit.
Pire : GitHub indexe les dépôts publics. Des bots scannent continuellement pour exploiter les clés exposées en quelques minutes.

**Exemples réels** :
- AWS : 1 clé exposée = facture à 50 000 $ en 24 h (bots qui lancent des EC2 de mining).
- Cloudinary : exposition du média complet + possibilité de delete.
- JWT_SECRET : tout le monde peut forger des tokens admin.

### 3.3 `gitleaks-action` dans notre workflow

```yaml
- uses: gitleaks/gitleaks-action@v2
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    GITLEAKS_ENABLE_UPLOAD_ARTIFACT: true
    GITLEAKS_ENABLE_SUMMARY: true
```

- `GITHUB_TOKEN` : permet à Gitleaks de commenter la PR avec les findings.
- `GITLEAKS_ENABLE_SUMMARY: true` : poste un résumé dans l'onglet Actions.
- `GITLEAKS_ENABLE_UPLOAD_ARTIFACT: true` : dump le rapport JSON en artifact (30 jours de rétention).

### 3.4 L'allowlist (`.gitleaks.toml`)

Sans allowlist, Gitleaks lève des alertes pour :
- Les placeholders dans `.env.example` (`JWT_SECRET=your_secret_here`).
- Les credentials de test dans Cypress fixtures (`admin123`).
- Les hash dans `package-lock.json` (ressemblent à des tokens).

Notre allowlist **paths** (fichiers entiers ignorés) :

```toml
paths = [
  '''.*\.env\.example$''',
  '''.*\.env\.sample$''',
  '''package-lock\.json$''',
  '''docs/.*''',
  '''backend/scripts/archives/.*''',
  '''frontEnd/cypress/fixtures/.*''',
]
```

Et notre allowlist **regexes** (valeurs ignorées même si trouvées ailleurs) :

```toml
regexes = [
  '''your_api_secret''',
  '''REMPLACER_PAR_UN_SECRET_GENERE''',
  '''admin123''',
  # ... etc
]
```

### 3.5 Stratégie PR vs historique

On a **splitté** en deux jobs (voir `security.yml`) :

| Job | Scope | Comportement |
|---|---|---|
| `secrets-pr` | Diff de la PR | **Bloquant** — empêche le merge si un secret est introduit. |
| `secrets-history` | Historique complet | **Non-bloquant** (`continue-on-error: true`) — rapport pour review à froid. |

**Pourquoi ?** L'historique complet peut contenir d'anciens secrets (avant `git filter-repo`) qu'on n'a pas encore nettoyés. Bloquer le main sur ça empêche tout merge jusqu'à ce que l'historique soit nettoyé, ce qui est contre-productif.

### 3.6 Que faire si Gitleaks trouve un vrai secret ?

```
┌─────────────────────────────────────────────────────┐
│ 1. Invalider le secret (rotate) auprès du service.  │
│    Ex: revoke le JWT, regenerate la clé Cloudinary. │
│ 2. Le supprimer du code + commit.                   │
│ 3. Le supprimer de l'historique avec git filter-repo│
│    (ou BFG Repo-Cleaner).                           │
│ 4. Force-push (attention : casse les forks/clones). │
│ 5. Enroller le secret dans un vrai manager          │
│    (GitHub Secrets, HashiCorp Vault, AWS KMS…).     │
└─────────────────────────────────────────────────────┘
```

---

## 4. npm audit

### 4.1 Définition

`npm audit` envoie le contenu de `package-lock.json` au registry npm. Le registry compare chaque dépendance et version avec la **GitHub Advisory Database** et retourne les CVE connues.

> **Mot-clé : CVE (Common Vulnerabilities and Exposures)**
> Identifiant unique mondial d'une vulnérabilité publiée. Format : `CVE-YYYY-NNNNN`.
> Ex : `CVE-2022-25883` = ReDoS dans `semver` < 7.5.2.

> **Mot-clé : CVSS (Common Vulnerability Scoring System)**
> Score de 0 à 10 attribué à chaque CVE. Sévérité : **low** (<4), **moderate** (4–7), **high** (7–9), **critical** (≥9).

### 4.2 Transitive dependencies

Le danger n'est pas vos dépendances directes, mais leurs dépendances à elles.

```
express (direct)
 └── body-parser (transitive)
     └── qs (transitive)
         └── CVE-2022-24999 ← ici le problème
```

Un `package.json` avec 30 deps directes installe souvent **500+ packages transitifs**. `npm audit` les contrôle tous.

### 4.3 `deploy.yml` vs `security.yml`

| Job | Fichier | Scope | Seuil |
|---|---|---|---|
| `security-audit` | `deploy.yml` | `--omit=dev` (prod only) | Bloque sur `high` |
| `audit-full` | `security.yml` | devDeps incluses | Bloque sur `critical` uniquement |

**Pourquoi deux audits ?**
- En prod, on veut 0 vuln `high+` → bloc strict.
- Les devDeps (Cypress, Jest, ESLint, outils de build) ne sont pas shippées en prod mais peuvent compromettre le **dev environment** (RCE dans un loader webpack, exfiltration via un linter). On veut la visibilité sans bloquer aussi fort.

### 4.4 Rapport JSON

```yaml
- run: npm audit --json > audit-report.json || true
- uses: actions/upload-artifact@v4
  with:
    name: audit-${{ matrix.workspace }}
    path: ${{ matrix.workspace }}/audit-report.json
```

Le `|| true` est essentiel : `npm audit` retourne un exit code non-nul si des vulns sont trouvées, ce qui tuerait l'étape avant l'upload.

### 4.5 Matrix strategy

```yaml
strategy:
  matrix:
    workspace: [backend, frontEnd]
```

Crée **deux runs parallèles** (1 par workspace). C'est le pattern *matrix build* : au lieu d'écrire deux jobs copy-paste, on déclare une variable qui explose en N jobs.

> **Mot-clé : Matrix**
> GitHub Actions parallélise automatiquement. Peut combiner plusieurs axes : `os: [ubuntu, windows]` × `node: [18, 20]` = 4 jobs.

---

## 5. OWASP ZAP

### 5.1 Définition

**OWASP ZAP** (Zed Attack Proxy) est un proxy HTTP d'analyse de sécurité open-source maintenu par la fondation OWASP. Il agit comme un *middleman* entre un navigateur et l'application cible, interceptant les requêtes et les modifiant pour détecter des vulnérabilités.

> **Mot-clé : OWASP**
> Open Worldwide Application Security Project. Fondation à but non-lucratif qui publie le **OWASP Top 10** (classement des 10 vulnérabilités web les plus courantes) et maintient des outils open-source (ZAP, Dependency-Check, ModSecurity CRS…).

### 5.2 Les trois modes de scan

| Mode | Durée | Action | Risque |
|---|---|---|---|
| **Baseline** | 2–5 min | Passif (spider + analyse des réponses) | ≈ 0 (aucune attaque envoyée) |
| **Full** | 30+ min | Passif + actif léger | Faible (modifie params) |
| **API scan** | Variable | Contre OpenAPI/GraphQL schemas | Faible |

**Baseline = scan non destructif**, parfait pour la CI : on ne cherche pas à casser, juste à observer.

### 5.3 Ce que ZAP baseline détecte

- Headers manquants : `X-Content-Type-Options`, `Strict-Transport-Security`, `Content-Security-Policy`.
- Cookies sans flags : `HttpOnly`, `Secure`, `SameSite`.
- Disclosure : versions de serveurs, stacktraces, commentaires HTML.
- CORS mal configuré.
- `Cache-Control` laxiste sur des endpoints sensibles.
- Redirections non sécurisées (HTTP → HTTP au lieu de HTTPS).

### 5.4 Le fichier `.zap/rules.tsv`

Format : `<rule-id> <niveau> <description optionnelle>`, tab-separated.

```tsv
10096	IGNORE	(Timestamp Disclosure - faux positifs sur les dates ISO)
10049	IGNORE	(Non-Storable Content - API REST, normal)
10020	WARN	(X-Frame-Options - geré par Helmet)
```

- `IGNORE` : ne rapporte jamais cette alerte.
- `WARN` : rapporte mais n'échoue pas.
- `FAIL` : échoue le scan si trouvé.

**Pourquoi on ignore certaines règles ?** Parce qu'elles sont conçues pour des applis web monolithiques rendant du HTML. Une API REST moderne (JSON only) déclenche beaucoup de faux positifs (`10109 Modern Web Application` par exemple).

### 5.5 Le problème Docker networking (notre "point à risque")

L'action `zaproxy/action-baseline@v0.15.0` **lance ZAP dans un conteneur Docker** avec le driver réseau `bridge` par défaut.

```
┌────────────────────────────────────────────────────┐
│ GitHub Actions Runner (VM Ubuntu)                  │
│                                                    │
│   node server.js (écoute sur 0.0.0.0:3001)       │
│                                                    │
│   docker0 (bridge virtuel)                         │
│   ├── gateway: 172.17.0.1 ────────┐               │
│   │                                ↓               │
│   └── container ZAP (172.17.0.2)  reach 172.17.0.1│
│           ↓                                        │
│           curl http://172.17.0.1:3001/api/         │
└────────────────────────────────────────────────────┘
```

**Pourquoi `172.17.0.1` ?** C'est l'IP par défaut du **bridge Docker** sur Linux, qui correspond à l'hôte vu depuis un conteneur. Ce n'est PAS `localhost` (qui pointerait sur le conteneur lui-même).

**Le risque** : si GitHub change l'isolation réseau des runners (passage à Firecracker plus strict), `172.17.0.1` peut disparaître ou changer.

**Notre mitigation** (pre-flight step) :

```yaml
- name: Pre-flight - verifier connectivite Docker -> host
  run: |
    docker run --rm --network bridge curlimages/curl:8.10.1 \
      -fsS --max-time 10 http://172.17.0.1:3001/health
    # Si ça fail : on dump ip addr, docker network inspect bridge, warning visible.
```

On **reproduit exactement le setup réseau de ZAP** dans un conteneur éphémère avant le scan. Si le test tombe, on le sait en 10 secondes et on a tout le diagnostic nécessaire.

### 5.6 `continue-on-error: true`

Le job `zap-baseline` a `continue-on-error: true`. Cela signifie :
- Si ZAP trouve des alertes → le job affiche ❌ dans l'UI GitHub.
- **Mais** le pipeline global reste ✅.

**Pourquoi ?** Un rapport DAST est un *indicateur*, pas une vérité absolue. Le faire bloquer casserait la vélocité pour des faux positifs.
Si on veut le rendre bloquant plus tard, il suffit de retirer cette ligne + configurer « Require status check » dans GitHub branch protection.

---

## 6. Cypress — tests de sécurité E2E

### 6.1 Différence E2E sec vs DAST

| DAST (ZAP) | E2E sec (Cypress) |
|---|---|
| Outil tiers qui « attaque » aveuglément | Tests **écrits par nous** qui ciblent des points précis |
| Trouve les faiblesses génériques | Vérifie que **nos fixes de lots précédents** ne régressent pas |
| Passif (surface scan) | Actif (on envoie des payloads précis) |

### 6.2 Notre spec : `18-security-lots.cy.ts`

10 tests qui vérifient que les mitigations mises en place lors des lots précédents tiennent :

- **Lot 4 (CORS hardening)** : `Origin: https://evil.com` → pas de `Access-Control-Allow-Origin` dans la réponse.
- **Lot 7 (Upload magic bytes)** : un `.mp4` renommé en `.jpg` → rejet (magic bytes détectés).
- **Lot 10 (Rate-limit Redis)** : `RateLimit-Reset` ≤ 3600 s (pas 86400 comme avant le fix).
- **Lot 8 (EnvValidator + /health)** : `/health` → pas de path interne, pas de secret leaké.

### 6.3 Pourquoi `18-` en préfixe ?

Convention de nommage : tous les specs Cypress démarrent par un numéro pour garantir un **ordre d'exécution déterministe**. Utile quand des specs dépendent d'un état précédent (ex: créer un user puis s'y connecter).

### 6.4 Cypress sans UI ?

Oui : notre spec utilise `cy.request()` (appels HTTP directs) et **pas** `cy.visit()`. Donc :
- Pas besoin d'un frontend buildé / servi.
- Beaucoup plus rapide (pas de navigateur headless à démarrer).
- Fonctionne dans la CI même sans `npm run dev`.

C'est pourquoi dans `security.yml`, on override `CYPRESS_baseUrl: http://127.0.0.1:3001` (pour que Cypress ne plante pas faute de baseUrl valide) sans lancer le frontend.

---

## 7. GitHub Actions — concepts clés

### 7.1 La hiérarchie

```
workflow (fichier .yml)
├── trigger (on: push / pull_request / schedule / ...)
└── jobs
    ├── job-1
    │   ├── runs-on: ubuntu-latest     ← machine virtuelle
    │   ├── services: { mysql, redis } ← conteneurs auxiliaires
    │   ├── env: { ... }                ← variables d'environnement
    │   └── steps: [...]                ← séquence d'actions
    └── job-2 ...
```

### 7.2 Triggers utilisés

```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 6 * * 1'  # Lundi 6h UTC
```

> **Mot-clé : cron expression**
> 5 champs : `minute heure jour_du_mois mois jour_de_la_semaine`.
> `0 6 * * 1` = Lundi à 06:00 UTC. Outil : [crontab.guru](https://crontab.guru).

### 7.3 Conditions : `if`

```yaml
if: |
  github.event_name == 'schedule' ||
  (github.event_name == 'push' && github.ref == 'refs/heads/main')
```

Permet d'activer/désactiver un job dynamiquement. Le `|` indique un string multi-ligne en YAML.

### 7.4 Services containers

```yaml
services:
  mysql:
    image: mysql:8.0
    options: >-
      --health-cmd="mysqladmin ping -h 127.0.0.1 -u root -prootpass"
      --health-interval=10s
      --health-retries=10
```

GitHub démarre ces conteneurs **avant** le premier step et les connecte au réseau du job.
Le `--health-cmd` + `--health-retries` = GitHub **attend automatiquement** que le healthcheck passe avant de lancer les steps. C'est pourquoi on a pu **supprimer** nos scripts `wait-for-mysql` manuels.

### 7.5 Artifacts

```yaml
- uses: actions/upload-artifact@v4
  with:
    name: zap-baseline-report
    path: report_html.html
    retention-days: 30
```

Upload un fichier/dossier dans les stockages GitHub, téléchargeable depuis l'UI. Utile pour garder les rapports (ZAP, npm audit, Cypress screenshots) sans polluer le repo.

### 7.6 Secrets GitHub

```yaml
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Les secrets sont stockés chiffrés dans **Settings → Secrets and variables → Actions**. Impossible de les lire en clair après les avoir posés. `GITHUB_TOKEN` est généré automatiquement pour chaque workflow run.

### 7.7 `continue-on-error: true` vs `if: failure()`

- `continue-on-error: true` sur un job/step → son échec ne stoppe pas le workflow.
- `if: failure()` sur un step → ne s'exécute **que si** un step précédent a échoué. Utile pour dump logs :

```yaml
- name: Dump backend logs on failure
  if: failure()
  run: tail -n 200 backend.log
```

### 7.8 `npx --yes -p sequelize-cli@6`

- `--yes` : bypass la question interactive « voulez-vous installer ce package ? ».
- `-p sequelize-cli@6` : télécharge temporairement `sequelize-cli` v6 (pour l'invocation, puis purge).

Évite de pré-installer sequelize-cli globalement et garantit la version (le v7 a des breaking changes).

---

## 8. Docker networking en CI

### 8.1 Les 3 cas courants

```
1. Backend sur le runner, test sur le runner
   → tout est sur localhost, rien à faire.

2. Backend dans un service container, test sur le runner
   → test parle à localhost:PORT (port mapping déclaratif).

3. Backend sur le runner, test dans un conteneur (notre cas ZAP)
   → test doit utiliser 172.17.0.1 (gateway du bridge).
```

### 8.2 Le bridge Docker `docker0`

À l'installation de Docker, une interface virtuelle `docker0` est créée :

```
docker0: inet 172.17.0.1/16 (gateway du réseau bridge)
   ├── container A: 172.17.0.2
   ├── container B: 172.17.0.3
   └── ...
```

Tous les conteneurs en `--network bridge` (le défaut) :
- Peuvent se parler via ces IPs internes (si on connaît l'IP du voisin).
- Peuvent atteindre l'hôte via `172.17.0.1`.
- **Ne peuvent PAS** utiliser `localhost` pour l'hôte (ça = eux-mêmes).

### 8.3 Alternative : `--network host`

```bash
docker run --network host ...
```

Le conteneur partage **la stack réseau de l'hôte** : `localhost` dans le conteneur = localhost de l'hôte. Simple, mais perd l'isolation réseau.

L'action ZAP `@v0.15.0` ne permet PAS de passer `--network host` via `cmd_options` (limitation de l'action wrapper). D'où notre approche `172.17.0.1`.

---

## 9. Concepts transverses

### 9.1 Baseline

> **Définition** : un état de référence acceptable à un instant T. Les scans futurs comparent le delta.

**Usage pratique** :
- Après le premier run de Gitleaks, on reviewe les findings → on met à jour `.gitleaks.toml` pour allowlist les faux positifs. Ce qui reste devient la « baseline propre ».
- Après le premier run de ZAP, on ajoute les alertes acceptables à `.zap/rules.tsv` en `IGNORE`.

### 9.2 Allowlist vs Blocklist

- **Allowlist** (whitelist) : on liste ce qui est *autorisé*, tout le reste est refusé. **Plus sûr** (fail-closed).
- **Blocklist** (blacklist) : on liste ce qui est *interdit*, tout le reste est autorisé. **Moins sûr** (fail-open).

Notre CORS (Lot 4) : allowlist d'origines. Gitleaks : allowlist de paths. ZAP : allowlist (via `IGNORE`) sur rules.

### 9.3 Blocking vs Non-blocking jobs

| Approche | Avantage | Inconvénient |
|---|---|---|
| Blocking (`continue-on-error: false`) | Impose la qualité, pas de régression possible | Ralentit les devs, risque de bypass |
| Non-blocking | Visibilité sans friction | Peut être ignoré indéfiniment |

**Règle personnelle du projet** :
- PR + sécurité critique (secrets PR, npm audit critical) → blocking.
- PR + reporting (ZAP, history gitleaks) → non-blocking avec artifact.

### 9.4 Fail-closed vs fail-open

- **Fail-closed** : en cas d'erreur, on refuse l'accès (plus sûr). Ex : notre blacklist JWT qui refuse si Redis est down.
- **Fail-open** : en cas d'erreur, on laisse passer (plus disponible). Ex : un WAF qui laisse passer si ses règles ne chargent pas.

En sécurité, **toujours préférer fail-closed** pour les chemins critiques.

### 9.5 Defense in depth

> **Définition** : empiler plusieurs couches de sécurité indépendantes. Si l'une tombe, les autres tiennent.

Exemple chez nous sur les uploads (Lot 7) :
1. Multer limite la taille côté Node (1ère couche).
2. `validateMagicBytesBuffer` contrôle les octets réels (2ème couche).
3. Cloudinary rejette si l'extension ne colle pas au mime (3ème couche).

Un attaquant doit faire tomber les 3 pour passer.

---

## 10. Glossaire

| Terme | Définition courte |
|---|---|
| **Actions (GitHub)** | Plateforme CI/CD intégrée à GitHub, workflows en YAML. |
| **Allowlist** | Liste blanche : ce qui est autorisé (reste refusé). |
| **Artifact (CI)** | Fichier produit par un job, stocké pour téléchargement. |
| **Baseline** | État de référence initial accepté. |
| **Blocklist** | Liste noire : ce qui est interdit (reste autorisé). |
| **Bridge (Docker)** | Réseau virtuel par défaut, gateway `172.17.0.1`. |
| **CI/CD** | Continuous Integration / Continuous Deployment. |
| **continue-on-error** | Directive Actions : un échec n'interrompt pas le workflow. |
| **CORS** | Cross-Origin Resource Sharing : mécanisme de contrôle d'accès cross-domain navigateur. |
| **CVE** | Common Vulnerabilities and Exposures : identifiant unique de vuln. |
| **CVSS** | Common Vulnerability Scoring System : score de sévérité 0–10. |
| **DAST** | Dynamic Application Security Testing : scan à l'exécution. |
| **Defense in depth** | Sécurité par couches empilées. |
| **devDependencies** | Dépendances npm utilisées uniquement en dev/test. |
| **Docker network host** | Mode où le conteneur partage la stack réseau de l'hôte. |
| **Entropie (Shannon)** | Mesure du désordre d'une chaîne (plus haute = plus aléatoire). |
| **Fail-closed** | En cas d'erreur, refuser par défaut (sûr). |
| **Fail-open** | En cas d'erreur, autoriser par défaut (disponible mais risqué). |
| **Gitleaks** | Scanner de secrets dans un dépôt Git. |
| **Healthcheck (Docker)** | Commande qui détermine si un conteneur est « healthy ». |
| **Matrix (Actions)** | Stratégie pour paralléliser un job sur plusieurs combinaisons de variables. |
| **Magic bytes** | Premiers octets d'un fichier qui identifient son type réel (ex: `FFD8FF` = JPEG). |
| **npm audit** | Commande npm qui confronte `package-lock.json` à la CVE DB. |
| **OWASP** | Open Worldwide Application Security Project, fondation. |
| **OWASP Top 10** | Classement des 10 vulnérabilités web les plus courantes. |
| **Passive scan** | Observation sans attaque active (lit les réponses, n'altère pas les requêtes). |
| **Rate limiting** | Limitation du nombre de requêtes par IP/user. |
| **Runner (Actions)** | Machine (VM ou self-hosted) qui exécute les jobs. |
| **SAST** | Static Application Security Testing : analyse statique du source. |
| **SCA** | Software Composition Analysis : audit des dépendances tierces. |
| **Schedule (cron)** | Déclencheur temporel pour un workflow. |
| **Secret scanning** | Détection de credentials hardcodés dans le code/git. |
| **Services (Actions)** | Conteneurs auxiliaires (DB, Redis) démarrés pour un job. |
| **Shift-left security** | Déplacer les contrôles sécu le plus tôt possible dans le cycle. |
| **Spider (crawler)** | Composant de ZAP qui découvre les URLs d'une application. |
| **Transitive dependency** | Dépendance d'une dépendance (pas directement dans ton `package.json`). |
| **Trigger (Actions)** | Événement qui lance un workflow (push, PR, schedule…). |
| **Vulnerability (Vuln)** | Faille exploitable dans le code ou une dépendance. |
| **ZAP** | Zed Attack Proxy, outil DAST de l'OWASP. |

---

## Pour aller plus loin

- **OWASP Top 10** : <https://owasp.org/www-project-top-ten/>
- **OWASP Cheat Sheets** : <https://cheatsheetseries.owasp.org/>
- **ZAP docs** : <https://www.zaproxy.org/docs/>
- **Gitleaks docs** : <https://github.com/gitleaks/gitleaks>
- **GitHub Actions docs** : <https://docs.github.com/en/actions>
- **npm audit docs** : <https://docs.npmjs.com/cli/v10/commands/npm-audit>
- **Cypress security testing** : <https://docs.cypress.io/guides/guides/authentication>

---

*Document lié au Lot 6 (CI Security) — mis à jour avec le workflow `.github/workflows/security.yml` à la date du commit.*
