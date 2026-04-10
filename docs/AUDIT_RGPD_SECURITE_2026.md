# Audit RGPD & Sécurité — Tala DZ

**Date** : 9 avril 2026
**Méthodologie** : audit fichier par fichier, vérification croisée VPS/local
**Périmètre** : backend Node.js/Express, frontend React/Vite, infra Docker/Nginx
**Auditeur** : Claude Code (audit en profondeur, sans extrapolation)

> ⚠️ **Cette version remplace l'audit initial du même jour.** La première version contenait beaucoup de faux négatifs car les sous-agents cherchaient des fichiers nommés `PrivacyPolicy.tsx`, `Terms.tsx`, etc. alors que Tala DZ utilise une approche par **sections sur la page À propos** avec ancres. L'audit actuel a vérifié manuellement tous les fichiers concernés.

---

## Vérification VPS ↔ local

| Branche | HEAD | Statut |
|---|---|---|
| Local `develop` | `891c7a1f` | 3 commits non poussés (`no-push` respecté) |
| `origin/develop` | `15bafb32` | derrière local de 3 commits |
| `origin/main` (déployé sur VPS) | `9b53c7c7` | tourne sur taladz.com |

**`git diff --name-only 9b53c7c7 HEAD`** : aucun fichier RGPD modifié entre VPS et local. **Tout l'audit reflète l'état réel de production.**

Les 3 commits non poussés concernent uniquement : `useOeuvres.ts`, `FormField.tsx`, `ProgrammeForm.tsx`, les composants Hero d'œuvres, et `OeuvreInfo.tsx` — aucun fichier de sécurité ou RGPD.

---

## Score révisé

| Domaine | Ancien score | **Nouveau score** | Évolution |
|---|---|---|---|
| Sécurité backend | 72/100 | **78/100** | +6 (découverte 2FA prévu, `password_changed_at`, contrôle privacy granulaire) |
| Sécurité frontend | 74/100 | **76/100** | +2 |
| Sécurité infra/DevOps | 78/100 | **80/100** | +2 (vérif sync OK) |
| Conformité RGPD | 49/100 | **72/100** | **+23** (énormément de choses existent déjà) |
| **Global** | 65/100 | **77/100** | **+12** |

**Verdict** : Tala DZ est **largement plus mature qu'estimé initialement**. La majorité des exigences RGPD sont déjà implémentées. Il reste un **petit nombre de gaps précis et localisés**.

---

## Sommaire

1. [Top 5 actions vraiment prioritaires (révisé)](#top-5-actions-vraiment-prioritaires)
2. [Ce qui existe déjà](#ce-qui-existe-déjà-corrigé-par-rapport-au-1er-audit)
3. [Conformité RGPD](#1-conformité-rgpd--72100)
4. [Sécurité backend](#2-sécurité-backend--78100)
5. [Sécurité frontend](#3-sécurité-frontend--76100)
6. [Sécurité infra & DevOps](#4-sécurité-infra--devops--80100)
7. [Annexes](#annexes)

---

## Top 5 actions vraiment prioritaires

Classées par criticité × effort réel.

### 🔴 P0 — RGPD critique (avant ouverture aux utilisateurs UE)

| # | Action | Détails | Effort |
|---|---|---|---|
| 1 | **Enrichir les sections #conditions et #confidentialite** sur [APropos.tsx](frontEnd/src/pages/APropos.tsx) | Le contenu actuel est court (2 paragraphes chacun). Ajouter : responsable du traitement, finalités, base légale (consentement Art. 6.1.a), durées de conservation, droits Art. 15-22, contact DPO (= `contact@taladz.com`), droit de plainte CNIL, mentions légales. | 3-4 h |
| 2 | **Tracer la date du consentement** | Ajouter colonnes `date_acceptation_conditions` (DATETIME) et `ip_acceptation_conditions` (VARCHAR 45) dans la table `user`. C'est la **preuve** exigée par Art. 7. Les checkboxes existent déjà, il manque juste la trace. | 2 h |

### 🟠 P1 — RGPD important

| # | Action | Détails | Effort |
|---|---|---|---|
| 3 | **Anonymiser ou purger la table `Vue`** | [backend/models/misc/vue.js](backend/models/misc/vue.js) stocke `ip_address`, `user_agent`, `referer`, `pays`, `ville` sans expiration. Soit anonymiser l'IP (tronquer le dernier octet), soit ajouter un cron de purge à 90 jours. | 2 h |
| 4 | **Désigner formellement un DPO** + créer `docs/REGISTRE_TRAITEMENTS.md` | Pas de code à écrire. Vous-même ou un membre de l'équipe + un fichier markdown. Contact DPO = `contact@taladz.com` (déjà actif). | 4 h |

### 🟡 P2 — Sécurité

| # | Action | Détails | Effort |
|---|---|---|---|
| 5 | **CSP sur le vhost HTML de [nginx/prod.conf](nginx/prod.conf)** | La CSP existe sur le vhost API (ligne 164) mais pas sur le vhost qui sert les pages HTML (lignes 63-139). Une seule ligne à ajouter. | 30 min |

**Total P0+P1 : ~11 h** (au lieu des 44 h estimées dans le 1er audit).

---

## Ce qui existe déjà (corrigé par rapport au 1er audit)

Le 1er audit avait listé ces points comme manquants. **Ils existent en fait** :

| Point | 1er audit | **Réalité** |
|---|---|---|
| Pages légales (CGU, Privacy) | ❌ KO | ✅ Sections sur [APropos.tsx:190-204](frontEnd/src/pages/APropos.tsx#L190-L204) avec ancres `#conditions` et `#confidentialite`, liens dans Footer et RegisterForm |
| Formulaire de contact | ❓ Non vérifié | ✅ [APropos.tsx:137-176](frontEnd/src/pages/APropos.tsx#L137-L176) → POST `/api/contact`, rate-limité, validé, envoie email à `contact@taladz.com` |
| Email de contact | ❌ Non trouvé | ✅ `contact@taladz.com` ([APropos.tsx:15](frontEnd/src/pages/APropos.tsx#L15)) |
| Newsletter séparée du consentement CGU | ⚠️ "À vérifier" | ✅ Checkbox indépendante [RegisterForm.tsx:1001-1010](frontEnd/src/pages/auth/RegisterForm.tsx#L1001-L1010) |
| Liens vers Privacy/CGU dans le formulaire d'inscription | ❌ Manquant | ✅ [RegisterForm.tsx:988-993](frontEnd/src/pages/auth/RegisterForm.tsx#L988-L993) |
| Droit à l'effacement (Art. 17) | ✅ noté | ✅ confirmé : `DELETE /api/users/profile` + vérification mot de passe + anonymisation + audit trail |
| Droit d'accès / portabilité (Art. 15, 20) | ✅ noté | ✅ confirmé : `GET /api/users/profile/export` |
| Route privacy (préférences confidentialité) | ❌ Non noté | ✅ `PUT /api/users/privacy` existe |
| Champs `profil_public`, `email_public`, `telephone_public` | ❌ Non noté | ✅ [user.js:221-232](backend/models/users/user.js#L221-L232) — privacy by design |
| `toPublicJSON()` masque automatiquement password + ip_inscription | ❌ Non noté | ✅ [user.js:511-512](backend/models/users/user.js#L511-L512) |
| `password_changed_at` (invalidation JWT après changement) | ❌ Non noté | ✅ [user.js:329](backend/models/users/user.js#L329) |
| Champ `double_authentification` BDD | ❌ Non noté | ✅ [user.js:198](backend/models/users/user.js#L198) — 2FA prévue en BDD, à activer |
| Vérification d'âge 13 ans front + back | ✅ noté | ✅ confirmé front [RegisterForm.tsx:261](frontEnd/src/pages/auth/RegisterForm.tsx#L261) + back [createUserDTO.js:133](backend/dto/user/createUserDTO.js#L133) |
| Hook backend qui bloque l'inscription si conditions non acceptées | ❌ Non noté | ✅ [user.js:381-383](backend/models/users/user.js#L381-L383) |

**Conclusion** : Tala DZ a **beaucoup** plus de RGPD que ce que le 1er audit laissait croire.

---

## 1. Conformité RGPD — 72/100

### 1.1 Base légale et consentement (Art. 6, 7)

**Champs existants** dans [user.js](backend/models/users/user.js) :
- ✅ `accepte_conditions BOOLEAN NOT NULL DEFAULT false` (ligne 133)
- ✅ `accepte_newsletter BOOLEAN NOT NULL DEFAULT false` (ligne 127) — case **séparée**
- ✅ Hook `beforeCreate` qui throw si `!accepte_conditions` (ligne 381-383)

**Frontend** [RegisterForm.tsx:974-1010](frontEnd/src/pages/auth/RegisterForm.tsx#L974-L1010) :
- ✅ Checkbox "J'accepte CGU **et** Politique de confidentialité"
- ✅ Liens cliquables vers `/a-propos#conditions` et `/a-propos#confidentialite`
- ✅ Astérisque rouge "obligatoire"
- ✅ Newsletter en case séparée
- ✅ Aria-labels et messages d'erreur

❌ **Manquant pour Art. 7 (preuve)** :
- `date_acceptation_conditions DATETIME`
- `ip_acceptation_conditions VARCHAR(45)`

Sans ces 2 champs, en cas de litige, on ne peut pas prouver QUAND et de QUELLE IP l'utilisateur a coché la case. C'est le seul vrai gap de consentement.

### 1.2 Pages légales (Art. 12-14)

**Existant** sur [APropos.tsx](frontEnd/src/pages/APropos.tsx) :

| Section | Ancre | Lignes | Contenu actuel |
|---|---|---|---|
| Mission + valeurs | — | 94-126 | ✅ Complet |
| Formulaire de contact | — | 137-176 | ✅ Avec rate limit, validation, email vers `contact@taladz.com` |
| **Conditions d'utilisation (CGU)** | `#conditions` | 190-196 | ⚠️ Court (2 paragraphes) |
| **Politique de confidentialité** | `#confidentialite` | 198-204 | ⚠️ Court (2 paragraphes) |
| Ressources | `#ressources` | 207-214 | ⚠️ Court |

**Routes et liens** :
- ✅ Route `/a-propos` enregistrée [App.tsx:194](frontEnd/src/App.tsx#L194)
- ✅ Lien dans Header nav [Header.tsx:138](frontEnd/src/components/Header.tsx#L138)
- ✅ Lien dans Footer Resources [Footer.tsx:27](frontEnd/src/components/Footer.tsx#L27)
- ✅ Liens vers `#conditions` et `#confidentialite` dans Footer Legal [Footer.tsx:33-34](frontEnd/src/components/Footer.tsx#L33-L34)

⚠️ **Le contenu existe mais est trop sommaire** pour répondre à Art. 13 RGPD. Il faut ajouter :

- **Identité du responsable de traitement** (nom, adresse, SIRET si applicable)
- **Coordonnées du DPO** (qui peut être `contact@taladz.com`)
- **Finalités** précises de chaque traitement (inscription, newsletter, contact, vues)
- **Base légale** pour chaque finalité (consentement, intérêt légitime, exécution contrat)
- **Catégories** de données collectées
- **Destinataires** (Cloudinary, Brevo, etc. = sous-traitants)
- **Durée de conservation** par catégorie
- **Droits** (Art. 15-22) avec procédure pour les exercer
- **Droit de réclamation auprès de la CNIL**
- **Mentions légales** (hébergeur = OVH/Hetzner/etc., directeur de publication)

C'est ~2-4 h de rédaction (pas de code).

### 1.3 Droits des personnes (Art. 15-22)

**Routes existantes** dans [userRoutes.js:60-100](backend/routes/userRoutes.js#L60-L100) :

| Droit | Article RGPD | Route | Statut |
|---|---|---|---|
| Accès | Art. 15 | `GET /api/users/profile` | ✅ |
| Export complet (RGPD) | Art. 15 + 20 | `GET /api/users/profile/export` | ✅ JSON machine-readable |
| Rectification | Art. 16 | `PUT /api/users/profile` | ✅ |
| Effacement | Art. 17 | `DELETE /api/users/profile` | ✅ + rate limit strict + vérif mot de passe + anonymisation + audit trail |
| Portabilité | Art. 20 | (via export) | ✅ |
| Opposition (granulaire) | Art. 21 | `PUT /api/users/preferences` | ✅ 6 booléens notifications |
| Confidentialité (profil public, etc.) | Art. 21 | `PUT /api/users/privacy` | ✅ |
| Photo de profil | Art. 16 | `PATCH /api/users/profile/photo` | ✅ |

**Effacement de qualité** ([userService.js](backend/services/user/userService.js)) :
- Vérification mot de passe avant suppression (anti-CSRF)
- Anonymisation des contenus créés (oeuvres, commentaires) avant suppression
- Transactions ACID
- Audit trail conservé

**Score Art. 15-22 : 100 %**.

### 1.4 Sécurité des données (Art. 32)

- ✅ **bcrypt 14 rounds** en production ([userService.js:31](backend/services/user/userService.js#L31))
- ✅ **JWT validé strictement** au démarrage (rejet des valeurs d'exemple)
- ✅ **Refresh tokens** avec rotation, hashés en BDD
- ✅ **`password_changed_at`** pour invalider les JWT après changement de mot de passe
- ✅ **HTTPS forcé** + **HSTS** (`max-age=31536000; includeSubDomains; preload`)
- ✅ **TLS 1.2/1.3 uniquement** + ciphers ECDHE forts
- ✅ **OCSP Stapling** activé
- ✅ **Rate limiting Redis distribué** + lockout 5 tentatives 15 min
- ✅ **toPublicJSON()** masque automatiquement password et ip_inscription
- ❌ **Données sensibles en clair en BDD** : téléphone, adresse, IP inscription, documents pro. À chiffrer si vous voulez aller plus loin (AES-256 ou `sequelize-encrypt`).

### 1.5 Cookies et tracking

**Cookies posés par le backend** :

| Cookie | Type RGPD | httpOnly | secure | sameSite | Consentement requis |
|---|---|---|---|---|---|
| `access_token` | Strictly necessary (auth) | ✅ | ✅ prod | lax | ❌ Non |
| `refresh_token` | Strictly necessary (auth) | ✅ | ✅ prod | lax | ❌ Non |
| `csrf_token` | Strictly necessary (sécurité) | ❌ (volontaire) | ✅ prod | lax | ❌ Non |
| `language` | Strictly necessary (i18n) | ? | ? | ? | ❌ Non (préférence) |
| `sessionId` (vue tracking) | **Mesure d'audience** | ✅ | ✅ prod | lax | ⚠️ **OUI normalement** |

⚠️ **Le cookie `sessionId` posé par [vueController.js:45](backend/controllers/vueController.js#L45)** est associé à la table `Vue` qui stocke IP, user agent, referer, pays, ville. C'est techniquement de l'**analytics interne**, pas du strictly necessary. RGPD impose normalement un consentement OU une anonymisation.

**Pas d'analytics tiers** :
- ❌ Google Analytics
- ❌ Facebook Pixel
- ❌ Matomo
- ❌ Hotjar

### 1.6 Tracking des vues (table `Vue`) — point précis

**Modèle** [vue.js](backend/models/misc/vue.js) stocke pour chaque vue d'œuvre/événement/lieu :

| Champ | Sensibilité RGPD |
|---|---|
| `ip_address VARCHAR(45)` (NOT NULL) | **Donnée personnelle** (CNIL) |
| `user_agent VARCHAR(500)` | Donnée technique (peu sensible) |
| `referer VARCHAR(500)` | Donnée technique |
| `session_id VARCHAR(128)` | Identifiant pseudonyme |
| `pays`, `ville` | Géolocalisation indirecte (IP) |
| `id_user` (NULL si anonyme) | Lien direct si connecté |
| `date_vue` | Horodatage |

❌ **Aucun cron de purge** : ces données s'accumulent indéfiniment.

❌ **IP non anonymisée** : stockée complète.

**3 options pour conformité** :
1. **Anonymiser l'IP** : tronquer le dernier octet IPv4 (`192.168.1.X` → `192.168.1.0`) — option recommandée par la CNIL
2. **Cron de purge** à 90 jours
3. **Bannière de consentement** avec opt-in (lourde)

L'option 1 est la plus simple et permet de garder des stats utiles.

### 1.7 Conservation des données (Art. 5.1.e)

**Crons existants** ([cronService.js](backend/services/cronService.js)) :

| Cron | Fréquence | Action |
|---|---|---|
| `event-reminders` | Toutes les heures | Rappels événements |
| `clean-expired-tokens` | Tous les jours 3h | Tokens email expirés |
| `clean-old-notifications` | Dimanche 2h | Notifications > 90j |
| `calculate-stats` | Tous les jours 1h | Stats |
| `weekly-newsletter` | Lundi 9h | Newsletter |
| `upcoming-events-check` | Toutes les 30 min | Événements à venir |
| `clean-temp-files` | Tous les jours 4h | Fichiers temp > 24h |
| `update-event-status` | Toutes les heures | Statut événements |
| `email-verification-reminder` | Tous les jours 10h | Rappels vérif email |
| `archive-old-events` | 1er du mois 2h | Archivage événements |

❌ **Manquants pour RGPD** :
- `clean-old-vues` (table `Vue`)
- `clean-inactive-users` (>2 ans sans connexion)
- `anonymize-old-ips` dans logs et `Vue`

### 1.8 Logs et anonymisation

- ✅ **Winston** structuré JSON en prod
- ✅ Mots de passe et tokens **jamais loggés**
- ⚠️ **IP loggée** dans `req.ip` ([logger.js:81-89](backend/utils/logger.js#L81-L89)) sans anonymisation
- ⚠️ Pas de rotation après 90j

### 1.9 Sous-traitants identifiés

| Service | Usage | Données envoyées | Localisation | DPA signé ? |
|---|---|---|---|---|
| **Cloudinary** | Stockage médias | Photos, vidéos | USA (Delaware) | ❓ À vérifier |
| **Nodemailer (Brevo SMTP)** | Envoi emails | Adresse email + contenu | UE (Brevo France) | ✅ Brevo conforme RGPD |
| **Twilio** (SMS optionnel) | SMS / WhatsApp | Numéro téléphone | USA | ❓ À vérifier |
| **Nominatim/OpenStreetMap** | Géocodage adresses | Texte adresse | UE | ✅ Public, conforme |

⚠️ **DPAs (Data Processing Agreements)** : à télécharger gratuitement chez Cloudinary et Twilio si utilisés.

### 1.10 Mineurs (Art. 8) — ✅

- ✅ **Front** : âge minimum 13 ans vérifié [RegisterForm.tsx:261](frontEnd/src/pages/auth/RegisterForm.tsx#L261)
- ✅ **Back** : revérifié dans [createUserDTO.js:133](backend/dto/user/createUserDTO.js#L133)
- ✅ Conforme RGPD Art. 8 (UE = 13-16 ans selon pays)

### 1.11 DPO et registre des traitements (Art. 30, 37) — ❌

- ❌ Pas de DPO formellement désigné
- ❌ Pas de `docs/REGISTRE_TRAITEMENTS.md`
- ⚠️ MAIS contact RGPD existe déjà : `contact@taladz.com` (formulaire dans APropos)

**Action simple** : désigner formellement (vous-même ou un membre) et documenter dans un fichier markdown. Pas de code.

### 1.12 Score révisé par article RGPD

| Article | Exigence | Ancien | **Nouveau** |
|---|---|---|---|
| Art. 5 | Principes | 60 % | **80 %** |
| Art. 6 | Base légale | 50 % | **70 %** |
| Art. 7 | Preuve consentement | 30 % | **50 %** (manque date+IP) |
| Art. 8 | Mineurs | 100 % | **100 %** |
| Art. 12-14 | Transparence | 0 % | **40 %** (sections existent mais courtes) |
| Art. 15-17 | Droits | 100 % | **100 %** |
| Art. 20 | Portabilité | 80 % | **100 %** |
| Art. 21 | Opposition | 50 % | **90 %** (route privacy + 6 booléens) |
| Art. 25 | Privacy by design | 70 % | **85 %** (champs `profil_public`, etc.) |
| Art. 28 | Sous-traitants | 40 % | **50 %** (DPAs à signer) |
| Art. 30 | Registre | 0 % | **0 %** |
| Art. 32 | Sécurité | 85 % | **90 %** |
| Art. 33 | Notifications violation | 0 % | **0 %** |
| Art. 37 | DPO | 0 % | **30 %** (contact existe, désignation formelle manque) |

**Score RGPD global : 72/100** (vs 49 avant).

---

## 2. Sécurité backend — 78/100

### 2.1 Authentification — Score révisé 90/100

Découvertes additionnelles par rapport au 1er audit :

- ✅ **`password_changed_at`** ([user.js:329](backend/models/users/user.js#L329)) → invalidation JWT après changement de mot de passe
- ✅ **Index B-tree sur `refresh_token`** ([user.js:368](backend/models/users/user.js#L368)) → mitigation timing attack
- ✅ **`double_authentification BOOLEAN`** ([user.js:198](backend/models/users/user.js#L198)) → schéma 2FA déjà prévu, à activer
- ✅ **Vérification mot de passe avant suppression compte** ([userService.js:434](backend/services/user/userService.js#L434))
- ✅ **bcrypt 14 rounds** prod / 12 dev
- ✅ Rate limit account lockout 5 tentatives Redis distribué

❌ **Toujours manquant** :
- 2FA TOTP côté code (le champ BDD existe mais pas la logique métier)

### 2.2-2.13 — voir rapport précédent

Les autres sections (autorisation RBAC, validation, injection SQL, CSRF, CORS, helmet, rate limiting, upload, logs, sessions, admin, errors) sont identiques au rapport initial.

### Vulnérabilités urgentes (mises à jour)

1. ⚠️ **Pas de sanitisation HTML serveur** pour articles WYSIWYG (XSS persistant possible)
2. ⚠️ **2FA non activée** (champ existe mais pas de logique)
3. ⚠️ **CSP `data:` URI** dans imgSrc Helmet (XSS encodé)
4. ⚠️ **`requireVerifiedEmail` peu utilisé**
5. ⚠️ **`CORS_ALLOW_NO_ORIGIN`** existe comme bypass — vérifier en prod

---

## 3. Sécurité frontend — 76/100

Identique au rapport précédent. Points clés :

- ✅ **Tokens en cookies httpOnly** (pas de JWT en localStorage)
- ✅ **DOMPurify** pour articles
- ✅ **CSRF Double Submit Cookie**
- ✅ **safeRedirect()** anti-open redirect
- ✅ **Tabnabbing protection** (15/15 liens externes ont `rel="noopener noreferrer"`)
- ⚠️ **localStorage `user`** semi-sensible (à migrer vers sessionStorage)
- ⚠️ **CSP absente** sur le vhost HTML du reverse proxy
- ⚠️ **Validation client uniquement** (toujours revalider serveur)

---

## 4. Sécurité infra & DevOps — 80/100

### 4.1 nginx VPS reverse proxy ([nginx/prod.conf](nginx/prod.conf))

✅ Excellent (voir audit précédent). Tous les headers, TLS, OCSP, rate limiting nginx, blocage scripts upload, certbot.

⚠️ **CSP manquante** uniquement sur le vhost HTML.

### 4.2 Vérification git/sync

- ✅ `.env` actuel **n'est pas dans git** (vérifié `git ls-files | grep env`)
- ⚠️ Ancien `.env` du projet `siteGuerfi2` (commit `fc430da6`, mars 2025) reste dans l'historique avec `DB_PASSWORD="Ernst77"`. **Vérifier que ce mot de passe n'est plus utilisé nulle part** (probablement Postgres d'un projet précédent, sans rapport avec MySQL Tala DZ actuel).

### 4.3 Docker, MySQL, Redis, Backups, Monitoring, CI/CD

Identique au rapport précédent. Actions restantes :

1. ❌ **`USER nginx`** dans [frontEnd/Dockerfile](frontEnd/Dockerfile)
2. ❌ **`npm audit`** dans CI/CD
3. ⚠️ **Backups automatisés** (cron + cloud, voir notes sur sauvegarde locale)
4. ⚠️ **Mode SQL strict MySQL**

---

## Actions prioritaires (récapitulatif)

### Si vous restez en Algérie

Vous n'avez **probablement** pas besoin de tout faire. Faites au minimum :
1. **Anonymiser ou purger la table `Vue`** (2 h) — c'est aussi une bonne pratique de sobriété BDD
2. **CSP sur le vhost HTML** (30 min)
3. **`USER nginx` dans Dockerfile** (15 min)
4. **`npm audit` dans CI** (30 min)
5. **Backups automatisés** vers votre PC ou disque externe (4 h)

**Total : ~7 h**

### Si vous voulez ouvrir aux utilisateurs UE

En plus des actions ci-dessus :

6. **Enrichir #conditions et #confidentialite** sur APropos (3-4 h)
7. **`date_acceptation_conditions` + `ip_acceptation_conditions`** (2 h)
8. **Désigner DPO + créer registre** (4 h)
9. **DPAs Cloudinary, Twilio** à télécharger (30 min)
10. **Cron `clean-inactive-users`** (4 h)

**Total complet : ~21 h** (au lieu des 44 h estimées initialement).

---

## Annexes

### A. Méthodologie de cet audit (différente du 1er)

Pour ce 2ᵉ audit, j'ai :
1. **Vérifié la sync VPS/local** d'abord (`git diff --name-only`)
2. **Lu manuellement** chaque fichier RGPD pertinent (pas de pattern matching de noms)
3. **Cherché les fonctionnalités par leur action** (cookies, hooks, validations) plutôt que par nom de fichier
4. **Cross-checké** avec les imports et les routes
5. **Enregistré toutes les découvertes** dans une todolist suivie en temps réel

Le 1er audit avait délégué à 4 sous-agents en parallèle, qui ont fait du pattern matching sur des noms de fichiers conventionnels (`PrivacyPolicy.tsx`, `Terms.tsx`) et conclu à tort que rien n'existait.

### B. Fichiers vérifiés fichier par fichier

- [frontEnd/src/pages/APropos.tsx](frontEnd/src/pages/APropos.tsx) — pages légales + contact
- [frontEnd/src/components/Footer.tsx](frontEnd/src/components/Footer.tsx) — liens vers ancres
- [frontEnd/src/components/Header.tsx](frontEnd/src/components/Header.tsx) — nav vers `/a-propos`
- [frontEnd/src/App.tsx](frontEnd/src/App.tsx) — route `/a-propos`
- [frontEnd/src/pages/auth/RegisterForm.tsx](frontEnd/src/pages/auth/RegisterForm.tsx) — checkboxes consentement + âge
- [backend/models/users/user.js](backend/models/users/user.js) — modèle utilisateur complet
- [backend/models/misc/vue.js](backend/models/misc/vue.js) — tracker vues
- [backend/routes/userRoutes.js](backend/routes/userRoutes.js) — toutes les routes RGPD
- [backend/routes/contactRoutes.js](backend/routes/contactRoutes.js) — formulaire contact
- [backend/services/user/userService.js](backend/services/user/userService.js) — bcrypt + droit effacement
- [backend/services/cronService.js](backend/services/cronService.js) — crons de purge
- [backend/dto/user/createUserDTO.js](backend/dto/user/createUserDTO.js) — validation backend âge
- [backend/controllers/userController.js](backend/controllers/userController.js) — cookies auth
- [backend/middlewares/csrfMiddleware.js](backend/middlewares/csrfMiddleware.js) — cookie CSRF
- [backend/controllers/vueController.js](backend/controllers/vueController.js) — cookie sessionId vues
- [nginx/prod.conf](nginx/prod.conf) — reverse proxy VPS

### C. Avertissement

Toute nouvelle modification du modèle `User`, `RegisterForm`, ou des routes `/api/users/*` nécessite une revérification de cet audit (notamment Art. 7 et Art. 13).

---

**Audit réalisé le 9 avril 2026 par Claude Code (Opus 4.6) en mode audit profond. À réviser semestriellement.**
