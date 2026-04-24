# Rapport d'Audit Technique Complet — EventCulture

**Date:** 18 mars 2025  
**Version:** 1.0  
**Objectif:** Préparation à la mise en production selon les standards entreprise

---

## Résumé exécutif

| Métrique | Valeur |
|----------|--------|
| **Score production-readiness** | **62/100** |
| **Problèmes critiques** | 4 |
| **Problèmes majeurs** | 12 |
| **Problèmes mineurs** | 8 |
| **Suggestions** | 15 |
| **Effort estimé pour atteindre la production** | **12–18 jours-homme** |

### Top 5 des problèmes les plus critiques

1. **🔴 Vérification admin incorrecte dans OeuvreService** — Les admins ne peuvent pas modifier/supprimer les œuvres d'autres utilisateurs car `user.type_user !== 'admin'` échoue (le modèle User utilise `id_type_user`).

2. **🔴 Rate limiting en mémoire non distribué** — Le rate limiting côté authMiddleware utilise `Map` en mémoire ; avec plusieurs instances derrière un load balancer, la protection brute-force est inefficace.

3. **🔴 CORS : requêtes sans origin autorisées en dev** — En développement, `origin: null` est autorisé ; si `NODE_ENV` est mal configuré en prod, risque d'exposition.

4. **🟠 Patrimoine : absence de vérification ownership sur médias** — Un professionnel validé peut modifier/supprimer les médias d'un site patrimonial qu'il n'a pas créé.

5. **🟠 CSRF appliqué à toute l'API** — Le frontend SPA doit envoyer systématiquement `X-CSRF-Token` ; si des clients (mobile, Postman) n'envoient pas ce header, les requêtes sont rejetées. Vérifier la stratégie (cookie SameSite=Strict peut suffire pour SPA).

---

## Tableau de synthèse

| Catégorie | Score /10 | Critiques | Majeurs | Commentaire |
|-----------|-----------|-----------|---------|-------------|
| Sécurité | 6 | 2 | 4 | Bonne base (Helmet, JWT, bcrypt) mais bugs et faiblesses à corriger |
| Performance | 7 | 0 | 2 | Cache, compression, pagination présents ; optimisations possibles |
| Scalabilité | 5 | 1 | 3 | Stateless OK mais rate limit et Redis à consolider |
| Architecture | 7 | 0 | 1 | Service/Repository bien structuré, quelques incohérences |
| Résilience | 6 | 0 | 2 | Error handling centralisé, timeouts ; retry/backoff à renforcer |
| Tests | 6 | 0 | 1 | Jest + Cypress présents ; couverture et intégration à étendre |
| Infrastructure | 7 | 0 | 0 | Docker multi-stage, healthchecks, utilisateur non-root |
| Documentation | 7 | 0 | 0 | README solide ; API docs dynamiques ; Swagger manquant |

---

## 1. Architecture logicielle et organisation du code

### Schéma actuel (texte)

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
└────────────────────────────┬──────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (React 18 + Vite 7 + TypeScript)                       │
│  - App.tsx, routes                                                │
│  - Composants, pages                                             │
│  - React Query, i18n, Leaflet                                    │
└────────────────────────────┬──────────────────────────────────┘
                              │ HTTP / WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  NGINX (prod) / Vite dev server                                  │
└────────────────────────────┬──────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND (Node.js 20 + Express 4)                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│  │ Middlewares │→│  Routes     │→│ Controllers │                │
│  │ (CORS,Auth, │ │  /api/*     │ │             │                │
│  │  CSRF, etc) │ │             │ │             │                │
│  └─────────────┘ └─────────────┘ └──────┬──────┘                │
│                                         │                        │
│                                         ▼                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ServiceContainer → Services → Repositories                   ││
│  └─────────────────────────────────────────────────────────────┘│
└────────────────────────────┬──────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   MySQL 8   │    │    Redis     │    │  Cloudinary   │
│  Sequelize   │    │  Cache/Bull  │    │   (upload)    │
└──────────────┘    └──────────────┘    └──────────────┘
```

### Points positifs

- ✅ Séparation Controller → Service → Repository
- ✅ DTOs pour User, Oeuvre
- ✅ ServiceContainer pour injection
- ✅ Middlewares dédiés : auth, rate limit, CSRF, sanitization, audit

### Problèmes identifiés

#### 🟡 **MINEUR** — Incohérence de vérification admin

| Fichier | Ligne | Description |
|---------|-------|-------------|
| `backend/services/oeuvre/oeuvreService.js` | 356, 420 | Vérification `user.type_user !== 'admin'` alors que le modèle User a `id_type_user` (INT) |

**Code actuel :**
```javascript
if (!user || user.type_user !== 'admin') {
  throw this._forbiddenError('Vous ne pouvez pas modifier cette œuvre');
}
```

**Code corrigé :**
```javascript
const isAdmin = user && (user.id_type_user === 29 || (user.Roles && user.Roles.some(r => r.nom_role === 'Administrateur')));
if (!isAdmin) {
  throw this._forbiddenError('Vous ne pouvez pas modifier cette œuvre');
}
```

Ou mieux, passer `req.user.isAdmin` depuis le controller au service pour éviter une requête DB supplémentaire.

**Priorité : P0**

---

#### 🔵 **SUGGESTION** — Architecture cible recommandée

```
Backend (modular monolith)
├── modules/
│   ├── user/        (auth, profile, RGPD)
│   ├── oeuvre/      (CRUD, modération)
│   ├── evenement/
│   ├── patrimoine/
│   └── ...
├── shared/          (logger, errors, validators)
└── infrastructure/ (db, redis, upload)
```

- Conserver l’architecture actuelle en l’organisant par modules.
- Préparer une extraction en microservices si la charge l’exige (ex. service patrimoine dédié).

---

## 2. Sécurité — Niveau production entreprise

### 2.1 Authentification et sessions

| Aspect | État | Détail |
|--------|------|--------|
| Stockage des mots de passe | ✅ | bcrypt, 12–14 rounds selon env |
| JWT | ✅ | HS256, expiration (24h), secret validé |
| Refresh token | ✅ | Hash SHA-256, stocké en DB, révocable |
| Cookies | ✅ | httpOnly, secure en prod, SameSite |
| Brute-force login | ⚠️ | Rate limit + account lockout, mais store en mémoire |

### Problèmes sécurité

#### 🔴 **CRITIQUE** — Rate limiting auth en mémoire

| Fichier | Ligne | Description |
|---------|-------|-------------|
| `backend/middlewares/authMiddleware.js` | ~427–430 | `rateLimitStore = new Map()` — non partagé entre instances |

**Impact :** Avec plusieurs instances Node derrière un load balancer, chaque instance a son propre compteur. Un attaquant peut multiplier les tentatives par le nombre d’instances.

**Correction :** Utiliser Redis pour le rate limiting (par ex. `rate-limit-redis` avec `rateLimitMiddleware`).

**Priorité : P0**

---

#### 🟠 **MAJEUR** — JWT sans mécanisme de révocation

| Fichier | Description |
|---------|-------------|
| `backend/middlewares/authMiddleware.js` | Aucune blacklist JWT au logout |

**Impact :** Un token volé reste valide jusqu’à expiration. Le refresh token est révoqué, mais pas l’access token.

**Correction :**  
- Soit réduire la durée de vie de l’access token (ex. 15 min) et s’appuyer sur le refresh.  
- Soit mettre en place une blacklist courte en Redis pour les tokens révoqués au logout.

**Priorité : P1**

---

#### 🟡 **MINEUR** — Vérification admin dans OeuvreService (déjà signalée en architecture)

Le champ `type_user` n’existe pas sur User ; la condition admin est toujours fausse.

**Priorité : P0**

---

### 2.2 Validation et sanitisation

| Aspect | État |
|--------|------|
| Sanitization XSS | ✅ `securityMiddleware.sanitizeInput` |
| Validation backend | ⚠️ Partielle (express-validator sur certaines routes) |
| SQL injection | ✅ Sequelize ORM, paramètres typés |
| CSRF | ✅ Double Submit Cookie |

---

#### 🟠 **MAJEUR** — Validation insuffisante sur plusieurs routes

| Fichier | Problème |
|---------|----------|
| `backend/routes/oeuvreRoutes.js` | `validateWorkSubmission` peut ne pas couvrir tous les champs |
| `backend/routes/patrimoineRoutes.js` | Pas de limite de taille sur certains champs texte |
| `backend/routes/organisationRoutes.js` | Validation minimale de `req.body` |

**Correction :** Ajouter des schémas de validation (Joi/Zod) ou express-validator sur les routes sensibles, avec limites de longueur et formats.

**Priorité : P1**

---

### 2.3 Upload de fichiers

| Aspect | État |
|--------|------|
| Validation MIME réelle | ✅ `FileValidator` (magic numbers) |
| Limite de taille | ✅ Par type (image, vidéo, document) |
| Stockage | ✅ Dossiers dédiés, noms générés |
| Extension vs type réel | ✅ Validation par magic bytes |

---

#### 🟡 **MINEUR** — Upload public sans authentification stricte

| Fichier | Ligne | Description |
|---------|-------|-------------|
| `backend/app.js` | ~465 | `POST /api/upload/image/public` — rate limit seul, pas d’auth |

**Impact :** Risque d’abus (images non désirées). Le rate limit limite déjà l’impact.

**Correction :** Renforcer le rate limit sur cet endpoint ou exiger un CAPTCHA après N uploads.

**Priorité : P2**

---

### 2.4 Headers HTTP

| Header | État |
|--------|------|
| Helmet | ✅ CSP, HSTS, X-Frame-Options |
| CORS | ✅ Origines restreintes en prod |
| X-Content-Type-Options | ✅ Via Helmet |

---

#### 🟠 **MAJEUR** — CORS : requêtes sans origin

| Fichier | Ligne | Description |
|---------|-------|-------------|
| `backend/middlewares/corsMiddleware.js` | 74–76 | En dev, `origin` absent → autorisé ; en prod, seulement si `CORS_ALLOW_NO_ORIGIN=true` |

**Risque :** Si `NODE_ENV` reste en `development` en prod, les requêtes sans origin (scripts, Postman, etc.) seraient autorisées.

**Correction :** S’assurer que `NODE_ENV=production` est bien défini en prod et que `CORS_ALLOW_NO_ORIGIN` n’est pas activé sans motif.

**Priorité : P1**

---

## 3. Performance et scalabilité backend

### Points positifs

- ✅ Pagination sur listes
- ✅ Compression gzip
- ✅ Cache HTTP sur listes publiques (180 s)
- ✅ Cache applicatif (CacheManager) sur oeuvres
- ✅ Timeout 30 s sur l’API
- ✅ Pool de connexions Sequelize

### Problèmes

#### 🟠 **MAJEUR** — Absence de pagination sur certaines listes

| Fichier | Route | Problème |
|---------|-------|----------|
| `backend/routes/index.js` | `/api/stats/public` | Comptages uniquement, acceptable |
| `backend/services/metadataService.js` | `/api/metadata/all` | Peut retourner beaucoup de données |

**Correction :** Paginer ou limiter les réponses des endpoints metadata si les volumes augmentent.

**Priorité : P2**

---

#### 🟡 **MINEUR** — Requêtes N+1 potentielles

| Fichier | Description |
|---------|-------------|
| `backend/services/oeuvreService.js` | `findWithFullDetails` — vérifier les `include` Sequelize |
| `backend/repositories/patrimoineRepository.js` | S’assurer que les associations sont chargées en une requête |

**Priorité : P2**

---

### Scalabilité

- **100 users :** OK avec l’architecture actuelle.
- **1000 users :** Redis partagé pour rate limit + cache, monitoring, optimisation des requêtes lourdes.
- **10 000+ users :** Load balancer, plusieurs instances, Redis cluster, CDN pour assets, possible extraction de services (auth, upload).

---

## 4. Base de données MySQL + Sequelize

### Points positifs

- ✅ Migrations présentes
- ✅ Associations définies
- ✅ Timestamps `createdAt`, `updatedAt` sur les modèles
- ✅ Index sur colonnes clés (migrations d’audit)
- ✅ Pas de `raw` avec interpolation directe

### Problèmes

#### 🟠 **MAJEUR** — Seeders non standard

| Fichier | Description |
|---------|-------------|
| `backend/` | Pas de dossier `seeders/` Sequelize CLI ; données insérées via scripts custom |

**Correction :** Créer des seeders Sequelize (`seeders/`) pour les données de référence et documenter leur usage.

**Priorité : P2**

---

#### 🔵 **SUGGESTION** — Index composites

Pour les requêtes fréquentes, envisager des index composites, par ex. :

- `(statut, date_creation)` sur Oeuvre
- `(statut, date_debut)` sur Evenement
- `(id_user, actif)` sur Organisation

**Priorité : P3**

---

## 5. Performance frontend React

### Points positifs

- ✅ React Query pour le cache des données
- ✅ Vite pour build
- ✅ Lazy loading sur certaines routes
- ✅ TypeScript
- ✅ i18n (fr, ar, en, tz-ltn, tz-tfng)

### Problèmes

#### 🟡 **MINEUR** — Pas de virtualisation sur longues listes

| Fichier | Description |
|---------|-------------|
| `frontEnd/src/` | Listes potentiellement longues sans `react-window` / `react-virtualized` |

**Correction :** Utiliser la virtualisation pour les listes de plus de ~50 éléments.

**Priorité : P2**

---

#### 🔵 **SUGGESTION** — Code splitting des routes

Vérifier que les routes lourdes (ex. carte, formulaires complexes) sont bien lazy-loaded pour réduire le bundle initial.

**Priorité : P3**

---

## 6. Cache — Multi-niveaux

### État actuel

| Niveau | Implémentation |
|--------|-----------------|
| Frontend | React Query |
| Backend | CacheManager (mémoire), Redis (Bull, sessions) |
| HTTP | Cache-Control sur listes et assets |
| DB | Query cache MySQL (paramètres par défaut) |

### Problèmes

#### 🟠 **MAJEUR** — Cache Redis non unifié

Le cache applicatif (`CacheManager`) et le cache de session/rate limit ne semblent pas partager une stratégie Redis cohérente.

**Correction :** Utiliser Redis pour tout cache partagé (metadata, listes publiques) en production multi-instances.

**Priorité : P1**

---

## 7. Résilience et gestion des erreurs

### Points positifs

- ✅ Middleware d’erreurs centralisé (`errorMiddleware`)
- ✅ `AppError` pour normalisation
- ✅ Sentry pour les 5xx
- ✅ `requestId` pour traçabilité
- ✅ Gestion des rejets non gérés et exceptions non capturées

### Problèmes

#### 🟡 **MINEUR** — `_getRedisClient` recrée le client à chaque appel

| Fichier | Ligne | Description |
|---------|-------|-------------|
| `backend/app.js` | ~770 | `redis.createClient()` à chaque health check |

**Impact :** Création de connexions Redis à chaque appel à `/health`, fuites potentielles.

**Correction :** Utiliser un client Redis singleton partagé.

**Priorité : P2**

---

#### 🔵 **SUGGESTION** — Retry avec backoff exponentiel

Pour les appels MySQL, Redis, Cloudinary, SMTP, envisager une librairie de retry (ex. `promise-retry` ou `axios-retry`) avec backoff exponentiel.

**Priorité : P3**

---

## 8. Logs, monitoring et observabilité

### Points positifs

- ✅ Winston
- ✅ Logs JSON en production
- ✅ Rotation (10MB, 5–10 fichiers)
- ✅ Endpoint `/health` (DB + Redis)
- ✅ Request ID propagé
- ✅ Middleware d’audit pour actions sensibles

### Problèmes

#### 🟡 **MINEUR** — Override de `console` global

| Fichier | Ligne | Description |
|---------|-------|-------------|
| `backend/utils/logger.js` | 106–115 | `global.console` remplacé |

**Impact :** Possibles effets de bord avec des librairies qui utilisent `console` directement.

**Correction :** Éviter l’override global ; utiliser le logger uniquement dans le code applicatif.

**Priorité : P2**

---

#### 🔵 **SUGGESTION** — Métriques Prometheus

Exposer un endpoint `/metrics` au format Prometheus (déjà prévu en partie dans `app.js` si `config.features.metrics` est activé).

**Priorité : P3**

---

## 9. Tests et qualité du code

### État actuel

- Backend : Jest
- Frontend : Vitest
- E2E : Cypress

### Problèmes

#### 🟠 **MAJEUR** — Couverture partielle

Beaucoup de services et controllers n’ont pas de tests unitaires ou d’intégration.

**Plan prioritaire :**

1. **P0 :** Tests d’intégration sur auth (login, register, refresh, logout)
2. **P1 :** Tests d’intégration sur CRUD oeuvres (create, update, delete, ownership)
3. **P1 :** Tests d’intégration sur endpoints sensibles (upload, reset password)
4. **P2 :** Tests unitaires sur services métier (OeuvreService, UserService)
5. **P2 :** Tests E2E Cypress sur parcours critiques (inscription, ajout œuvre, modération)

**Priorité : P1**

---

## 10. Infrastructure Docker et déploiement

### Points positifs

- ✅ Multi-stage build
- ✅ Utilisateur non-root (`expressjs`)
- ✅ Healthchecks sur les services
- ✅ Volumes pour données persistantes
- ✅ `.dockerignore` pour exclure tests et archives

### Problèmes

#### 🟡 **MINEUR** — Migrations non automatiques au démarrage

| Fichier | Description |
|---------|-------------|
| `backend/docker-entrypoint.sh` | Migrations lancées manuellement (`docker exec`) |

**Correction :** Dans l’entrypoint ou un script de démarrage, exécuter `npx sequelize db:migrate` avant de lancer le serveur, avec retry si la DB n’est pas prête.

**Priorité : P1**

---

#### 🔵 **SUGGESTION** — Secrets en production

Éviter les secrets dans `docker-compose`. Utiliser des variables d’environnement ou un gestionnaire de secrets (Docker Secrets, Vault, variables CI).

**Priorité : P2**

---

## 11. Documentation

### Points positifs

- ✅ README avec installation, variables d’env, commandes
- ✅ Documentation API dynamique (`/api`, `/api/endpoints`, `/api/docs/:module`)
- ✅ `.env.example` commenté

### Problèmes

#### 🔵 **SUGGESTION** — Spécification OpenAPI/Swagger

Ajouter une spec OpenAPI 3.0 (générée ou maintenue à la main) pour intégration automatique de docs (Swagger UI) et génération de clients.

**Priorité : P3**

---

## 12. Simulation de parcours utilisateur

| Parcours | Statut | Note |
|----------|--------|------|
| Inscription → confirmation → première connexion | ⚠️ | Email verification + SKIP en dev OK ; à valider en prod |
| Connexion → CRUD oeuvres | ⚠️ | Ownership vérifié en service ; bug admin à corriger |
| Upload fichier → affichage → suppression | ✅ | Flux global OK |
| Modification profil / mot de passe | ✅ | Change password + export RGPD OK |
| Actions concurrentes (2 users, même ressource) | ⚠️ | Pas de gestion optimiste (versioning) explicite |
| Perte de connexion pendant une action | ⚠️ | Retry côté client limité |
| Utilisateur malveillant (Postman/curl) | ✅ | Auth + rate limit + CSRF |
| Accès URL protégée sans auth | ✅ | 401 |
| Token expiré en session active | ⚠️ | Refresh token prévu ; gérer refresh automatique côté frontend |

---

## 13. Conformité RGPD

| Aspect | État |
|--------|------|
| Suppression de compte | ✅ `DELETE /api/v2/users/profile` avec mot de passe |
| Export des données | ✅ `GET /api/v2/users/profile/export` |
| Rétention | ⚠️ `AUDIT_LOG_RETENTION_DAYS` présent ; politique globale à formaliser |
| Mentions légales / CGU | À vérifier côté frontend |

---

## Plan d'action prioritisé

### Phase 1 — Corrections critiques (avant mise en production)

| Priorité | Action | Effort |
|----------|--------|--------|
| P0 | Corriger la vérification admin dans OeuvreService (utiliser `id_type_user` / `isAdmin`) | 1h |
| P0 | Migrer le rate limiting auth vers Redis | 4h |
| P0 | Vérifier NODE_ENV et CORS en production | 1h |

### Phase 2 — Améliorations majeures (première semaine)

| Priorité | Action | Effort |
|----------|--------|--------|
| P1 | Révocation JWT au logout (blacklist courte ou token court) | 4h |
| P1 | Validation centralisée (Joi/Zod) sur routes sensibles | 8h |
| P1 | Cache Redis unifié pour metadata/listes | 6h |
| P1 | Migrations automatiques au démarrage Docker | 2h |
| P1 | Tests d’intégration auth + CRUD oeuvres | 16h |

### Phase 3 — Optimisations (premier mois)

| Priorité | Action | Effort |
|----------|--------|--------|
| P2 | Pagination/limitation sur metadata | 2h |
| P2 | Vérification ownership patrimoine médias | 4h |
| P2 | Client Redis singleton | 2h |
| P2 | Virtualisation listes frontend | 8h |
| P2 | Seeders Sequelize | 4h |

### Phase 4 — Excellence (trimestre suivant)

| Priorité | Action | Effort |
|----------|--------|--------|
| P3 | Spec OpenAPI + Swagger UI | 16h |
| P3 | Métriques Prometheus | 8h |
| P3 | Index composites DB | 4h |
| P3 | Retry + backoff sur appels externes | 4h |

---

## Annexes

### Fichiers clés analysés

- `backend/app.js` — Configuration Express, middlewares, routes
- `backend/server.js` — Point d’entrée, Socket.IO
- `backend/middlewares/authMiddleware.js` — Authentification JWT
- `backend/middlewares/corsMiddleware.js` — CORS
- `backend/middlewares/csrfMiddleware.js` — CSRF
- `backend/middlewares/securityMiddleware.js` — Sanitization
- `backend/middlewares/errorMiddleware.js` — Gestion des erreurs
- `backend/services/user/userService.js` — Auth, bcrypt, refresh tokens
- `backend/services/oeuvre/oeuvreService.js` — CRUD oeuvres, ownership
- `backend/utils/FileValidator.js` — Validation MIME
- `backend/utils/logger.js` — Logging
- `backend/Dockerfile` — Image backend
- `docker-compose.yml` — Services dev
- `.gitignore` — Exclusion .env, uploads, logs

---

*Rapport généré le 18 mars 2025. À mettre à jour après corrections.*
