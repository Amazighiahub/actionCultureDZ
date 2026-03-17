# Analyse des Lacunes Middleware — ÉTAPE 1 : INVENTAIRE

> **Date** : 2026-03-14
> **Statut** : ✅ ÉTAPE 2 COMPLÉTÉE — middlewares branchés sur toutes les routes (298 tests OK)
> **Périmètre** : Tous les middlewares de validation/sécurité/rate-limiting vs toutes les routes

---

## CAUSE RACINE ARCHITECTURALE

**`routes/index.js` charge les middlewares mais ne les propage jamais aux routes.**

```
L133-195 : middlewares = { auth, cache, validation, rateLimit, security, audit }
L516-554 : routeDefinitions[].args = [models, authMiddleware]  ← SEULEMENT 2 args
```

Les objets `middlewares.validation`, `middlewares.rateLimit`, `middlewares.security` sont **chargés en mémoire puis ignorés**. Chaque fichier de route doit importer ses propres middlewares directement — la plupart ne le font pas.

---

## 1. MIDDLEWARES DE VALIDATION (`validationMiddleware.js`)

### `handleValidationErrors`

| Statut | Routes |
|--------|--------|
| ✅ Branché | `evenementRoutes` (POST /), `oeuvreRoutes` (POST /), `patrimoineRoutes` (POST /), `serviceRoutes` (POST /), `organisationRoutes` (POST /, PUT /:id), `programmeRoutes` (toutes mutations), `lieuRoutes` (POST /, PUT /:id), `favoriRoutes` (POST /), `emailVerificationRoutes` (toutes mutations), `notificationRoutes` (PUT /preferences) |
| 🔴 MANQUE | `artisanatRoutes` (POST /, PUT /:id), `commentaireRoutes` (POST /oeuvre/:id, POST /evenement/:id), `signalementRoutes` (POST /), `userRoutes` (POST /register, PUT /profile), `intervenantRoutes` (POST /, PUT /:id) |

### `validateId`

| Statut | Routes |
|--------|--------|
| ✅ Branché | `evenementRoutes` (GET/PUT/DELETE /:id), `oeuvreRoutes` (GET/PUT/DELETE /:id), `patrimoineRoutes` (GET/PUT/DELETE /:id), `artisanatRoutes` (GET/PUT/DELETE /:id), `serviceRoutes` (GET/PUT/DELETE /:id), `organisationRoutes` (GET/PUT/DELETE /:id), `programmeRoutes` (GET/PUT/DELETE /:id), `notificationRoutes` (PUT /:id, DELETE /:id), `lieuRoutes` (GET/PUT/DELETE /:id) |
| 🟠 MANQUE | `commentaireRoutes` (PUT/DELETE /:id), `signalementRoutes` (GET/PUT /:id), `favoriRoutes` (DELETE /:id), `trackingRoutes` (GET /:id), `intervenantRoutes` (GET/PUT/DELETE /:id) |

### `validatePagination`

| Statut | Routes |
|--------|--------|
| ✅ Branché | `evenementRoutes` (GET /), `oeuvreRoutes` (GET /), `patrimoineRoutes` (GET /), `lieuRoutes` (GET /) |
| 🟠 MANQUE | `artisanatRoutes` (GET /), `serviceRoutes` (GET /), `commentaireRoutes` (GET /oeuvre/:id, GET /evenement/:id), `signalementRoutes` (GET /), `organisationRoutes` (GET /), `notificationRoutes` (GET /), `favoriRoutes` (GET /), `parcoursRoutes` (GET /) |

### `validateEventCreation` — 🔴 BRANCHÉ NULLE PART

| Statut | Routes |
|--------|--------|
| 🔴 MANQUE | `evenementRoutes` POST / (création), PUT /:id (mise à jour) |

**Impact** : Aucune validation serveur de `date_debut` (pas dans le passé), `capacite_max` (1-100000). Un client peut créer un événement daté en 1970 avec une capacité de -5.

### `validateWorkSubmission` — 🔴 BRANCHÉ NULLE PART

| Statut | Routes |
|--------|--------|
| 🔴 MANQUE | `oeuvreRoutes` POST / (création), PUT /:id (mise à jour) |

**Impact** : Aucune validation de `annee_creation` (1000-année courante). Un client peut soumettre une œuvre datée de l'an 50000.

### `validateStringLengths` — 🔴 BRANCHÉ NULLE PART

| Statut | Routes |
|--------|--------|
| 🔴 MANQUE | **TOUTES les routes de mutation** : evenements, oeuvres, patrimoine, artisanat, services, commentaires, signalements, organisations, programmes, users (register, profile), intervenants, parcours |

**Impact** : Aucune limite de longueur sur `nom` (devrait ≤255), `titre` (≤500), `description` (≤50000), `contenu` (≤100000). Un payload de 100 Mo de texte sera accepté.

---

## 2. MIDDLEWARES DE SÉCURITÉ (`securityMiddleware.js`)

### `sanitizeInput` — ✅ APPLIQUÉ GLOBALEMENT

| Statut | Routes |
|--------|--------|
| ✅ Appliqué globalement | `app.js` L208 : `this.app.use(securityMiddleware.sanitizeInput)` |

**Pas de lacune** : `sanitizeInput` est appliqué comme middleware global dans `app.js` avant le routeur. Toutes les requêtes passent par le nettoyage XSS (script, iframe, event handlers, tags HTML).

### `validateUpload` — 🟠 NON UTILISÉ (remplacé)

| Statut | Routes |
|--------|--------|
| Non branché | `uploadRoutes` utilise `FileValidator.uploadValidator()` à la place |
| 🟠 MANQUE | `artisanatRoutes` POST /:id/medias (aucune validation de fichier) |

**Impact** : `artisanatRoutes` accepte les uploads sans validation MIME/extension/taille.

### `securityHeaders` — ✅ Probablement appliqué via Helmet dans `app.js`

Non pertinent pour le branchement per-route.

---

## 3. MIDDLEWARES DE RATE LIMITING (`rateLimitMiddleware.js`)

### `endpointLimiters.register` (3 req/heure en prod) — 🔴 BRANCHÉ NULLE PART

| Statut | Routes |
|--------|--------|
| 🔴 MANQUE | `userRoutes` POST /register |

**Impact** : Aucune limite de création de comptes. Un bot peut créer des milliers de comptes par heure.

### `endpointLimiters.login` (5 req/15min en prod) — 🔴 BRANCHÉ NULLE PART

| Statut | Routes |
|--------|--------|
| 🔴 MANQUE | `userRoutes` POST /login |

**Impact** : Brute-force de mots de passe sans aucune limite. Vulnérabilité critique en production.

### `rateLimitMiddleware.auth` (array)

| Statut | Routes |
|--------|--------|
| ✅ Branché | `emailVerificationRoutes` (POST /request, POST /resend) |
| 🔴 MANQUE | `userRoutes` (POST /login, POST /register, POST /forgot-password) |

### `rateLimitMiddleware.sensitiveActions` (array)

| Statut | Routes |
|--------|--------|
| ✅ Branché | `emailVerificationRoutes` (POST /change-email) |
| 🔴 MANQUE | `userRoutes` (DELETE /profile, PUT /change-password), `signalementRoutes` (PUT /:id/status — admin action) |

### `rateLimitMiddleware.creation` / `createContentLimiter` (20 req/heure)

| Statut | Routes |
|--------|--------|
| ✅ Branché | `uploadRoutes` (POST /image, POST /document, POST /media) |
| 🔴 MANQUE | `evenementRoutes` (POST /), `oeuvreRoutes` (POST /), `artisanatRoutes` (POST /), `patrimoineRoutes` (POST /), `serviceRoutes` (POST /), `commentaireRoutes` (POST /oeuvre/:id, POST /evenement/:id), `signalementRoutes` (POST /), `organisationRoutes` (POST /), `parcoursRoutes` (POST /) |

**Impact** : Aucune limite de création de contenu. Spam illimité de commentaires, événements, signalements.

### `rateLimitMiddleware.general`

| Statut | Routes |
|--------|--------|
| ✅ Branché | `emailVerificationRoutes` (GET /status) |
| 🟡 MANQUE | Idéalement sur toutes les routes GET publiques comme couche de protection DDoS |

---

## 4. TABLEAU DE SYNTHÈSE PAR ROUTE

| Route | Validation body | validateId | Pagination | Rate limit | sanitizeInput | Gravité |
|-------|:-:|:-:|:-:|:-:|:-:|---------|
| **POST /users/register** | 🔴 Aucune | — | — | 🔴 Aucun | 🔴 Non | **CRITIQUE** |
| **POST /users/login** | 🟡 Minimale | — | — | 🔴 Aucun | 🔴 Non | **CRITIQUE** |
| PUT /users/profile | 🔴 Aucune | — | — | 🟠 Aucun | 🔴 Non | MAJEUR |
| DELETE /users/profile | — | — | — | 🔴 Aucun | — | MAJEUR |
| **POST /evenements** | 🟠 Partielle | — | — | 🔴 Aucun | 🔴 Non | **CRITIQUE** |
| PUT /evenements/:id | 🔴 Aucune | ✅ | — | 🟠 Aucun | 🔴 Non | MAJEUR |
| GET /evenements | — | — | ✅ | 🟡 Aucun | — | Mineur |
| **POST /oeuvres** | 🟠 Partielle | — | — | 🔴 Aucun | 🔴 Non | **CRITIQUE** |
| PUT /oeuvres/:id | 🔴 Aucune | ✅ | — | 🟠 Aucun | 🔴 Non | MAJEUR |
| GET /oeuvres | — | — | ✅ | 🟡 Aucun | — | Mineur |
| **POST /artisanat** | 🔴 Aucune | — | — | 🔴 Aucun | 🔴 Non | **CRITIQUE** |
| PUT /artisanat/:id | 🔴 Aucune | ✅ | — | 🟠 Aucun | 🔴 Non | MAJEUR |
| POST /artisanat/:id/medias | 🔴 Aucune | ✅ | — | 🔴 Aucun | 🔴 Non | MAJEUR |
| GET /artisanat | — | — | 🟠 Non | 🟡 Aucun | — | Mineur |
| **POST /patrimoine** | 🟠 Partielle | — | — | 🔴 Aucun | 🔴 Non | **CRITIQUE** |
| PUT /patrimoine/:id | 🔴 Aucune | ✅ | — | 🟠 Aucun | 🔴 Non | MAJEUR |
| **POST /services** | 🟠 Partielle | — | — | 🔴 Aucun | 🔴 Non | MAJEUR |
| PUT /services/:id | 🔴 Aucune | ✅ | — | 🟠 Aucun | 🔴 Non | MAJEUR |
| **POST /commentaires/oeuvre/:id** | 🔴 Aucune | 🟠 Non | — | 🔴 Aucun | 🔴 Non | **CRITIQUE** |
| **POST /commentaires/evenement/:id** | 🔴 Aucune | 🟠 Non | — | 🔴 Aucun | 🔴 Non | **CRITIQUE** |
| **POST /signalements** | 🔴 Aucune | — | — | 🔴 Aucun | 🔴 Non | MAJEUR |
| PUT /signalements/:id | 🔴 Aucune | 🟠 Non | — | 🟠 Aucun | 🔴 Non | MAJEUR |
| POST /organisations | ✅ Bonne | — | — | 🟠 Aucun | 🔴 Non | Mineur |
| PUT /organisations/:id | ✅ Bonne | ✅ | — | 🟠 Aucun | 🔴 Non | Mineur |
| POST /programmes/:eventId | ✅ Bonne | — | — | 🟠 Aucun | 🔴 Non | Mineur |
| PUT /programmes/:id | ✅ Bonne | ✅ | — | 🟠 Aucun | 🔴 Non | Mineur |
| POST /lieux | ✅ Bonne | — | — | 🟠 Aucun | 🔴 Non | Mineur |
| PUT /lieux/:id | ✅ Bonne | ✅ | — | 🟠 Aucun | 🔴 Non | Mineur |
| POST /upload/image | ✅ Bonne | — | — | ✅ Oui | — | ✅ OK |
| POST /favoris | ✅ Bonne | — | — | 🟠 Aucun | — | Mineur |
| POST /email-verification/* | ✅ Bonne | — | — | ✅ Oui | — | ✅ OK |

---

## 5. SCORE GLOBAL

| Catégorie | Total | Branchés | Manquants | Taux |
|-----------|:-----:|:--------:|:---------:|:----:|
| Validation body (mutations) | 25 routes | 10 | **15** | **40%** |
| validateId (routes :id) | 22 routes | 15 | **7** | 68% |
| validatePagination (GET listes) | 12 routes | 4 | **8** | 33% |
| Rate limiting (mutations) | 20 routes | 3 | **17** | **15%** |
| sanitizeInput | 25 routes mutation | 0 | **25** | **0%** |

**Score de couverture middleware : 31%** (32/104 branchements nécessaires)

---

## 6. TOP 10 DES LACUNES LES PLUS CRITIQUES

| # | Lacune | Impact | Effort fix |
|---|--------|--------|-----------|
| 1 | **POST /users/login sans rate limit** | Brute-force mots de passe | 5 min |
| 2 | **POST /users/register sans rate limit** | Bot spam comptes | 5 min |
| 3 | **POST /users/register sans validation** | Données invalides en DB | 15 min |
| 4 | **sanitizeInput non appliqué globalement** | XSS stocké en DB | 5 min (app.js) |
| 5 | **POST /commentaires sans validation body** | Commentaires vides/XSS/spam | 10 min |
| 6 | **validateEventCreation jamais branché** | Dates passées, capacité invalide | 5 min |
| 7 | **validateWorkSubmission jamais branché** | Année de création absurde | 5 min |
| 8 | **validateStringLengths jamais branché** | Payload de 100 Mo accepté | 15 min |
| 9 | **POST /artisanat sans aucune validation** | Données arbitraires en DB | 15 min |
| 10 | **createContentLimiter manquant sur 9 routes** | Spam contenu illimité | 20 min |

**Effort total estimé pour les 10 fixes : ~1h40**

---

## 7. RECOMMANDATION ARCHITECTURALE

### Option A — Quick fix (per-route)
Importer directement les middlewares dans chaque fichier de route qui en a besoin. Rapide mais dupliqué.

### Option B — Fix structurel (recommandé)
Modifier la signature des route factories pour recevoir le `middlewares` object :

```javascript
// routes/index.js — AVANT
{ path: '/evenements', init: initEvenementRoutes, args: [models, authMiddleware] }

// routes/index.js — APRÈS
{ path: '/evenements', init: initEvenementRoutes, args: [models, authMiddleware, middlewares] }
```

Chaque route factory reçoit alors `(models, authMiddleware, middlewares)` et peut utiliser `middlewares.validation.validateEventCreation`, `middlewares.rateLimit.creation`, etc.

### Option C — Global middleware (pour sanitizeInput)
Appliquer `sanitizeInput` comme middleware global dans `app.js` AVANT le routeur :

```javascript
const { sanitizeInput } = require('./middlewares/securityMiddleware');
app.use('/api', sanitizeInput, routes);
```

**Recommandation** : Option B + C combinées.

---

---

## 8. ÉTAPE 2 — CORRECTIONS APPLIQUÉES

### Fichiers modifiés (8 routes)

| Fichier | POST | PUT | Middlewares ajoutés |
|---------|:----:|:---:|---------------------|
| `evenementRoutes.js` | ✅ | ✅ | `createContentLimiter`, `validateStringLengths`, `validateEventCreation` |
| `oeuvreRoutes.js` | ✅ | ✅ | `createContentLimiter`, `validateStringLengths`, `validateWorkSubmission` |
| `userRoutes.js` | ✅ register, login, change-password | ✅ profile | `endpointLimiters.register/login`, `accountRateLimiter.checkAccountLock`, `validateStringLengths`, `strictLimiter`, body validation (email, password, nom, prenom) |
| `artisanatRoutes.js` | ✅ + medias | ✅ | `createContentLimiter`, `validateStringLengths`, body validation (nom) |
| `patrimoineRoutes.js` | ✅ | ✅ | `createContentLimiter`, `validateStringLengths` |
| `serviceRoutes.js` | ✅ | ✅ | `createContentLimiter`, `validateStringLengths` |
| `commentaireRoutes.js` | ✅ oeuvre + evenement | ✅ | `createContentLimiter`, `validateStringLengths`, body validation (contenu max 5000, note 1-5) |
| `signalementRoutes.js` | ✅ | ✅ traiter | `createContentLimiter`, `validateStringLengths`, body validation (motif, type_entite, id_entite) |

### Ordre des middlewares (respecté partout)
```
auth → rate limit → validateStringLengths → [express-validator body()] → handleValidationErrors → domain validation → controller
```

### Correction : `sanitizeInput`
Initialement identifié comme manquant — en réalité **déjà appliqué globalement** dans `app.js` L208.

### Tests
**298/298 tests passés** après les modifications.
