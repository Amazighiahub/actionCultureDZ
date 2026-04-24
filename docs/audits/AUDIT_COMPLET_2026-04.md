# Audit complet EventCulture / Action Culture DZ — avril 2026 (itération 2)

**Date**: avril 2026
**Périmètre**: monorepo complet (backend Node/Express + frontend React/Vite + Docker/CI/Nginx)
**Méthode**: relecture ciblée des points critiques, sous-auditeurs parallèles (sécurité, architecture, frontend, devops), comparaison avec l'audit précédent (`AUDIT_COMPLET_2026.md`).
**Statut rapport précédent**: plusieurs points sont déjà adressés (cf. §2 _Progrès_), le périmètre restant est détaillé plus bas.

---

## 1. Vue d'ensemble (mise à jour)

| Élément | Valeur |
|---|---|
| Backend | Node ≥18.17, Express 4.21, Sequelize 6.37 (MySQL 8), Redis 7, Bull, Socket.IO |
| Frontend | React 18, Vite 7, TS 5.5 (strict), TanStack Query, Radix/shadcn, i18next, Leaflet |
| Observabilité | Winston (JSON + rotation), Sentry conditionnel, Morgan, request-id |
| Infra | Docker Compose (dev + prod), nginx, MySQL, Redis, certbot, backup, GitLab CI + GitHub Actions |
| Tests | Backend: Jest + Supertest (seuils 50 % branches / 60 % lignes). Frontend: Vitest + Cypress (suite e2e riche) |
| Langues | fr, ar, en, tz-ltn, tz-tfng (RTL OK) |

**Verdict global**: projet **en bonne santé**, avec des fondations sécurité et architecture solides. Des régressions opérationnelles latentes (crons/queue non branchés, nginx avec deux blocs 443 qui se masquent, CI toujours non bloquante sur certaines étapes critiques) et des god-modules (controller user, hooks admin, pages "Ajouter*") constituent le gros de la dette technique restante avant une mise en production publique.

---

## 2. Progrès depuis l'audit précédent

| Point précédent | État actuel |
|---|---|
| `securityMiddleware.sanitizeInput` naïf | **Amélioré**: liste `NEVER_SANITIZE` pour secrets/tokens/mot-de-passe + décodage d'entités + regex multi-ligne (`securityMiddleware.js:1-200`). **Limite**: repose toujours sur un stripper regex (voir §4.2). |
| Rate limiter `refresh-token` | **Ajouté**: `endpointLimiters.refreshToken` (30/15 min en prod) branché sur `/api/users/refresh-token` (`rateLimitMiddleware.js:260-268`, `userRoutes.js:55-57`). |
| Refresh token front concurrents | **Corrigé**: verrou `refreshInFlight` dans `AuthService.refreshToken` (`auth.service.ts:52-149`). Mais `httpClient.ts` a toujours son propre chemin (§5.1). |
| Audit de suspension utilisateur | **Ajouté**: colonnes `suspension_motif / _jusqu_au / suspendu_par / suspendu_le` + migration `20260321-add-user-suspension-audit.js` + repo `suspend/reactivate`. |
| `accountRateLimiter.recordFailedAttempt` | **Corrigé**: await + try/catch pour ne pas masquer l'erreur d'origine (`userController.js:86-96`). |
| `oeuvreService.findWithFullDetails` | **Corrigé**: option `incrementViews` pour éviter de compter les vues lors d'une création/édition (`oeuvreService.js:70-94`). |
| `oeuvreService.createOeuvre` / doublons | **Corrigé**: `JSON_UNQUOTE(JSON_EXTRACT(...))` pour comparer les titres en MySQL (`oeuvreService.js:185-230`). |
| `oeuvreService.deleteOeuvre` | **Corrigé**: enveloppé dans `withTransaction`, nettoyage atomique des `ArticleBlock` (`oeuvreService.js:385-413`). |
| Login / rôles admin | **Corrigé**: `findByEmail` avec `includeRoles` pour décider `isAdmin` fiablement (`userRepository.js:13-40`, `userService.js:107-130`). |

Restent ouverts les points décrits ci-dessous.

---

## 3. Gravité des findings

Classement: **[BLOQUANT]** = à régler avant prod publique / **[MAJEUR]** = à planifier sprint courant / **[MINEUR]** = dette technique / **[OK]** = bon point explicitement.

---

## 4. Sécurité

### 4.1 [BLOQUANT opérationnel]

1. **Nginx prod — deux blocs `server` 443 se chevauchent**
   - `nginx/prod.conf` ~L63-140 (bloc "principal") et ~L145-245 (bloc "API dédié") écoutent tous deux en 443 avec `server_name` qui inclut `taladz.com`. Nginx prend le **premier** matchant. Le bloc principal n'a **pas** de `client_max_body_size` explicite → défaut ~1 Mo → **uploads cassés** (images/vidéos). Le bloc dédié (100 Mo, rate limits) est en pratique **inatteignable**.
   - **Correctif**: fusionner en un seul `server` par `server_name`, ou séparer par noms d'hôtes distincts (`api.taladz.com` vs `taladz.com`) sans chevauchement. Reporter `client_max_body_size`, timeouts et `limit_req` sur le `location /api` réellement servi.

### 4.2 [MAJEUR]

1. **JWT: blacklist ignorée si Redis indisponible** — `authMiddleware.js:258-272, 348-377`
   - `authenticate()` attrape l'erreur Redis et **continue** sans vérifier la blacklist → après logout, un access token reste valide jusqu'à expiration. `optionalAuth` **ne consulte jamais** la blacklist.
   - **Correctif**: fail-closed sur erreur Redis (ou fallback in-memory LRU des jti révoqués). Aligner `optionalAuth` sur `authenticate` pour la révocation.

2. **JWT sans `iss`/`aud`/`jti`** — `authMiddleware.js:69-76, 743-753`, `userService.js:~30`
   - `jwt.sign/verify` n'utilisent que `HS256` + `expiresIn`. Pas de revocation par `jti`, pas de liaison au tenant/environnement.
   - **Correctif**: ajouter `issuer`, `audience`, `jti` (UUID v4), denylist sur `jti` plutôt que sur le token complet (réduit la taille Redis).

3. **`globalLimiter` + `login`/`register`/`forgotPassword`: `standardHeaders: false`** — `rateLimitMiddleware.js:51-65, 226-234`
   - Le frontend (`httpClient.ts:262-277`) lit `X-RateLimit-Remaining` pour son auto-throttling. Ces limiters n'émettent aucun header → backoff côté client aveugle.
   - **Correctif**: `standardHeaders: true` (RFC) au minimum sur `globalLimiter` et `endpointLimiters.register/forgotPassword`. Vérifier que le client sait lire `RateLimit-Remaining` (sinon activer aussi `legacyHeaders: true`).

4. **Documentation API dynamique exposée publiquement** — `routes/index.js:267-349`, `app.js:564-589`
   - `GET /api/` et `GET /api/endpoints?format=detailed` énumèrent **tous** les endpoints, y compris admin, avec métadonnées auth. Cartographie gratuite pour un attaquant.
   - **Correctif**: protéger par `authMiddleware.isAdmin` ou désactiver totalement en prod (`if (process.env.NODE_ENV === 'production') return next()`).

5. **Upload: `err.message` renvoyé au client** — `routes/uploadRoutes.js:53-61`
   - En cas d'erreur Multer/Cloudinary, la réponse JSON contient le message brut (paths internes, clé Cloudinary, détails driver…).
   - **Correctif**: message générique côté client (`code: 'UPLOAD_FAILED'`) + log serveur complet.

6. **`fileValidator` contourné sur chemin URL** — `utils/fileValidator.js:177-189`
   - Si `file.path` est une URL http(s), seul le `mimetype` Multer (en-tête falsifiable) est vérifié, **pas les magic bytes**.
   - **Correctif**: refuser les URLs dans les routes sensibles ou télécharger + valider localement avant acceptation.

7. **CORS dev très permissif** — `corsMiddleware.js:106-111`
   - Les requêtes sans `Origin` reçoivent `origin: true` (réflexion). OK en dev, mais si `NODE_ENV` est mal configuré en prod, bascule catastrophique.
   - **Correctif**: whitelist explicite même en dev ou guard renforcé `process.env.NODE_ENV !== 'production'` avec log warn au boot.

8. **`check_salah.js` à la racine** — requête SQL brute sur `user`. Résidu d'un debug → **à supprimer du repo** (également mentionné dans l'audit précédent, toujours présent).

### 4.3 [MINEUR]

- **Incohérence `JWT_EXPIRES_IN` vs `JWT_EXPIRATION`**: `.env.example` L48-49 utilise `JWT_EXPIRES_IN=24h`, le code utilise `JWT_EXPIRATION` (`userService.js:30`) → valeur ignorée. Harmoniser.
- **Commentaire faux**: `authMiddleware.js:~875` dit "défaut 15min" mais le défaut est `'1h'`.
- **`dynamicLimiter.admin`**: teste `req.user?.role === 'admin'`, alors que le projet utilise `req.user.isAdmin` / `roleNames` → la branche admin est morte.
- **Cookie CSRF non-httpOnly** (voulu pour double-submit, `csrfMiddleware.js:47-54`): en cas de XSS same-origin, couple token+cookie volable. Défense: CSP stricte + pas d'innerHTML.
- **`/api/health` fuite stacktrace**: `routes/index.js:238-264` renvoie `error.message` DB — passer en message générique en prod.
- **Exemption CSRF sur `/api/tracking/**/view`** (`app.js:594-599`): acceptable car `viewLimiter` 30/5min, mais à revoir périodiquement.
- **`extract_keys.js` à la racine backend**: outil i18n legit mais nom trompeur, à renommer / déplacer sous `scripts/`.

### 4.4 [OK]

- Cookies `httpOnly`/`secure` prod/`sameSite=lax`, refresh token sur path restreint (`userController.js:872-924`).
- Refresh opaque hashé SHA-256 en DB, rotation (usage unique) (`userService.js:172-196`).
- CSRF timingSafeEqual (`csrfMiddleware.js:85-92`), CORS whitelist stricte en prod + `credentials: true`.
- `fileValidator` magic bytes + taille + suppression des fichiers rejetés.
- `multiLangSearchBuilder.sanitizeField/sanitizeLang/sequelize.escape` pour recherche dynamique.
- Pas de log de `req.body` sur login/register/reset-password (logs ne contiennent que des IDs).
- Account lockout Redis distribué + fallback mémoire (`rateLimitMiddleware.js:284-392`).
- `.env` **non présent** dans l'arborescence versionnée à la racine (seulement `.env.example` et `.env.test`).

---

## 5. Architecture backend

### 5.1 [BLOQUANT opérationnel]

1. **`cronService` jamais initialisé** — `services/cronService.js`
   - Le service contient 8+ jobs (rappels d'événements, nettoyages, stats…) mais **aucun `require('cronService').initialize(...)`** au boot (`server.js`/`app.js`). Résultat: les rappels **ne partent pas**.
   - **Correctif**: brancher dans `App.startScheduledTasks()` derrière un feature flag + log de démarrage.

2. **`uploadCronJob` jamais démarré** — idem, singleton module sans `.start()`.

3. **`emailQueueService` jamais initialisé + signature `sendEmail` cassée**
   - `emailQueueService.js:80-88` appelle `emailService.sendEmail(to, subject, text, html, attachments)` mais la signature réelle est `(to, subject, html, attachments)` (`emailService.js:115`) → corps de mail ou pièces jointes incorrects dès que la queue est utilisée. Aucun `.initialize()` trouvé dans le codebase.
   - **Correctif**: aligner la signature, initialiser le worker Bull au boot avec shutdown gracieux, ajouter DLQ + monitoring.

### 5.2 [MAJEUR]

1. **`app.js: DB_SYNC === 'true'` branché en parallèle des migrations** (`app.js:322-326`)
   - Double source de vérité schéma. En prod, `sync({ alter: false })` reste exécutable et peut créer des tables non migrées.
   - **Correctif**: prod → migrations uniquement, ignorer `DB_SYNC` en NODE_ENV=production.

2. **`userController.js` monolithique (938 lignes)** mélange auth, CRUD, recherche, RGPD, cookies, blacklist JWT, rate limit, traduction.
   - **Correctif**: scinder en `AuthController`, `UserProfileController`, `UserAdminController`, `GdprController`; extraire `AuthCookieService` / `TokenRevocationService`.

3. **`notificationService` (37KB)** + **`emailService` (30KB)** + **`lieuService` (30KB)** sont des "god services":
   - `notificationService` couvre SMS, WhatsApp, emails, persistance notifications, préférences, broadcast, newsletter, rappels.
   - `emailService` fait Nodemailer + tous les use cases métier + templates.
   - `lieuService` fait CRUD + géo + stats + traduction + services liés au lieu.
   - **Correctif**: découper par responsabilité (Delivery vs Inbox vs Admin, Mailer vs TemplateRenderer, LieuGeo vs LieuTranslation vs LieuAmenity). Introduire un **bus d'événements** pour les notifs.

4. **`routes/index.js:44-81` — doc auto par regex layer**
   - Reconstruction du path depuis `layer.regexp.source`. Fragile, se cassera entre versions Express/path-to-regexp.
   - **Correctif**: utiliser `express-list-endpoints` (déjà dépendance) ou maintenir une spec OpenAPI.

5. **Double système cron** (`app.js:687-724` inline + `cronService.js` dédié non branché). Aucun `cronLock` sur les crons inline → en cluster multi-instance, exécutions multiples.
   - **Correctif**: unifier autour de `cronService` + `cronLock.js`, fail-closed quand le lock échoue (`cronLock.js:42-44, 64-70` retourne `true` en dégradé → risque **doublons** réels).

6. **Transactions manquantes sur mutations multi-tables critiques**:
   - `userService.js:147-153 login`: `updateLastLogin` puis `_saveRefreshToken` **hors** transaction.
   - **Correctif**: `withTransaction`.

7. **`utils/viewCounter.js`**:
   - `KEYS views:*` bloquant sur gros Redis (`viewCounter.js:98-105`) → remplacer par `SCAN`.
   - Fallback mémoire par process: en cluster PM2, compteurs non partagés + perte au crash.
   - `server.js:105-130` shutdown **n'appelle pas** `viewCounter.shutdown()` (contrairement à `app.js`).

8. **`serviceContainer.js` hybride**: `UserService` en `require` au toplevel (L15-16), les autres lazy dans les getters. Incohérent → risques de cycles résiduels au moindre refactor.

9. **`translateDeep` / DTO i18n — heuristique fragile** (`helpers/i18n.js:84-93`): détecte un "objet multilang" par présence d'une clé de langue → faux positifs sur objets métier ayant une clé `fr` ou `en`.
   - **Correctif**: allowlist par champ/entité.

### 5.3 [MINEUR]

- `app.js:349-408` — fallback auth middleware duplique 7× le même handler 503. Factoriser via `createUnavailableAuthMiddleware()`.
- `app.js:43` + `:344-345`: `createAuthMiddleware` importé deux fois. Garder un seul require.
- `baseRepository.update()` fait 2 allers DB sans option `transaction` propagée; `delete` corrigé récemment (propagation options OK).
- `serviceContainer.listServices()` (L519-534) ne liste qu'un sous-ensemble → corriger pour refléter le vrai registre.
- Blacklist JWT par token complet dans Redis (`userController`): clés longues, remplacer par `jti`.

### 5.4 [OK]

- Structure DI + lifecycle singleton lazy pour la majorité des services.
- Pattern `BaseController/Service/Repository` homogène, erreurs normalisées via `AppError.fromError`.
- `UserDTO.fromEntity` exclut explicitement le mot de passe.
- `withTransaction` proprement utilisé dans `oeuvreService.createOeuvre/deleteOeuvre` et `lieuService.createLieu`.
- Migrations Sequelize structurées (perf indexes, suspension audit, etc.).
- `app.js.gracefulShutdown` flush `viewCounter` et ferme la DB proprement.

---

## 6. Frontend

### 6.1 [MAJEUR]

1. **Double implémentation du refresh token**
   - `httpClient.ts:~481-504` (intercepteur 401) appelle `HttpClient.refreshToken()` (axios direct), **pas** `authService.refreshToken()` qui porte le verrou `refreshInFlight` + `setAuthData`. Résultat: appels concurrents possibles → `INVALID_REFRESH_TOKEN` 1/N, ou `user`/`tokenExpiry` désynchronisés.
   - **Correctif**: faire pointer l'intercepteur vers `authService.refreshToken()` (ou extraire une fonction unique partagée).

2. **Sync multi-onglets cassée** — `providers/PermissionsProvider.tsx:78-88`
   - Écoute `storage` event sur `e.key === 'auth_token'`, alors que depuis la migration cookies httpOnly, cette clé n'est plus écrite → logout dans un onglet **ne propage pas** aux autres.
   - **Correctif**: écouter une clé dédiée (ex. `session-version` bumpée à chaque login/logout) ou `BroadcastChannel('auth')`.

3. **Pas de handler pour HTTP 419 / session expirée CSRF** dans `httpClient.ts`.
   - Si le backend renvoie 419 (CSRF rotation), pas de rafraîchissement du token CSRF ni de retry.
   - **Correctif**: brancher un handler qui re-fetch `/api/csrf` ou re-lit le cookie `XSRF-TOKEN` avant retry.

4. **`ArticlePreview.tsx:47-51` — iframe vidéo sans allowlist**
   - Le bloc `video` fait `<iframe src={block.contenu} />` sans filtrer le domaine (contrairement au bloc `embed` qui filtre + DOMPurify). Si `contenu` est éditable par un utilisateur, risque XSS / open-redirect.
   - **Correctif**: reprendre la whitelist du bloc `embed` (youtube/vimeo/…) ou n'accepter qu'un ID vidéo + driver connu.

5. **God-hooks / pages XXL**
   - `hooks/useAdmin.ts` ~739 lignes, `useDashboardAdmin.ts` ~949 lignes — regroupent filtres/queries/mutations/toasts → re-renders larges, tests lourds.
   - Pages: `AjouterEvenement.tsx` (~1169 lignes), `AjouterServicePro.tsx` (~1091), `PatrimoineDetail.tsx` (~1041), `DashboardPro.tsx` (~914).
   - **Correctif**: découper par domaine (ex. `useAdminUsers`, `useAdminOeuvres`), extraire sections (wizard, dialogs, carte) en sous-composants, hooks locaux.

6. **TanStack Query: pas de factory de clés centralisée** — clés en chaînes éparses. Risque d'invalidations trop larges ou trop étroites.
   - **Correctif**: `src/queries/queryKeys.ts` hiérarchique (`queryKeys.admin.users.list(filters)`).

7. **`useDashboardAdmin.ts:59-120` — fetch manuel (`useState`+`useEffect`) hors QueryClient**. Pas d'intégration au cache global.

### 6.2 [MINEUR]

- `package.json:139` — **`redis-server` en devDependency** non référencée. Supprimer.
- `i18n/config.ts:38-39` — `console.log` sur langue non reconnue; passer derrière `import.meta.env.DEV`.
- `vite.config.ts:50-59` — logs proxy verbeux en dev.
- `ui/dialog.tsx:45-47` — `sr-only "Close"` non traduit.
- `index.html:3` — `lang="fr"` statique (acceptable avec `RTLManager`, peut être pré-calculé).
- Mélange conventions fichiers (`kebab-case.service.ts`, `PascalCase.tsx`, `useCamelCase.ts`) — documenter.
- `ErrorBoundary` seulement sur certaines routes — harmoniser.
- `isAuthenticated()` peut retourner `true` pendant la fenêtre entre expiry et refresh réel — envisager un flag `sessionLoading`.

### 6.3 [OK]

- Cookies httpOnly, `withCredentials: true`, pas de token en JS (`auth.service.ts:49-50, 274`).
- QueryClient `staleTime: 5min`, `gcTime: 10min`, `refetchOnWindowFocus: false` cohérent.
- Backoff + retry + queue sur 429 (`httpClient.ts:292-334`).
- i18n 5 langues avec FR bundle initial + lazy sur les autres.
- Chunking Vite par domaine (react/ui/data/i18n/maps/charts).
- DOMPurify + whitelist domaines sur bloc `embed`.
- TS `strict` + options strictes dans les deux `tsconfig`.
- Cypress e2e couvre auth, sécurité, perf, i18n, CRUD.
- Liens externes avec `rel="noopener noreferrer"`.

---

## 7. DevOps / CI / Infra

### 7.1 [BLOQUANT]

1. **Nginx double bloc 443** — cf. §4.1.

2. **`.github/workflows/deploy.yml`** L20-26, L31-47
   - `npm audit || true` → **audit non bloquant**.
   - Le job `deploy` ne dépend que de ce job "security"; **pas** de job `test` / `build` en `needs`. Un push `main` peut déployer sans barrière de qualité.
   - **Correctif**: retirer `|| true`, ajouter jobs `test` + `build` en `needs: [security, test, build]`.

3. **`.gitlab-ci.yml` L48-52** — lint / tests / npm audit **neutralisés** par `|| echo "... skipped"`. Pipeline verte même en échec total.
   - **Correctif**: supprimer les `|| echo`, `allow_failure: false` explicite, `set -e`.

### 7.2 [MAJEUR]

1. **`docker-compose.prod.yml:25-29, 81-85`** — `depends_on: service_started` au lieu de `service_healthy` pour les dépendances MySQL/Redis/backend. Fenêtre où nginx sert un volume frontend vide ou backend tape une DB pas prête.
   - **Correctif**: `condition: service_healthy` là où un healthcheck fiable existe.

2. **Healthcheck Redis sans auth** — `docker-compose.*.yml` utilise `redis-cli ping` alors que Redis est démarré avec `--requirepass`. → healthcheck rouge, healthcheck "failing" constant.
   - **Correctif**: `CMD-SHELL` avec `redis-cli -a "$REDIS_PASSWORD" ping`.

3. **Secrets uniquement via `.env` monté** (`docker-compose.prod.yml:47-48`). Pas de Docker secrets/vault/sops. Fichier unique sur le serveur = point de fuite.
   - **Correctif**: migrer vers Docker secrets ou sops en phase 2.

4. **`scripts/backup.sh:50-69`** — `mysqldump 2>/dev/null | gzip` masque les erreurs du dump. Le test `$?` reflète gzip, pas mysqldump (même avec `pipefail`, redirection stderr annule la visibilité).
   - **Correctif**: retirer `2>/dev/null`, logger stderr, vérifier la taille min du dump.
   - **Pas d'offload distant** (S3/B2), **pas de test de restore** automatisé (déjà mentionné).

5. **`.gitlab-ci.yml:103-125`** — déploiement staging sur `develop` **sans `when: manual`** (contrairement à prod) → tout push develop déploie auto.

6. **`.gitlab-ci.yml:13-16`** — stage `build` déclaré mais aucun job `stage: build`.

7. **`frontEnd/Dockerfile:37-50`** — nginx:alpine sans `USER` non-root → process `root` dans le conteneur.
   - **Correctif**: image nginxinc/nginx-unprivileged ou `USER nginx` + droits cache.

8. **Divergences `.env.example` racine vs `backend/.env.example`**: noms, defaults (`DB_USER=root/root`), variables manquantes d'un côté (SENTRY_DSN, feature flags). Risque d'oubli en prod.
   - **Correctif**: une seule source, ou backend renvoie vers la racine.

9. **CI incohérente entre GitLab et GitHub**: GitLab déploie vers `/home/EventCulture`, GitHub vers `/home/actionCultureDZ` + volume `actionculturedz_frontend_build`. Nom de projet et volumes divergent → surfaces d'erreur en déploiement.
   - **Correctif**: normaliser `COMPOSE_PROJECT_NAME`, chemins, volumes.

10. **`Makefile:77-86` vs `setup.sh`**: parcours non équivalents (setup.sh sans seeds, sans sync). Documenter lequel est canonique.

11. **`check_salah.js` à la racine** — encore présent, à supprimer.

12. **`backend/models/index-original.js`** — toujours référencé par `backend/models/index.js` et `backend/tests/setup.js:77`. Ce n'est donc pas un résidu inerte: refactor avant suppression.

### 7.3 [MINEUR]

- `.gitignore:92-93` — motif `**/test-*.js` peut exclure des scripts de test légitimes. Affiner.
- Fichiers d'audit multiples à la racine (`AUDIT_PRODUCTION_COMPLET.md`, `AUDIT_TECHNIQUE_PRODUCTION.md`, `frontEnd/AUDIT_FRONTEND.md`, `backend/PERFORMANCE_AUDIT.md`) — consolider dans `docs/audits/`.
- `docker-compose.prod.yml:104-122` — service `frontend` sans `deploy.resources`.
- `docker-compose.prod.yml:240-246` — service `certbot` sans `restart: unless-stopped`.
- `nginx/prod.conf:L116` — `proxy_set_header Origin https://taladz.com` en dur (rigide multi-domaine).
- `backend/extract_keys.js` (22 KB) à la racine backend — déplacer sous `scripts/`.
- `backend/env.test` doublon de `.env.test` — un seul fichier.
- `bun.lockb`: **non trouvé** dans l'arbre actuel (l'audit précédent s'en inquiétait); `npm ci` partout, cohérent.

### 7.4 Dépendances (fraîcheur)

| Paquet | Version actuelle | Dispo | Recommandation |
|---|---|---|---|
| `multer` | 1.4.5-lts.1 | 2.x | À planifier |
| `helmet` | 7.0.0 | 8.x | Vérifier breakings |
| `express-rate-limit` | 6.11.2 | 7.x | Améliorations stores |
| `express` | 4.21.0 | 5.x | Plus lourd — post-stabilisation |
| `jsonwebtoken` | 9.0.2 | 9.x | OK |
| `bcrypt` | 6.0.0 | 6.x | OK |

### 7.5 Tests & couverture

- Backend Jest: seuils `branches 50 % / lines 60 %` configurés (`jest.config.js`). Cible recommandée: 70 %. Ajouter des tests d'intégration pour les flux critiques (login/refresh, upload, oeuvre delete en transaction).
- Frontend Vitest: principalement `src/tests/forms/`. Étendre aux services (`auth`, `httpClient`) qui ont de la logique de verrouillage et d'intercepteurs.
- Cypress: riche, mais non exécuté en CI post-déploiement.

### 7.6 [OK]

- `docker-compose.dev` utilise `service_healthy`, mysql/redis bind `127.0.0.1`.
- `docker-compose.prod` n'expose pas MySQL/Redis à l'hôte.
- Backend Dockerfile multi-stage + USER non-root + HEALTHCHECK.
- `.dockerignore` exclut `node_modules`, `.env*`, tests, logs.
- Nginx prod: `server_tokens off`, HSTS, CSP, X-Frame-Options, Permissions-Policy, `limit_req`, gzip, cache assets, timeouts (à replacer sur le bon bloc, cf. §4.1).
- `.gitignore` couvre `.env`, `.env.*`, `node_modules`, `dist`, `coverage`, `logs`, uploads, `*.pem`.
- Winston JSON + rotation + fichiers séparés erreurs.
- Sentry conditionnel avec warning si DSN absent en prod.

---

## 8. Conformité / RGPD / Observabilité

- `docs/AUDIT_RGPD_SECURITE_2026.md` + `docs/REGISTRE_TRAITEMENTS.md` existent.
- Retention `AUDIT_LOG_RETENTION_DAYS=90` configurée.
- **À vérifier**: route d'export utilisateur + suppression RGPD côté `userController`. Banner cookies CNIL si utilisateurs EU (optionnel si cible DZ).
- **Metrics**: `/metrics` JSON admin-only (`app.js:604-621`), pas Prometheus natif. OK comme choix, mais empêche le scrape standard.
- **Log shipping**: pas de mention ELK/Loki — logs locaux dans le conteneur backend = perte possible au rollout.

---

## 9. Recommandations priorisées

### Sprint 1 — Bloquants / correctifs sécurité & ops (2–4 j)

1. **Nginx prod**: corriger le chevauchement des blocs 443 (fusion ou hostnames distincts).
2. **CI bloquante**: retirer `|| true` (.github/workflows/deploy.yml) et `|| echo` (.gitlab-ci.yml) sur lint/tests/audit; ajouter jobs `test` + `build` en `needs` du déploiement.
3. **Cron/Queue/UploadCron**: brancher `cronService.initialize`, `uploadCronJob.start`, `emailQueueService.initialize` au boot + corriger la signature `sendEmail` dans la queue.
4. **Rate-limit headers**: activer `standardHeaders: true` sur `globalLimiter`, `login`, `register`, `forgotPassword`.
5. **Doc API dynamique**: protéger `/api/`, `/api/endpoints` par `isAdmin` en prod.
6. **Upload error leak**: remplacer `err.message` par message générique dans `uploadRoutes.js:53-61`.
7. **Supprimer `check_salah.js`** et refactorer `models/index-original.js` → `models/index.js` (casser la dépendance avant suppression).
8. **Healthcheck Redis** avec `-a $REDIS_PASSWORD`.
9. **Frontend: unifier refresh token** entre `httpClient.ts` et `authService.refreshToken()`.

### Sprint 2 — Architecture & dette (3–5 j)

10. Scinder `userController.js` (938 L) en AuthController / UserProfileController / UserAdminController / GdprController.
11. Découper `notificationService` / `emailService` / `lieuService` (god services) par responsabilité + bus d'événements.
12. Ajouter `iss`/`aud`/`jti` aux JWT; denylist par `jti`.
13. Blacklist Redis fail-closed + alignement `optionalAuth`.
14. `viewCounter`: `SCAN` au lieu de `KEYS`, shutdown partagé `app.js`/`server.js`.
15. Frontend: `queryKeys.ts` centralisé; migrer `useDashboardAdmin` vers TanStack Query; sync multi-onglets via BroadcastChannel; handler 419.
16. Découper les pages > 40 KB en containers + sections + hooks.
17. Supprimer `redis-server` des devDependencies frontend.
18. Harmoniser `.env.example` racine vs backend.

### Sprint 3 — Observabilité / scalabilité (5–7 j)

19. Externaliser backups (rclone → S3/B2) + runbook de restore + test staging périodique.
20. Docker secrets ou sops pour les variables sensibles en prod.
21. Sentry frontend + Prometheus (`prom-client`) pour `/metrics` scrapable.
22. Couverture tests backend → 70 %; ajouter tests d'intégration login/refresh/upload/oeuvre delete.
23. Cypress dans CI post-déploiement staging.
24. Migrer `multer@2`, `helmet@8`, `express-rate-limit@7`; évaluer Express 5.
25. Cache HTTP/ETag sur GET publics (`/api/oeuvres`, `/api/evenements`).

---

## 10. Checklist go-live (mise à jour)

- [ ] **Nginx**: blocs 443 nettoyés, `client_max_body_size 100M` appliqué aux uploads.
- [ ] **CI**: toutes étapes critiques bloquantes; tests + build + audit.
- [ ] **Crons/Queue**: `cronService`, `uploadCronJob`, `emailQueueService` initialisés, shutdown gracieux testé.
- [ ] **Rate-limit headers** exposés, adaptive backoff front validé.
- [ ] **`.env` prod**: `JWT_SECRET` ≥ 64 chars, `REDIS_PASSWORD`, `SENTRY_DSN`, `CLOUDINARY_*`, `EMAIL_PAUSED=false`.
- [ ] **Migrations** jouées (`npm run db:migrate`), `DB_SYNC=false` en prod.
- [ ] **Backup** run manuel + restore test validé, offload distant actif.
- [ ] **Suppression** `check_salah.js`, consolidation audits.
- [ ] **Sentry** front + back actifs; healthchecks verts (nginx/mysql/redis/backend/frontend).
- [ ] **Doc API** `/api/`, `/api/endpoints` indisponibles publiquement en prod.

---

## 11. Annexes

### 11.1 Fichiers à nettoyer ou migrer

| Fichier | Action |
|---|---|
| `check_salah.js` (racine) | Supprimer |
| `backend/extract_keys.js` | Déplacer → `backend/scripts/i18n/` |
| `backend/test-api.js` (si présent) | Déplacer → `backend/scripts/` |
| `backend/env.test` | Supprimer (doublon `.env.test`) |
| `backend/models/index-original.js` | Refactor → réécrire `index.js` sans dépendance, puis supprimer |
| `frontEnd/package.json` devDep `redis-server` | Supprimer |
| `AUDIT_PRODUCTION_COMPLET.md`, `AUDIT_TECHNIQUE_PRODUCTION.md`, `AUDIT_COMPLET_2026.md`, `frontEnd/AUDIT_FRONTEND.md`, `backend/PERFORMANCE_AUDIT.md` | Consolider → `docs/audits/2026-04/` |

### 11.2 Points de code exemplaires (référence pour d'autres modules)

- Pattern Service/Repository DI: `backend/services/serviceContainer.js`.
- Auth JWT + Redis cache + blacklist: `backend/middlewares/authMiddleware.js`.
- CSRF double-submit: `backend/middlewares/csrfMiddleware.js`.
- Account lockout distribué: `backend/middlewares/rateLimitMiddleware.js:284-392`.
- HTTP client adaptatif (429 backoff): `frontEnd/src/services/httpClient.ts`.
- Verrou refresh concurrent: `frontEnd/src/services/auth.service.ts:52-149`.
- Migration type audit: `backend/migrations/20260321-add-user-suspension-audit.js`.

---

**Synthèse**: par rapport à l'audit précédent, les corrections de sécurité majeures sur la sanitisation, la rotation du refresh token (front + back), le rate-limit sur `/refresh-token` et la création/suppression transactionnelle des œuvres sont **acquises**. Les trois fronts restants sont:
(1) **nginx prod** (bloc 443 dupliqué) à corriger de toute urgence;
(2) **CI non bloquante** (GitHub Actions `|| true` + GitLab `|| echo`) qui laisse déployer du code cassé;
(3) **crons / queue / uploadCron non initialisés** au boot, rendant des fonctionnalités métier muettes en production.

Ces trois points, plus la suppression de `check_salah.js` et l'exposition publique de `/api/endpoints`, constituent le chemin critique. Le reste est de la dette maîtrisable.
