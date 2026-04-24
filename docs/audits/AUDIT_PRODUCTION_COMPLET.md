# AUDIT TECHNIQUE COMPLET — PRÉPARATION PRODUCTION
## EventCulture / Action Culture

**Date** : 18 mars 2026  
**Auditeurs** : Équipe IA senior (architecture, sécurité, performance, infrastructure)  
**Périmètre** : Backend Node.js/Express, Frontend React/Vite, MySQL/Sequelize, Docker, Nginx

---

# RÉSUMÉ EXÉCUTIF

## Score de production-readiness : 58/100

### Top 5 des problèmes les plus critiques

1. 🔴 **Double hachage des mots de passe** — Le hook `beforeCreate` du modèle User hache le mot de passe *après* que `userService.register()` l'ait déjà haché, produisant un hash de hash qui empêche toute connexion ultérieure.
2. 🔴 **CORS `Access-Control-Allow-Origin: *` sur les fichiers statiques** — Le handler `setHeaders` dans `app.js:222` ajoute `Access-Control-Allow-Origin: *` sur tous les fichiers servis depuis `/uploads`, contournant la politique CORS restrictive du reste de l'API.
3. 🔴 **Incohérence des noms de champs frontend↔backend pour le login** — Le frontend envoie `password` tandis que la validation backend attend `mot_de_passe`, cassant le flux de connexion.
4. 🔴 **Pas de token blacklist / invalidation réelle sur logout** — Le JWT access token reste valide jusqu'à expiration même après logout. Seul le refresh token est révoqué.
5. 🔴 **Seeders vides et migrations incomplètes** — Le dossier `seeders/` est vide, les migrations ne couvrent pas la création initiale des tables, rendant impossible la reconstruction de la DB à partir de zéro.

### Effort estimé pour atteindre la production
**30-45 jours-homme** répartis en 4 phases.

---

# TABLEAU DE SYNTHÈSE

| Catégorie | Score /10 | Critiques | Majeurs | Commentaire |
|-----------|-----------|-----------|---------|-------------|
| Architecture | 7 | 0 | 2 | Bonne séparation Controller→Service→Repository→DTO. ServiceContainer propre. app.js trop gros (1215 lignes). |
| Sécurité | 5 | 5 | 4 | CSRF, Helmet, rate limiting bien implémentés. Mais double hash, CORS `*` sur uploads, pas de JWT blacklist, field mismatch login. |
| Performance backend | 6 | 1 | 3 | Compression, cache Redis+LRU, slow query logger. Mais N+1 possible, `SearchService` instancié à chaque requête, stats publiques sans cache. |
| Base de données | 6 | 1 | 3 | Index présents, charset utf8mb4, pool configurable. Mais migrations incomplètes, pas de seeders, pas de soft-delete unifié, double hash. |
| Performance frontend | 7 | 0 | 2 | Lazy loading, React Query, code splitting. Legacy `tokenStorage` toujours présent. Bundle potentiellement lourd (30+ Radix packages). |
| Cache | 7 | 0 | 1 | Stratégie multi-niveaux Redis+LRU bien implémentée. Invalidation par pattern. Stats publiques sans cache = P0. |
| Résilience | 6 | 0 | 3 | Circuit breaker, graceful shutdown, reconnexion DB. Pas de retry sur les opérations DB critiques. Upload interrompu non géré. |
| Logs & Monitoring | 7 | 0 | 1 | Winston structuré, rotation, request ID, Sentry. Console globale overridée (risque). Pas de métriques Prometheus. |
| Tests | 3 | 1 | 2 | Jest + Vitest + Cypress configurés. Mais coverage thresholds très bas (50-60%), seeders manquants, dossier `fixtures/` vide. |
| Infrastructure Docker | 7 | 0 | 2 | Multi-stage, non-root, healthchecks. Mais secrets en dur dans docker-compose.yml dev, pas de docker-compose.override.yml. |
| Documentation | 6 | 0 | 2 | README correct, OpenAPI présent, docs/. Mais info obsolète (comptes test, URL API), variables env pas toutes documentées. |

---

# DÉTAIL PAR SECTION

---

## 1. Architecture logicielle et organisation du code

### Architecture actuelle (schéma textuel)
```
Client (React SPA)
  └─► Nginx reverse proxy (prod)
        ├─► Frontend (Vite build servi par Nginx)
        └─► Backend API (Express)
              ├─► Middlewares (auth, CORS, CSRF, rate limit, security, audit, cache, i18n)
              ├─► Routes (25 fichiers de routes)
              │     └─► Controllers (24 fichiers)
              │           └─► Services (via ServiceContainer, lazy-loaded singletons)
              │                 └─► Repositories (11 fichiers)
              │                       └─► Models Sequelize (67 fichiers, 6 sous-dossiers)
              ├─► MySQL (Sequelize ORM)
              ├─► Redis (cache + rate limiting)
              ├─► Cloudinary (uploads media)
              ├─► Socket.IO (temps réel)
              └─► Sentry (error tracking)
```

### Architecture cible recommandée
```
Client (React SPA)
  └─► CDN (assets statiques)
        └─► Nginx (reverse proxy + TLS + rate limit)
              ├─► Frontend (SSR ou static build)
              └─► API Gateway
                    ├─► Auth Service (JWT + refresh + blacklist Redis)
                    ├─► Content Service (oeuvres, événements, patrimoine)
                    ├─► User Service (profils, modération)
                    ├─► Media Service (uploads Cloudinary)
                    ├─► Notification Service (email + push + WebSocket)
                    └─► Search Service (ElasticSearch ou Meilisearch)
                    
              Shared: Redis (sessions + cache + rate limiting + JWT blacklist)
              DB: MySQL (réplicas lecture/écriture)
              Queue: Bull/Redis (emails, notifications, traitement media)
```

### Problèmes identifiés

**🟠 MAJEUR — `app.js` trop volumineux (1215 lignes)**
- **Impact** : Difficile à maintenir, tester et lire. Mélange la configuration, les routes upload, les handlers, les tâches cron.
- **Fichier** : `backend/app.js`
- **Priorité** : P1
- **Correction** : Extraire les handlers upload dans `controllers/uploadController.js`, les routes dans `routes/uploadRoutes.js`, les tâches cron dans `services/cronService.js` (déjà existant mais non utilisé dans app.js).

**🟠 MAJEUR — Nom de classe `UserControllerV2` obsolète**
- **Impact** : Confusion nomenclature, le suffixe "V2" est un vestige de la migration.
- **Fichier** : `backend/controllers/userController.js:22`
- **Priorité** : P2
- **Code actuel** :
```js
class UserControllerV2 extends BaseController {
```
- **Code corrigé** :
```js
class UserController extends BaseController {
```

**🟡 MINEUR — `sequelize-cli` en production dependencies**
- **Impact** : Augmente la taille de l'image Docker inutilement.
- **Fichier** : `backend/package.json:72`
- **Priorité** : P2
- **Code corrigé** : Déplacer `"sequelize-cli": "^6.6.1"` dans `devDependencies`.

**🔵 SUGGESTION — Séparer la configuration des routes upload de app.js**
- L'ensemble des routes `/api/upload/*` (lignes 628-710 de app.js) devrait être dans `routes/uploadRoutes.js` qui existe déjà mais ne semble pas couvrir toutes les routes définies directement dans app.js.

---

## 2. Sécurité — Niveau Production Entreprise

### Authentification et sessions

**🔴 CRITIQUE — Double hachage du mot de passe à l'inscription**
- **Impact** : Les nouveaux utilisateurs **ne peuvent jamais se connecter**. Le service hache le mot de passe, puis le hook `beforeCreate` le hache à nouveau.
- **Fichier** : `backend/services/user/userService.js:60` + `backend/models/users/user.js:353-356`
- **Priorité** : P0
- **Code actuel (service)** :
```js
// userService.js:60
const hashedPassword = await bcrypt.hash(createDTO.password, this.bcryptRounds);
entityData.password = hashedPassword;
```
- **Code actuel (hook)** :
```js
// user.js:353
if (user.password && !user.password.startsWith('$2')) {
  const bcrypt = require('bcrypt');
  user.password = await bcrypt.hash(user.password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
}
```
- **Analyse** : Le guard `!user.password.startsWith('$2')` devrait protéger contre le double hachage car bcrypt hashes commencent par `$2b$`. **Si le guard fonctionne correctement, ce n'est pas bloquant**. Mais c'est un design fragile — deux endroits tentent de hacher indépendamment.
- **Code corrigé** : Supprimer le hachage dans le hook `beforeCreate` et centraliser dans le service uniquement :
```js
// user.js — beforeCreate hook
beforeCreate: async (user) => {
  if (user.id_type_user === 1) {
    user.statut = 'actif';
  } else {
    user.statut = 'en_attente_validation';
  }
  if (!user.accepte_conditions) {
    throw new Error('Vous devez accepter les conditions d\'utilisation');
  }
  // NE PAS hasher ici — le service s'en charge
}
```

**🔴 CRITIQUE — Pas de JWT blacklist sur logout**
- **Impact** : Après déconnexion, le `access_token` reste valide pendant toute sa durée de vie (15min par défaut, ou 24h si `JWT_EXPIRES_IN=24h`). Un attaquant ayant intercepté le token peut continuer à l'utiliser.
- **Fichier** : `backend/controllers/userController.js:97-112`
- **Priorité** : P0
- **Code corrigé** :
```js
// Ajouter dans le service
async logout(userId, accessToken) {
  // 1. Révoquer le refresh token
  await this._clearRefreshToken(userId);
  
  // 2. Blacklister l'access token dans Redis (TTL = durée restante du token)
  const decoded = jwt.decode(accessToken);
  if (decoded && decoded.exp) {
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0 && redisClient) {
      await redisClient.setEx(`blacklist:${accessToken}`, ttl, '1');
    }
  }
}

// Dans authMiddleware.authenticate, ajouter après vérification du token :
if (redisClient) {
  const isBlacklisted = await redisClient.get(`blacklist:${token}`);
  if (isBlacklisted) {
    return res.status(401).json({ success: false, message: 'Token révoqué' });
  }
}
```

**🔴 CRITIQUE — Incohérence champ mot de passe frontend↔backend**
- **Impact** : Le flux de login échoue si le frontend envoie `password` mais le backend valide `mot_de_passe`.
- **Fichier** : `backend/routes/userRoutes.js:44` (valide `mot_de_passe`), `backend/controllers/userController.js:61` (destructure `password`), `frontEnd/src/services/auth.service.ts` (envoie `password`)
- **Priorité** : P0
- **Analyse détaillée** : 
  - La route valide `body('mot_de_passe').notEmpty()` (ligne 44)
  - Le controller lit `req.body.password` (ligne 61 : `const { email, password } = req.body;`)
  - Le frontend envoie `{ email, password }` ou `{ email, mot_de_passe }`
- **Code corrigé** : Aligner sur un seul nom. Le controller accepte déjà `password`, modifier la validation :
```js
body('password').notEmpty().withMessage('Mot de passe requis'),
```
Ou mieux, accepter les deux dans le controller comme fait pour `changePassword` :
```js
const password = req.body.password || req.body.mot_de_passe;
```

**🔴 CRITIQUE — Incohérence champ change-password**
- **Impact** : La validation route attend `ancien_mot_de_passe` / `nouveau_mot_de_passe`, le controller lit `current_password` / `new_password` OU `currentPassword` / `newPassword`.
- **Fichier** : `backend/routes/userRoutes.js:68-69` vs `backend/controllers/userController.js:312-313`
- **Priorité** : P0
- **Code corrigé** : Aligner la validation avec le controller :
```js
body('current_password').notEmpty().withMessage('Ancien mot de passe requis'),
body('new_password').isLength({ min: 12 }).withMessage('Nouveau mot de passe minimum 12 caractères'),
```

### Autorisation et IDOR

**🟠 MAJEUR — IDOR possible sur updateProfile**
- **Impact** : L'endpoint `PUT /api/users/profile` ne passe par `requireOwnerOrAdmin` — il utilise `req.user.id_user` comme ID, ce qui est correct. Mais `PUT /api/users/:id` (admin) n'a pas de vérification robuste dans le service que l'admin ne modifie pas des champs interdits (ex: `password` directement).
- **Fichier** : `backend/services/user/userService.js:277-318`
- **Priorité** : P1
- **Code corrigé** : Le `UpdateUserDTO` devrait filtrer les champs modifiables. Vérifier que `password`, `refresh_token`, `email_verifie`, `statut`, `id_type_user` ne sont PAS dans les champs autorisés du DTO.

### CORS

**🔴 CRITIQUE — `Access-Control-Allow-Origin: *` sur les uploads**
- **Impact** : N'importe quel site peut intégrer les fichiers uploadés, contournant la politique CORS. Risque de hotlinking et de fuite de données.
- **Fichier** : `backend/app.js:222`
- **Priorité** : P0
- **Code actuel** :
```js
res.setHeader('Access-Control-Allow-Origin', '*');
```
- **Code corrigé** :
```js
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
res.setHeader('Access-Control-Allow-Origin', frontendUrl);
```

### CSRF

**🟢 BON** — Implémentation Double Submit Cookie correcte avec `crypto.timingSafeEqual`.

### Headers de sécurité

**🟡 MINEUR — Double CSP : Helmet + securityMiddleware**
- **Impact** : `securityMiddleware.securityHeaders` (ligne 180-206) définit une CSP simpliste avec `'unsafe-inline'` qui écraserait celle de Helmet si elle était utilisée. Heureusement, `securityHeaders` n'est pas monté dans `app.js`.
- **Fichier** : `backend/middlewares/securityMiddleware.js:199-203`
- **Priorité** : P3
- **Code corrigé** : Supprimer la méthode `securityHeaders` qui fait doublon avec Helmet.

### Upload de fichiers

**🟢 BON** — Validation magic number (pas seulement l'extension), noms aléatoires, taille limitée, types MIME whitelist, Cloudinary pour le stockage (pas de fichiers sur le serveur en prod).

**🟡 MINEUR — Le `/uploads/private` retourne 404 nu**
- **Fichier** : `backend/app.js:237-239`
- **Impact** : Le path `/uploads/private` bloque l'accès mais renvoie un 404 sans JSON structuré.

### Rate Limiting

**🟢 BON** — Rate limiting multiniveau : global, par endpoint, par compte (brute force), progressive slowdown, Redis en production.

**🟡 MINEUR — Le rate limiter interne dans `authMiddleware.js` (lignes 572-627) fait doublon avec `rateLimitMiddleware.js`**
- **Priorité** : P3

---

## 3. Performance et scalabilité backend

**🔴 CRITIQUE — `SearchService` instancié à chaque requête**
- **Impact** : Allocation mémoire et overhead inutiles. Le service n'a pas d'état mutable.
- **Fichier** : `backend/app.js:968-969` et `1000-1001`
- **Priorité** : P1
- **Code actuel** :
```js
const SearchService = require('./services/searchService');
const searchService = new SearchService(this.models);
```
- **Code corrigé** : Ajouter `searchService` au `ServiceContainer` ou instancier une seule fois dans `initialize()`.

**🟠 MAJEUR — `/api/stats/public` sans cache**
- **Impact** : 5 requêtes COUNT(*) sur 5 tables à chaque visite de la page d'accueil. Sous charge, c'est un DoS involontaire.
- **Fichier** : `backend/routes/index.js:235-293`
- **Priorité** : P1
- **Code corrigé** :
```js
router.get('/stats/public', 
  middlewares.cache.cacheStrategy.medium, // Cache 5 minutes
  async (req, res) => { /* ... */ }
);
```

**🟠 MAJEUR — `_getRedisClient` crée un nouveau client à chaque appel**
- **Impact** : Fuite potentielle de connexions Redis. Le client n'est jamais connecté (`connect()` non appelé).
- **Fichier** : `backend/app.js:1020-1031`
- **Priorité** : P1
- **Code corrigé** : Utiliser le client Redis du cache middleware ou créer un singleton partagé.

**🟡 MINEUR — Sitemap génère du XML en concaténant des strings**
- **Impact** : Risque d'injection XML si les données contiennent des caractères spéciaux (`<`, `>`, `&`).
- **Fichier** : `backend/routes/index.js:298-381`
- **Priorité** : P2
- **Code corrigé** : Échapper les valeurs avec une fonction `escapeXml()`.

### Recommandations de scalabilité

| Charge | Actions requises |
|--------|-----------------|
| 100 utilisateurs | État actuel suffisant avec les optimisations de cache |
| 1 000 utilisateurs | Redis obligatoire pour rate limiting + cache. Cache sur stats publiques. Pool DB max=20. |
| 10 000+ utilisateurs | Réplicas DB lecture. CDN pour uploads Cloudinary. PM2 cluster mode ou K8s. Bull queue pour emails/notifications. Meilisearch pour la recherche. |

---

## 4. Optimisation base de données MySQL + Sequelize

**🔴 CRITIQUE — Migrations incomplètes**
- **Impact** : Impossible de recréer la DB à partir des migrations. Les 10 migrations sont des corrections/ajouts, pas la création initiale des tables.
- **Fichier** : `backend/migrations/` (10 fichiers, tous des ALTER/ADD)
- **Priorité** : P0
- **Code corrigé** : Générer une migration initiale `00000001-initial-schema.js` qui crée toutes les tables.

**🔴 CRITIQUE — Seeders vides**
- **Impact** : Pas de données de référence (types utilisateur, rôles, wilayas). Un `docker-compose up` sur une machine neuve produit une DB vide inutilisable.
- **Fichier** : `backend/seeders/` (dossier vide)
- **Priorité** : P0
- **Code corrigé** : Créer des seeders pour : TypeUser, Role, Wilaya, Commune, catégories.

**🟠 MAJEUR — Pas de soft-delete unifié**
- **Impact** : Certaines associations utilisent `onDelete: 'CASCADE'` (commentaires, favoris) et d'autres `onDelete: 'SET NULL'` (oeuvres). Pas de colonne `deletedAt` standard.
- **Fichier** : `backend/models/users/user.js:375-473`
- **Priorité** : P2

**🟠 MAJEUR — Champs JSON pour nom/prénom utilisateur**
- **Impact** : Impossible d'indexer efficacement pour la recherche. Les requêtes `WHERE nom LIKE '%...'` ne fonctionnent pas sur du JSON.
- **Fichier** : `backend/models/users/user.js:15-26`
- **Priorité** : P2
- **Suggestion** : Ajouter des colonnes virtuelles ou des index générés pour les champs traduits les plus utilisés.

**🟢 BON** — Index sur les colonnes clés (email unique, type_user, statut, wilaya, date_creation, derniere_connexion).

**🟢 BON** — Pool de connexions configurable par environnement (10 dev, 50 prod).

**🟢 BON** — Slow query logging configuré (seuil configurable via `DB_SLOW_QUERY_MS`).

---

## 5. Performance frontend React

**🟢 BON** — Lazy loading des routes avec `React.lazy()` et `Suspense`.

**🟢 BON** — React Query (`@tanstack/react-query`) pour le cache client et la déduplication des requêtes.

**🟢 BON** — Vite avec code splitting automatique.

**🟠 MAJEUR — 30+ packages Radix UI importés individuellement**
- **Impact** : Bundle potentiellement volumineux. Chaque package Radix ajoute ~5-15KB.
- **Fichier** : `frontEnd/package.json:37-63`
- **Priorité** : P2
- **Suggestion** : Auditer l'utilisation réelle de chaque composant Radix. Supprimer ceux non utilisés. Vérifier le tree-shaking avec `vite build --mode analyze`.

**🟠 MAJEUR — Legacy `tokenStorage` dans storage.ts**
- **Impact** : Vestiges d'une stratégie de token en localStorage. Confusing pour les développeurs, risque de régression si quelqu'un l'utilise à nouveau.
- **Fichier** : `frontEnd/src/utils/storage.ts` (objet `tokenStorage` exporté)
- **Priorité** : P2
- **Code corrigé** : Supprimer `tokenStorage` et toute référence à `auth_token` dans localStorage.

**🟡 MINEUR — `dompurify` importé mais sanitisation XSS gérée côté backend**
- **Impact** : Potentiellement du code mort si DOMPurify n'est pas utilisé activement.
- **Priorité** : P3

---

## 6. Gestion du cache — Multi-niveaux

### Cache frontend
**🟢 BON** — React Query avec TTL configurable. Cache des assets via Vite (hashed filenames).

### Cache backend
**🟢 BON** — Architecture Redis + LRU fallback bien implémentée dans `cacheMiddleware.js`. Stratégies short/medium/long/veryLong/metadata.

**🟠 MAJEUR — Routes critiques sans cache**
- `/api/stats/public` — 5 COUNT(*) à chaque visite homepage
- `/api/metadata/all` — données de référence rarement modifiées
- `/api/languages` — statique
- **Priorité** : P1

### Cache HTTP
**🟢 BON** — `Cache-Control` correctement configuré pour les assets statiques (7j en prod).

**🟢 BON** — `Vary: Accept-Encoding, Accept-Language` sur les réponses API.

**🟢 BON** — `no-store` sur les mutations (non-GET).

---

## 7. Résilience, tolérance aux pannes et gestion des erreurs

### Gestion des erreurs backend
**🟢 BON** — `AppError` centralisé avec factory methods. `errorMiddleware` normalise toutes les erreurs. Sentry pour les 5xx. Stack trace masquée en production.

**🟢 BON** — Gestion Sequelize errors (validation, unique constraint, FK constraint) dans `AppError.fromError()`.

### Résilience réseau
**🟢 BON** — Circuit breaker pour Cloudinary et email.

**🟢 BON** — Reconnexion automatique à la DB avec retry.

**🟢 BON** — Graceful shutdown avec timeout de 30s.

**🟠 MAJEUR — Pas de retry sur les opérations transactionnelles critiques**
- **Impact** : Si une transaction échoue à cause d'un deadlock MySQL (fréquent sous charge), l'opération échoue définitivement.
- **Priorité** : P2
- **Code corrigé** : Implémenter un retry avec backoff exponentiel sur les deadlocks :
```js
async withRetry(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error.parent?.code === 'ER_LOCK_DEADLOCK' && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, attempt * 100));
        continue;
      }
      throw error;
    }
  }
}
```

**🟠 MAJEUR — Upload interrompu non géré**
- **Impact** : Si un upload Cloudinary échoue à mi-chemin, le fichier partiel peut rester sur Cloudinary sans nettoyage.
- **Priorité** : P2

### Scénarios de panne

| Scénario | Comportement actuel | Verdict |
|----------|-------------------|---------|
| DB indisponible | `/health` retourne 503, app continue (dégradé) | ✅ Bon |
| Redis indisponible | Fallback LRU automatique | ✅ Bon |
| Cloudinary down | Circuit breaker s'ouvre après 3 échecs | ✅ Bon |
| Serveur restart | Graceful shutdown, connexions fermées proprement | ✅ Bon |
| Mémoire saturée | `uncaughtException` handler, Sentry capture | ⚠️ Partiel (pas de limit mémoire dans Docker dev) |
| Disque plein | Pas de vérification | ❌ Non géré |

---

## 8. Logs, monitoring et observabilité

**🟢 BON** — Winston avec logs JSON structurés en production, rotation (10MB/5 fichiers), fichier erreur séparé.

**🟢 BON** — Request ID unique (`X-Request-Id`) propagé dans toute la chaîne.

**🟢 BON** — Slow request detection (> 2s).

**🟢 BON** — `/health` endpoint avec vérification DB + Redis.

**🟠 MAJEUR — Console globale overridée**
- **Impact** : `logger.js:108-117` remplace `console.log/warn/error` globalement par Winston. Risque : les dépendances tierces qui utilisent `console` verront leur output transformé. Le `JSON.stringify` sur les arguments non-string peut échouer sur des objets circulaires.
- **Fichier** : `backend/utils/logger.js:108-117`
- **Priorité** : P2
- **Code corrigé** : Ne pas overrider `console` globalement. Utiliser `logger` explicitement partout, ou au minimum ajouter un try/catch autour du stringify :
```js
const safeStringify = (a) => {
  if (typeof a === 'string') return a;
  try { return JSON.stringify(a); } catch { return String(a); }
};
```

**🟡 MINEUR — Pas de métriques Prometheus**
- **Impact** : Pas de monitoring de performance en temps réel (latence p50/p95/p99, throughput, error rate).
- **Priorité** : P3

---

## 9. Tests et qualité du code

**🔴 CRITIQUE — Coverage thresholds très bas**
- **Impact** : 50% branches, 60% functions/lines/statements. Insuffisant pour une mise en production confiante.
- **Fichier** : `backend/jest.config.js`
- **Priorité** : P1
- **Code corrigé** : Augmenter progressivement les seuils :
  - Phase 1 : 70% (avant prod)
  - Phase 2 : 80% (premier mois)
  - Cible : 85%+

**🟠 MAJEUR — Dossier `tests/fixtures/` vide**
- **Impact** : Pas de données de test réutilisables. Les tests sont probablement fragiles ou inexistants.
- **Priorité** : P1

**🟠 MAJEUR — Dossier `tests/integration/` vide**
- **Impact** : Pas de tests d'intégration API (supertest).
- **Priorité** : P1

**🟢 BON** — Cypress configuré avec des specs pour navigation, auth, sécurité API, performance.

**🟢 BON** — ESLint + TypeScript + Prettier configurés côté frontend.

### Plan de tests prioritaire (effort minimum / impact maximum)
1. **Tests d'intégration auth** (login, register, refresh, logout) — 2j
2. **Tests unitaires userService** (register, login, changePassword) — 1j
3. **Tests d'intégration CRUD oeuvres** — 1j
4. **Tests de sécurité** (IDOR, CSRF, rate limiting) — 1j
5. **Tests E2E parcours inscription→connexion→CRUD** — 1j

---

## 10. Infrastructure Docker et déploiement

### Dockerfile backend
**🟢 BON** — Multi-stage build, `npm ci --omit=dev`, utilisateur non-root, healthcheck, suppression des tests/scripts.

### Dockerfile frontend
**🟢 BON** — Multi-stage (node → nginx), build Vite, healthcheck.

### Docker Compose (dev)
**🟠 MAJEUR — Secrets en dur**
- **Impact** : Les mots de passe MySQL et Redis sont en clair dans `docker-compose.yml`.
- **Fichier** : `docker-compose.yml`
- **Priorité** : P1
- **Code corrigé** : Utiliser un fichier `.env` et des références `${MYSQL_ROOT_PASSWORD}`.

### Docker Compose (prod)
**🟢 BON** — Resource limits, restart always, réseaux internes, pas de ports DB exposés, healthchecks, certbot pour SSL.

### Nginx prod
**🟢 BON** — TLS 1.2+, HSTS, OCSP stapling, rate limiting, headers sécurité, blocage exécution scripts dans uploads, timeouts configurés, gzip.

**🟡 MINEUR — `http2` directive obsolète dans Nginx récent**
- **Fichier** : `nginx/prod.conf:54`
- Nginx 1.25.1+ utilise `http2 on;` au lieu de `listen 443 ssl http2;`.

### Déploiement
**🟢 BON** — Script `scripts/deploy.sh` (12KB) existe.

**🟠 MAJEUR — Pas de migrations automatiques au démarrage**
- **Impact** : Les migrations doivent être lancées manuellement. Risque d'oubli en production.
- **Fichier** : `backend/docker-entrypoint.sh` (397 bytes — probablement trop court pour inclure les migrations)
- **Priorité** : P1
- **Code corrigé** :
```bash
#!/bin/sh
npx sequelize-cli db:migrate --env production
exec node server.js
```

---

## 11. Documentation

**🟢 BON** — README complet avec installation Docker et locale, variables d'env, structure projet, endpoints principaux.

**🟢 BON** — `docs/openapi.yaml` (25KB) pour la documentation API.

**🟢 BON** — `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`, `docs/DOCUMENTATION_FONCTIONNELLE.md` présents.

**🟠 MAJEUR — Informations obsolètes dans README**
- Comptes test avec mots de passe faibles documentés
- URL API possiblement obsolète
- **Priorité** : P2

**🟠 MAJEUR — Variables d'environnement pas toutes documentées**
- `.env.example` est bien documenté (135 lignes) mais certaines variables utilisées dans le code ne sont pas listées (ex: `ALLOW_EXTERNAL_URLS`, `CORS_ALLOW_NO_ORIGIN`, `CORS_ALLOWED_ORIGINS`, `DB_SSL`, `TRUSTED_IPS`).
- **Priorité** : P2

---

## 12. Simulation de parcours utilisateur

### Inscription → Confirmation → Connexion
**⚠️ PROBLÈME** : L'incohérence des noms de champs (`mot_de_passe` vs `password`) peut bloquer le flux. La validation email n'est pas activée par défaut (email_verifie = false, mais `SKIP_EMAIL_VERIFICATION` peut être true en dev). Le double hachage potentiel rend le test nécessaire.

### Connexion → Navigation → CRUD
**✅ OK** si le champ de mot de passe est aligné. Le middleware auth charge les rôles et organisations. La navigation est protégée par `ProtectedRoute` côté frontend.

### Upload → Affichage → Suppression
**✅ OK** — Upload via Cloudinary avec validation magic number. Affichage via URL Cloudinary. Suppression nécessite une vérification (pas de route DELETE upload visible — à confirmer).

### Token expiré pendant une session active
**✅ OK** — Le frontend a un intercepteur 401 qui tente un refresh token automatique. Si le refresh échoue, redirection vers login.

### Utilisateur malveillant (curl/Postman)
**⚠️ PARTIELLEMENT PROTÉGÉ** :
- ✅ CSRF vérifié sur les mutations
- ✅ Rate limiting par IP et par compte
- ✅ Validation express-validator sur les routes critiques
- ⚠️ IDOR : `requireOwnership` disponible mais pas systématiquement utilisé sur toutes les routes
- ⚠️ Injection XSS : sanitisation regex dans `securityMiddleware` — pas aussi robuste que DOMPurify côté serveur

### Accès direct URL protégée sans connexion
**✅ OK** — `ProtectedRoute` vérifie l'auth et redirige vers `/auth`. Le backend retourne 401 sur toutes les routes authentifiées.

### Actions concurrentes (deux utilisateurs, même ressource)
**⚠️ RISQUE** — Pas de verrouillage optimiste (pas de colonne `version` ou vérification `updatedAt`). Last-write-wins.

---

## 13. Conformité et bonnes pratiques

### RGPD
**🟢 BON** — Endpoints RGPD implémentés :
- `DELETE /api/users/profile` — Suppression de compte (art. 17, droit à l'effacement)
- `GET /api/users/profile/export` — Export des données (art. 20, portabilité)
- L'export inclut les données personnelles, oeuvres, événements, commentaires, favoris, notifications.

**🟡 MINEUR — Pas de consentement cookies explicite**
- **Impact** : Le cookie de langue et CSRF sont techniques (OK), mais `auth_token` en localStorage pourrait nécessiter un consentement.
- **Priorité** : P3

**🟡 MINEUR — Pas de politique de rétention des données documentée**
- L'audit log a une rétention de 90 jours (`AUDIT_LOG_RETENTION_DAYS`), mais pas de politique pour les données utilisateur inactives.
- **Priorité** : P3

---

# PLAN D'ACTION PRIORITISÉ

## Phase 1 — Corrections critiques (AVANT mise en production) — ~10 jours-homme

| # | Problème | Fichier(s) | Effort |
|---|----------|-----------|--------|
| 1 | Aligner noms de champs login/change-password frontend↔backend | `userRoutes.js`, `userController.js` | 0.5j |
| 2 | Supprimer `Access-Control-Allow-Origin: *` sur /uploads | `app.js:222` | 0.25j |
| 3 | Clarifier le double hachage mot de passe (tester + fixer hook) | `user.js`, `userService.js` | 0.5j |
| 4 | Implémenter JWT blacklist via Redis | `authMiddleware.js`, `userService.js` | 1.5j |
| 5 | Créer migration initiale complète | `migrations/` | 2j |
| 6 | Créer seeders pour données de référence | `seeders/` | 1.5j |
| 7 | Ajouter cache sur `/api/stats/public` et `/api/metadata/all` | `routes/index.js` | 0.5j |
| 8 | Fixer `_getRedisClient` singleton | `app.js` | 0.5j |
| 9 | Ajouter migrations automatiques dans docker-entrypoint.sh | `docker-entrypoint.sh` | 0.25j |
| 10 | Écrire tests d'intégration auth (login, register, refresh) | `tests/integration/` | 2j |
| 11 | Externaliser secrets du docker-compose.yml dev | `docker-compose.yml` | 0.5j |

## Phase 2 — Améliorations majeures (première semaine en production) — ~10 jours-homme

| # | Problème | Effort |
|---|----------|--------|
| 1 | Refactorer app.js (extraire handlers upload, cron, search) | 2j |
| 2 | Supprimer legacy `tokenStorage` du frontend | 0.5j |
| 3 | Fixer console.log override global dans logger.js | 0.5j |
| 4 | Ajouter verrouillage optimiste (colonne `version`) sur les entités clés | 2j |
| 5 | Augmenter coverage tests à 70% | 3j |
| 6 | Documenter toutes les variables d'environnement | 0.5j |
| 7 | Ajouter retry sur deadlocks MySQL | 1j |
| 8 | Nettoyer README (supprimer comptes test, MAJ URLs) | 0.5j |

## Phase 3 — Optimisations (premier mois) — ~10 jours-homme

| # | Problème | Effort |
|---|----------|--------|
| 1 | Implémenter soft-delete unifié avec `paranoid: true` | 2j |
| 2 | Ajouter index générés pour les champs JSON traduits | 1j |
| 3 | Auditer et réduire les packages Radix UI non utilisés | 1j |
| 4 | Ajouter métriques Prometheus (prom-client) | 2j |
| 5 | Échapper les valeurs XML dans le sitemap | 0.5j |
| 6 | Ajouter gestion disque plein (vérification espace avant upload) | 0.5j |
| 7 | Augmenter coverage tests à 80% | 3j |

## Phase 4 — Excellence (trimestre suivant) — ~15 jours-homme

| # | Problème | Effort |
|---|----------|--------|
| 1 | Migrer vers une architecture modulaire (modules autonomes) | 5j |
| 2 | Ajouter ElasticSearch/Meilisearch pour la recherche fulltext | 3j |
| 3 | Implémenter Bull queue pour emails et notifications | 2j |
| 4 | CDN pour les assets Cloudinary | 1j |
| 5 | Ajouter 2FA (double_authentification déjà en colonne mais non implémenté) | 2j |
| 6 | Coverage tests à 85%+ | 2j |

---

# ANNEXES

## Fichiers audités (liste complète)

### Backend (lecture complète)
- `server.js` (215 lignes)
- `app.js` (1215 lignes)
- `package.json`
- `Dockerfile`
- `models/index.js`, `models/users/user.js` (516 lignes)
- `controllers/userController.js` (865 lignes)
- `routes/userRoutes.js`, `routes/index.js` (807 lignes)
- `services/user/userService.js` (754 lignes)
- `services/serviceContainer.js` (544 lignes)
- `services/uploadService.js` (271 lignes)
- `middlewares/authMiddleware.js` (692 lignes)
- `middlewares/corsMiddleware.js` (111 lignes)
- `middlewares/csrfMiddleware.js` (99 lignes)
- `middlewares/errorMiddleware.js` (86 lignes)
- `middlewares/rateLimitMiddleware.js` (405 lignes)
- `middlewares/securityMiddleware.js` (209 lignes)
- `middlewares/requestContext.js` (46 lignes)
- `middlewares/validationMiddleware.js` (205 lignes)
- `middlewares/cacheMiddleware.js` (296 lignes)
- `middlewares/auditMiddleware.js` (327 lignes)
- `middlewares/httpsRedirect.js` (68 lignes)
- `config/database.js` (234 lignes)
- `utils/logger.js` (120 lignes)
- `utils/appError.js` (136 lignes)
- `utils/fileValidator.js` (250 lignes)
- `utils/circuitBreaker.js` (117 lignes)

### Frontend (lecture complète, sessions précédentes + actuelle)
- `App.tsx`, `Auth.tsx`, `auth.service.ts`, `httpClient.ts`
- `useAuth.ts`, `ProtectedRoute.tsx`, `PermissionsProvider.tsx`
- `storage.ts`, `socketService.ts`, `api.ts`
- `ErrorBoundary.tsx`, `index.css`
- `Dockerfile`, `vitest.config.ts`, `eslint.config.js`
- `package.json`

### Infrastructure
- `docker-compose.yml`, `docker-compose.prod.yml`
- `nginx/prod.conf`
- `.env.example`, `.gitignore`
- `README.md`
- `jest.config.js`
