# Audit complet EventCulture / Action Culture DZ

**Date**: avril 2026
**Portée**: monorepo complet (backend Node/Express + frontend React/Vite + Docker/CI)
**Méthode**: relecture ciblée des points critiques (architecture, sécurité, perf, qualité, devops, tests, docs)

---

## 1. Vue d'ensemble

| Élément | Valeur |
|---|---|
| Backend | Node ≥18.17, Express 4.21, Sequelize 6.37 (MySQL 8), Redis 7, Bull, Socket.IO |
| Frontend | React 18, Vite 7, TS 5.5, TanStack Query, Radix/shadcn, i18next, Leaflet |
| Observabilité | Winston, Sentry (optionnel), Morgan, request-id |
| Infra | Docker Compose prod (nginx, mysql, redis, certbot, backup), GitLab CI |
| Modules métier | users, oeuvres, evenements, lieux, patrimoine, artisanat, services, parcours, programmes, commentaires, favoris, notifications, signalements, intervenants, tracking, article-blocks, organisations, multilingual, search, stats, dashboard, upload, email-verification |
| Tests backend | ~26 unit + integration + controllers + models (Jest + Supertest) |
| Tests frontend | Vitest (forms) + Cypress (e2e: auth, nav, security, perf…) |
| Langues | fr, ar, en, tz-ltn, tz-tfng (i18n backend + frontend, RTL) |

**Verdict global**: projet mature et bien structuré, avec des choix d'architecture solides (DI container, Service/Repository, DTO, middlewares bien segmentés, CSRF double-submit, JWT cookies httpOnly, rate-limit Redis distribué, CSP stricte). Plusieurs fichiers doublon et résidus d'audits précédents encombrent le dépôt. Quelques risques moyens à corriger avant mise en production publique.

---

## 2. Points forts

- **Architecture backend propre**: `Controller → Service (container DI singleton) → Repository → Sequelize`, DTO par module, contrôleurs légers et homogènes (cf. `@c:\Users\sabab\EventCulture\backend\controllers\evenementController.js:1-80`, `@c:\Users\sabab\EventCulture\backend\services\serviceContainer.js:1-100`).
- **Sécurité multi-couches**:
  - Helmet + CSP restrictive (`defaultSrc 'none'`, `frameAncestors 'none'`, HSTS preload) — `@c:\Users\sabab\EventCulture\backend\app.js:116-133`.
  - CORS whitelist strict en prod avec gestion des méthodes safe (`@c:\Users\sabab\EventCulture\backend\middlewares\corsMiddleware.js:91-125`).
  - CSRF double-submit avec `crypto.timingSafeEqual` (`@c:\Users\sabab\EventCulture\backend\middlewares\csrfMiddleware.js:67-96`).
  - JWT HS256 + validation stricte du secret en prod + blacklist Redis + invalidation par `password_changed_at` (`@c:\Users\sabab\EventCulture\backend\middlewares\authMiddleware.js:25-44`, `:285-295`).
  - Cookies `httpOnly`/`secure`/`sameSite`, préférés au header Authorization.
  - Account lockout anti brute-force distribué via Redis (`@c:\Users\sabab\EventCulture\backend\middlewares\rateLimitMiddleware.js:270-371`).
  - Validation des uploads par magic bytes (`FileValidator.uploadValidator`) + quarantaine/suppression des invalides (`@c:\Users\sabab\EventCulture\backend\routes\uploadRoutes.js:166-235`).
  - Fail-closed auth middleware si DB/modèles non chargés (`@c:\Users\sabab\EventCulture\backend\app.js:344-409`).
- **Performance**: compression conditionnelle, cache Redis user-session (TTL 15 min), invalidations explicites, request timeout par route (`30s` général, `120s` dashboard), trust proxy correctement posé, chunking Vite par vendor (`@c:\Users\sabab\EventCulture\frontEnd\vite.config.ts:112-167`), React Query comme cache unique côté client.
- **Internationalisation**: 5 langues, RTL Tamazight + Arabe, middleware `languageMiddleware` backend + `LanguagePersistenceManager` frontend, DTO capables de traduire à partir d'un `_raw` quand la donnée vient du cache.
- **UX front**: lazy-loading par page, `ErrorBoundary` ciblés, `OfflineBanner`, redirects SEO case-insensitive, rate-limit côté client adaptatif (backoff, modes agressif/normal/conservateur) dans `@c:\Users\sabab\EventCulture\frontEnd\src\services\httpClient.ts:131-170`.
- **DevOps prod**: compose prod complet avec resources limits, healthchecks partout, MySQL/Redis non exposés au host, backup cron quotidien, certbot auto-renew, utilisateur non-root dans l'image backend, multi-stage Dockerfiles.

---

## 3. Risques et problèmes identifiés

### 3.1 Critique

Aucun risque critique bloquant détecté dans le code relu.

### 3.2 Majeur (à corriger avant prod)

- **Fichier résiduel à la racine exposant une requête ciblée**: `@c:\Users\sabab\EventCulture\check_salah.js:1-10` exécute une requête SQL ad hoc directement sur la DB. Aucun contrôle d'accès, pas d'intérêt applicatif — à **supprimer**.
- **`.env` commité dans le repo**: la racine contient `.env` (2749 bytes) ET `backend/.env` (2749 bytes). Même s'ils ne sont pas exposés, la présence dans le workspace indique qu'ils ont potentiellement été suivis par git à un moment. Vérifier avec `git log --all -- .env backend/.env`, puis au besoin: rotation de tous les secrets + `git filter-repo` + purger l'historique. Le `.gitignore` doit couvrir `*.env`, `.env.*` (sauf `.env.example`).
- **Incohérence `BCRYPT_ROUNDS`**: `@c:\Users\sabab\EventCulture\docker-compose.prod.yml:76` fixe `BCRYPT_ROUNDS=12` en dur, ignorant `.env`. C'est acceptable mais si vous montez à 14 pour la prod, cela ne sera pas pris en compte → utiliser `${BCRYPT_ROUNDS:-12}`.
- **`backend/.env.example`** contient encore `DB_USER=root` / `DB_PASSWORD=root` comme exemple (`@c:\Users\sabab\EventCulture\backend\.env.example:29-30`). Le fichier racine `.env.example` est plus rigoureux; harmoniser les deux pour éviter qu'un dev ne copie le mauvais.
- **`app.js` très monolithique (812 lignes)**: classe `App` mélange init DB, routes, middlewares, tâches planifiées, rate-limiters, health. Acceptable mais difficile à tester unitairement. Extraire au minimum: `initializeRateLimiters`, `startScheduledTasks`, `initializeUploadStructure` dans `backend/bootstrap/`.
- **Documentation API dynamique exposée**: `GET /api/` et `GET /api/endpoints` listent **tous** les endpoints publiquement (`@c:\Users\sabab\EventCulture\backend\routes\index.js:268-349`). Utile en dev, **fuite d'information** en prod. Protéger par `authMiddleware.isAdmin` ou gate via `NODE_ENV !== 'production'`.
- **Scripts d'archives volumineux sous `backend/scripts/archives/`** (seeds, data insertion) encore livrés dans l'image (le `Dockerfile` supprime `scripts/archives` mais uniquement à la racine de `/app` ; les fichiers seeds `create-test-*`, `seed*` peuvent contenir des identifiants ou données test dans l'historique). Les déplacer hors du package docker de toute façon.
- **Route fallback CSRF ouverte sur `/api/tracking/*/view`** (`@c:\Users\sabab\EventCulture\backend\app.js:594-599`). OK fonctionnellement (compteurs de vues), mais cela permet une amplification depuis origine tierce si la route est `POST`. Vérifier qu'elle est idempotente côté serveur et fortement rate-limitée (déjà `viewLimiter` à 30 / 5 min / IP+id, OK, mais envisager `GET` si purement lecture/analytics).
- **Double sanitizer concurrent**: `securityMiddleware.sanitizeInput` (`@c:\Users\sabab\EventCulture\backend\middlewares\securityMiddleware.js:58-92`) mute `req.body/query/params` via regex « strip HTML ». Problèmes:
  - Le pattern `/<[\/\!]*?[^<>]*?>/gi` est un stripper naïf qui casse des champs légitimes contenant `<`, `>` (code, math, fichiers CSV importés).
  - Il réécrit `req.query` avec `querystring` non-cloneur; certaines versions d'Express 5 rendent `req.query` getter-only → à surveiller.
  - Les champs `contenu` pour article-blocks sont exclus; mais d'autres champs rich-text potentiels (ex: `description` d'oeuvres) sont strippés agressivement.
  - **Recommandation**: remplacer par `sanitize-html` (déjà en dépendance) avec whitelist par champ, appliqué côté service, pas en middleware global.
- **Exposition `Vary: Accept-Encoding, Accept-Language`** (`@c:\Users\sabab\EventCulture\backend\app.js:181`): manque `Origin` alors que CORS varie selon l'origine → ajouter `Origin` au `Vary` sur `/api`.
- **Headers `standardHeaders: false`** désactivés sur `globalLimiter` (`@c:\Users\sabab\EventCulture\backend\middlewares\rateLimitMiddleware.js:61`) → le frontend ne peut pas lire `x-ratelimit-remaining` pour son auto-throttling (le code dans `httpClient.ts:262-277` en dépend). Activer `standardHeaders: true` au minimum sur les limiteurs généraux et globaux côté API utilisateur.
- **`trust proxy = 1`** (`@c:\Users\sabab\EventCulture\backend\app.js:105`) est correct derrière un seul nginx, mais en prod actuelle il y a **nginx conteneur + potentiellement Cloudflare/OVH LB** → risque de spoof `X-Forwarded-For`. Si vous ajoutez un LB externe, passer à une liste explicite (`app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal'])`).

### 3.3 Mineur

- **`console.log` en masse backend (713 occurrences, ~62 fichiers)** dont 41 dans `app.js` seul. Remplacer par `logger.info/debug/warn` pour conserver le routage Winston/Sentry et le niveau configurable.
- **Fichiers d'audit multiples à la racine** (`AUDIT_PRODUCTION_COMPLET.md`, `AUDIT_TECHNIQUE_PRODUCTION.md`, `backend/PERFORMANCE_AUDIT.md`, `frontEnd/AUDIT_FRONTEND.md`, `docs/AUDIT_*.md`). Consolider sous `docs/audits/` avec versioning daté, ou supprimer les obsolètes.
- **`backend/models/index-original.js` (55k, 42 `console.log`)** : backup du modèle avant refactor, à supprimer (git garde l'historique).
- **`bun.lockb` + `package-lock.json` coexistent côté frontend** → choisir un package manager unique. Docker utilise `npm ci`, donc `bun.lockb` peut prêter à confusion.
- **`backend/.env.test` + `backend/env.test`** (2 fichiers, 113 bytes chacun) : doublon.
- **`backend/extract_keys.js` (22k)** à la racine backend : script one-shot d'extraction i18n → déplacer sous `backend/scripts/`.
- **Route `auth.service.ts` / `admin.service.ts`** frontend (`@c:\Users\sabab\EventCulture\frontEnd\src\services\`) en **kebab-case.service.ts** — incohérent avec la mémoire de convention qui indique `camelCase` pour les utilitaires TS. Acceptable (convention « service » spécifique) mais à documenter.
- **`useAdmin.ts` (25 k) et `useDashboardAdmin.ts` (29 k)** : hooks géants, risque de re-render non ciblés et de sur-couplage. Découper par domaine (users, stats, moderation, analytics).
- **Pages XXL frontend**: `AjouterEvenement.tsx` (53k), `AjouterServicePro.tsx` (48k), `PatrimoineDetail.tsx` (51k), `DashboardPro.tsx` (40k). À refactorer en sous-composants + hooks dédiés.
- **`routes/index.js` 663 lignes** avec beaucoup de doc dynamique et heuristiques regex sur la layer Express — fragile entre versions d'Express. Isoler dans `routes/_docs.js`.
- **`app.js:138-144`**: 404 inline pour `.well-known/appspecific/com.chrome.devtools.json` et `favicon.ico` — OK mais à mettre dans un middleware nommé.
- **Fallback d'auth middleware très verbeux** dans `app.js:348-409`: 7 méthodes renvoient toutes la même erreur. Refactorer avec un proxy ou une factory.
- **Dépendances à surveiller**:
  - `multer ^1.4.5-lts.1` → v2 disponible avec corrections de sécurité; migration recommandée (mineures).
  - `helmet ^7.0.0` → v8 disponible.
  - `bcrypt ^6` : OK.
  - `express ^4.21` : envisager Express 5 (stable) une fois les middlewares compatibles.
  - `express-rate-limit ^6.11` → v7 (amélioration des stores).
- **`rollup-plugin-visualizer` + `terser` + `tsx`** côté frontend : nombreuses devDeps OK, mais `redis-server` en devDep de frontend (`@c:\Users\sabab\EventCulture\frontEnd\package.json:139`) paraît inutile.
- **`AUTH_CONFIG.tokenExpiryKey`** stocké en `localStorage` côté front pour UX: acceptable, mais ne pas y écrire de données sensibles.
- **Peu de tests intégration frontend** : seulement `src/tests/forms/` (21 items). Cypress couvre bien. Pas de tests Vitest sur les services (sauf `services/__tests__/`).
- **Pas de `npm audit` bloquant dans CI** (`@c:\Users\sabab\EventCulture\.gitlab-ci.yml:52`): `npm audit --audit-level=high || echo "Audit warnings"` masque les vulnérabilités. Passer en erreur bloquante ou utiliser Snyk/Trivy.
- **CI ne lance pas les tests effectivement** (`|| echo "Tests skipped"` ligne 51) — la pipeline n'échouera jamais si un test casse. **À corriger**.
- **Backup script**: le volume `backend_uploads` est monté **read-only** côté backup → OK, mais aucun offload distant (S3, Backblaze) → backup local uniquement = point de défaillance unique. Ajouter un push vers un stockage externe.
- **`handlebars ^4.7.8`** : l'ancienne API; vérifier les templates (`backend/templates/`) pour ne pas rendre des inputs user non-escapés.
- **`docker-compose.prod.yml` n'a pas de service frontend servi**: nginx principal (`nginx/prod.conf`) monte le volume `frontend_build` en lecture seule et le build vient du service `frontend` qui copie au démarrage. L'ordre de démarrage repose sur `depends_on: service_started` (pas `service_healthy`) → fenêtre de temps où nginx peut servir un volume vide. Utiliser `service_healthy` pour `frontend` et `backend`.
- **Ressources limits serrées**: backend 512M, MySQL 512M, Redis 192M. Acceptable pour un démarrage, mais à surveiller via Sentry/monitoring sous charge.

### 3.4 Conformité / RGPD

- `docs/AUDIT_RGPD_SECURITE_2026.md` et `docs/REGISTRE_TRAITEMENTS.md` existent : bon point. Vérifier:
  - Présence d'une route d'export et de suppression RGPD côté `userController`.
  - Retention `AUDIT_LOG_RETENTION_DAYS=90` configurée (OK).
  - Cookies: bannière d'info absente du bundle vu; vérifier conformité CNIL si utilisateurs EU (optionnel si actionculture.dz cible DZ uniquement).
- **`audit-logs` cleanup cron à 3h** : OK ; mais pas de cap de volume maximum.
- **Données sensibles en logs**: `app.js:252-255` log `method/path/ip` en dev, bien. Confirmer qu'aucun log ne persiste `req.body` pour `/login`, `/register`, `/reset-password`.

---

## 4. Recommandations priorisées

### Sprint 1 (sécurité / dette critique, 1–3 j)
1. **Supprimer** `@c:\Users\sabab\EventCulture\check_salah.js` et confirmer qu'il n'est pas référencé.
2. **Auditer l'historique git pour `.env`** et faire une rotation complète des secrets si exposition avérée.
3. **Rendre CI bloquante** (`npm test`, `npm run lint`, `npm audit`). Retirer les `|| echo ...`.
4. **Protéger `/api/` et `/api/endpoints`** par `isAdmin` ou les désactiver en prod.
5. **Retirer `securityMiddleware.sanitizeInput` global** → migrer vers `sanitize-html` par champ dans les services (notamment `article-blocks`, `oeuvres`, `commentaires`).
6. **Activer `standardHeaders: true`** sur les rate-limiters principaux pour que le client lise les quotas.
7. **Ajouter `service_healthy`** pour `backend` et `frontend` dans `docker-compose.prod.yml`.
8. **Externaliser les backups** (rclone + S3/B2) dans le conteneur `backup`.

### Sprint 2 (qualité code, 3–5 j)
9. **Casser `app.js`** en `bootstrap/{middlewares,database,routes,cron,rateLimit}.js`.
10. **Remplacer tous les `console.*` backend** par `logger.*` (automatisable via codemod / ESLint rule `no-console`).
11. **Fusionner les rapports d'audit** sous `docs/audits/` et supprimer `backend/models/index-original.js`, `backend/env.test`, `backend/extract_keys.js` (ou déplacer).
12. **Découper les pages front > 25k lignes** en containers + composants + hooks.
13. **Unifier le package manager frontend** (retirer `bun.lockb` si npm est la ref).
14. **Mettre à jour deps** : `multer@2`, `helmet@8`, `express-rate-limit@7`.

### Sprint 3 (observabilité, scalabilité, 5–7 j)
15. **Activer Sentry** en prod (DSN manquant sinon warning) — incluant le frontend.
16. **Metrics Prometheus** : exposer `/metrics` Prom-compliant (actuellement JSON custom, `@c:\Users\sabab\EventCulture\backend\app.js:604-621`).
17. **Tests** : relever la couverture à ≥70 % (backend ~30 fichiers test OK) ; ajouter tests intégration des routes principales avec supertest + DB sqlite ou conteneur éphémère.
18. **Cypress e2e dans la CI** sur staging après déploiement.
19. **Cache HTTP sur routes GET publiques** (`/api/oeuvres`, `/api/evenements` list) via `cacheMiddleware` + ETag, aujourd'hui seul `Vary` est posé.
20. **Audit SQL**: profiler les requêtes lentes via `DB_SLOW_QUERY_MS` (déjà exposé) et vérifier les indexes dans `migrations/20250119-add-performance-indexes.js`.

---

## 5. Checklist go-live

- [ ] `.env` de prod généré, `JWT_SECRET` ≥ 64 chars (script dispo: `node scripts/generateSecret.js`).
- [ ] `FRONTEND_URL`, `API_URL` en HTTPS, certs Letsencrypt via `certbot` actif.
- [ ] `SENTRY_DSN` défini (sinon warning au démarrage).
- [ ] `REDIS_PASSWORD` défini (compose exige `REDIS_PASSWORD:?`).
- [ ] `CLOUDINARY_*` renseignés (sinon uploads images cassés).
- [ ] `EMAIL_PAUSED=false` après configuration SMTP réelle.
- [ ] DB migrations jouées : `npm run db:migrate` (Sequelize CLI configuré via `.sequelizerc`).
- [ ] DB_SYNC=false en prod (OK par défaut).
- [ ] CI verte et bloquante (tests + lint + audit).
- [ ] Backup vérifié (`./scripts/backup.sh` run manuel + restore test depuis `./restore.sh`).
- [ ] Monitoring alarmes: Sentry, healthchecks nginx/mysql/redis OK.

---

## 6. Annexes

### Fichiers / répertoires à nettoyer
- `@c:\Users\sabab\EventCulture\check_salah.js` — supprimer.
- `@c:\Users\sabab\EventCulture\backend\models\index-original.js` — supprimer.
- `@c:\Users\sabab\EventCulture\backend\env.test` — doublon de `.env.test`.
- `@c:\Users\sabab\EventCulture\backend\extract_keys.js` — déplacer sous `scripts/`.
- `@c:\Users\sabab\EventCulture\backend\test-api.js` — déplacer sous `scripts/`.
- `@c:\Users\sabab\EventCulture\AUDIT_PRODUCTION_COMPLET.md`, `@c:\Users\sabab\EventCulture\AUDIT_TECHNIQUE_PRODUCTION.md` — consolider sous `docs/audits/`.
- `@c:\Users\sabab\EventCulture\frontEnd\AUDIT_FRONTEND.md` — idem.
- `@c:\Users\sabab\EventCulture\backend\PERFORMANCE_AUDIT.md` — idem.
- `@c:\Users\sabab\EventCulture\frontEnd\bun.lockb` — supprimer si npm est le manager officiel.

### Points de code exemplaires (référence pour d'autres modules)
- Pattern Service/Repository: `@c:\Users\sabab\EventCulture\backend\services\serviceContainer.js`.
- Auth JWT+Redis cache+blacklist: `@c:\Users\sabab\EventCulture\backend\middlewares\authMiddleware.js`.
- CSRF double-submit: `@c:\Users\sabab\EventCulture\backend\middlewares\csrfMiddleware.js`.
- HTTP client adaptatif: `@c:\Users\sabab\EventCulture\frontEnd\src\services\httpClient.ts`.
- Chunking Vite: `@c:\Users\sabab\EventCulture\frontEnd\vite.config.ts:112-167`.

---

**Synthèse**: code **en bonne santé globale**, stack moderne, bonnes pratiques sécurité majoritairement appliquées. Les priorités avant ouverture publique sont : (1) supprimer les scripts/fichiers résiduels à risque, (2) durcir la CI (tests bloquants, audit deps), (3) restreindre la doc API dynamique en prod, (4) remplacer le sanitizer global naïf par `sanitize-html` ciblé, (5) externaliser les backups. Le reste relève de la dette technique normale et peut s'étaler sur 2–3 sprints.
