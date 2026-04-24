# 🔍 Audit Performance Backend — Action Culture

**Date** : Mars 2026  
**Scope** : Backend Node.js/Express + Sequelize/MySQL + Redis  
**Méthodologie** : Analyse statique complète du code source

---

## TABLE DES MATIÈRES

1. [Résumé Exécutif](#1-résumé-exécutif)
2. [Endpoints API](#2-endpoints-api)
3. [Concurrence](#3-concurrence)
4. [Mémoire](#4-mémoire)
5. [Scalabilité](#5-scalabilité)
6. [Cache](#6-cache)
7. [Problèmes Détaillés avec Code Corrigé](#7-problèmes-détaillés)
8. [Plan de Montée en Charge](#8-plan-de-montée-en-charge)

---

## 1. RÉSUMÉ EXÉCUTIF

| Catégorie | 🔴 Critique | 🟠 Important | 🟡 Moyen | 🔵 Info |
|-----------|------------|-------------|---------|---------|
| Endpoints | 2 | 4 | 3 | 2 |
| Concurrence | 1 | 2 | 2 | 1 |
| Mémoire | 1 | 2 | 1 | 1 |
| Scalabilité | 1 | 2 | 1 | 0 |
| Cache | 0 | 3 | 2 | 1 |
| **Total** | **5** | **13** | **9** | **5** |

**Score global : 6/10** — L'architecture est saine (Repository Pattern, BaseController, logger centralisé) mais il manque des optimisations critiques pour la production à grande échelle.

---

## 2. ENDPOINTS API

### 2.1 Estimation des temps de réponse

| Endpoint | Méthode | Temps estimé | Charge | Notes |
|----------|---------|-------------|--------|-------|
| `GET /api/stats/public` | GET | 80-200ms | 🟡 | 5 COUNT parallèles sans cache |
| `GET /api/oeuvres` | GET | 50-150ms | 🟢 | Paginé, includes légers |
| `GET /api/oeuvres/:id` | GET | 100-500ms | 🟠 | `findWithFullDetails` = 10+ LEFT JOIN |
| `GET /api/evenements` | GET | 50-150ms | 🟢 | Paginé |
| `GET /api/evenements/:id` | GET | 100-400ms | 🟠 | Deep join Lieu→Commune→Daira→Wilaya + Programmes + Medias |
| `GET /api/patrimoine/sites` | GET | 50-200ms | 🟢 | Paginé |
| `GET /api/patrimoine/sites/:id` | GET | 100-400ms | 🟠 | Includes profonds |
| `GET /api/lieux/search` | GET | 200-2000ms | 🔴 | Haversine en SQL = full scan sans index spatial |
| `GET /api/metadata/all` | GET | 30-100ms | 🟢 | Cacheable, 9 requêtes parallèles |
| `GET /api/metadata/wilayas?includeDairas&includeCommunes` | GET | 200-800ms | 🟠 | 58 wilayas × dairas × communes = gros payload |
| `GET /api/search/global` | GET | 200-1000ms | 🟠 | 4 LIKE %query% parallèles sans index FULLTEXT |
| `GET /api/dashboard/overview` | GET | 200-500ms | 🟡 | 10 COUNT parallèles |
| `GET /api/dashboard/detailed/:period` | GET | 300-800ms | 🟠 | Subqueries dans SELECT |
| `GET /sitemap.xml` | GET | 500-3000ms | 🔴 | 5 findAll sans limit effectif (SITEMAP_LIMIT=50000) |
| `POST /api/users/login` | POST | 100-300ms | 🟡 | bcrypt (CPU-bound) + DB |
| `POST /api/upload/image` | POST | 200-5000ms | 🟡 | Dépend de Cloudinary |
| Auth middleware (chaque requête) | - | 10-50ms | 🟡 | 1 requête DB + Redis par requête |

### 2.2 Endpoints trop lourds

#### 🔴 P1 — `oeuvreRepository.findWithFullDetails()` : 10+ LEFT JOIN en une requête

**Fichier** : `repositories/oeuvreRepository.js:191-247`  
**Impact** : Temps de réponse > 500ms sur tables volumineuses, lock read étendu

L'endpoint charge : User (Saiseur), TypeOeuvre, Langue, Media, Tags, Users (intervenants), Categories, OeuvreIntervenant→Intervenant→TypeUser, Livre, OeuvreArt, Article, ArticleScientifique, Film, AlbumMusical — tout en un seul findByPk.

#### 🔴 P2 — Recherche géographique Haversine sans index spatial

**Fichier** : `services/lieuService.js:499-526`  
**Impact** : Full table scan sur chaque requête géo

### 2.3 Endpoints sans pagination sur listes qui grandissent

#### 🟠 P3 — `userRepository.findArtisansByWilaya()` — pas de limit

```
// repositories/userRepository.js:407-415
return this.model.findAll({
  where: {
    wilaya_residence: parseInt(wilayaId),
    id_type_user: { [Op.ne]: 1 }
  },
  // ⚠️ Pas de limit ni pagination
});
```

#### 🟠 P4 — `evenementRepository.getPendingProfessionals()` — pas de limit

```
// repositories/evenementRepository.js:322-337
return this.models.EvenementUser.findAll({
  where: { id_evenement: evenementId, statut_participation: 'en_attente' },
  // ⚠️ Pas de limit
});
```

#### 🟠 P5 — Sitemap charge jusqu'à 50 000 × 5 = 250 000 lignes

```
// routes/sitemapRoutes.js:47-80
const SITEMAP_LIMIT = 50000; // × 5 tables = 250K lignes potentielles
```

### 2.4 Opérations synchrones bloquantes

#### 🟡 P6 — `articleBlockController.getMulterConfig()` : `existsSync` + `mkdirSync`

**Fichier** : `controllers/articleBlockController.js:296-303`

```js
// ❌ BLOQUANT — exécuté dans le handler multer (event loop)
const fsSync = require('fs');
if (!fsSync.existsSync(uploadDir)) {
  fsSync.mkdirSync(uploadDir, { recursive: true });
}
```

### 2.5 Over-fetching de données

#### 🟡 P7 — `searchService.globalSearch()` : LIKE %query% sur colonnes JSON

**Fichier** : `services/searchService.js:20-88`  
Les colonnes `titre`, `description`, `nom` sont des JSON multilingues. Un `LIKE %query%` sur JSON = scan complet sans aucune possibilité d'index.

---

## 3. CONCURRENCE

### 3.1 Pool de connexions BDD

**Fichier** : `config/database.js:88-150`

| Env | max | min | acquire | idle |
|-----|-----|-----|---------|------|
| dev | 10 | 2 | 30s | 10s |
| prod | 50 | 10 | 30s | 30s |

#### 🟡 P8 — Pool prod potentiellement sur-dimensionné

50 connexions max avec un seul process Node = correct. Mais en mode cluster PM2 (4 workers), ça fait 4 × 50 = 200 connexions MySQL. La plupart des MySQL ont `max_connections = 151` par défaut.

**Recommandation** : `DB_POOL_MAX = Math.ceil(max_connections / nb_workers) - 5`

### 3.2 Opérations bloquant l'event loop

#### 🟠 P9 — `bcrypt` dans le login est CPU-bound

Le hashage bcrypt bloque l'event loop pendant ~100-300ms par login. Sous forte charge de logins simultanés, toutes les autres requêtes sont ralenties.

#### 🟠 P10 — `crypto.randomBytes(16)` par requête pour le nonce CSP

**Fichier** : `app.js:118`

```js
this.app.use((req, res, next) => {
  const nonce = crypto.randomBytes(16).toString('base64');
  // ...
});
```

`crypto.randomBytes` est synchrone et bloque l'event loop. Sur une API pure (pas de HTML SSR), le nonce CSP est inutile.

### 3.3 Race conditions

#### 🔴 P11 — `incrementViews` sans protection contre les doublons

**Fichier** : `repositories/oeuvreRepository.js:252-257`

```js
async incrementViews(oeuvreId) {
  return this.model.increment('nb_vues', { by: 1, where: { id_oeuvre: oeuvreId } });
}
```

`increment` est atomique en SQL (ok), mais 100 requêtes simultanées génèrent 100 UPDATE séquentiels sur la même ligne = lock contention. Les vues devraient être bufferisées (Redis INCR puis flush périodique).

#### 🟡 P12 — `reorderOeuvres` : boucle de UPDATE dans une transaction

**Fichier** : `repositories/evenementRepository.js:443-466`

```js
async reorderOeuvres(evenementId, userId, oeuvres) {
  return this.withTransaction(async (transaction) => {
    for (const item of oeuvres) {
      await this.models.EvenementOeuvre.update(/* ... */, { transaction });
    }
  });
}
```

N UPDATEs séquentiels dans une transaction = verrou maintenu longtemps. Préférer un seul `CASE WHEN` SQL.

---

## 4. MÉMOIRE

### 4.1 Fuites potentielles

#### 🔴 P13 — `models/index.js` require cycle + singletons controllers

**Fichier** : `models/index.js:6`

```js
const originalModule = require('./index-original');
```

Chaque `require('./models')` (dans app.js, dans les routes, dans les services) pointe vers le même module caché, mais la chaîne `models/index.js → index-original → loadModels` garde des références globales aux models. Ce n'est pas une fuite à proprement parler, mais les controllers étant des **singletons** (`module.exports = new XxxController()`), ils persistent en mémoire pour toute la durée de vie du process — c'est normal mais critique à savoir si un controller accumule de l'état.

#### 🟠 P14 — `LRUCache` dans `cacheMiddleware` + `DashboardStatsService` = double cache

**Fichiers** : `middlewares/cacheMiddleware.js:50`, `services/dashboard/statsService.js:14`

Deux LRUCache indépendants en mémoire (500 + 200 entrées). Les stats du dashboard sont cachées dans le service ET potentiellement dans le middleware cache — invalidation incohérente.

#### 🟠 P15 — `Socket.IO` : pas de nettoyage des rooms vides

**Fichier** : `server.js:65-92`

```js
socket.on('join_room', (room) => {
  // Pas de vérification si la room existe ou de limite
  socket.join(room);
});
```

Un utilisateur malveillant peut créer des milliers de rooms uniques → fuite mémoire Socket.IO.

### 4.2 Buffers et uploads

#### 🟡 P16 — Upload via multer : fichier en buffer mémoire possible

Multer utilise `diskStorage` pour les articles (ok), mais vérifie avec Cloudinary pour les autres uploads. Si Cloudinary est configuré avec `multer-storage-cloudinary`, le fichier est streamé directement. Sinon, multer par défaut (`memoryStorage`) charge le fichier entier en RAM.

**Vérifier** que toutes les routes d'upload utilisent `diskStorage` ou `cloudinaryStorage`, jamais `memoryStorage` pour les fichiers > 1 MB.

---

## 5. SCALABILITÉ

### 5.1 Stateless ?

#### 🔴 P17 — LRU Cache en mémoire = pas partagé entre instances

**Fichiers** : `middlewares/cacheMiddleware.js:50`, `services/dashboard/statsService.js:14`, `services/metadataService.js:15`

En multi-instances (PM2 cluster, Docker), chaque worker a son propre LRU cache. Résultat :
- Cache froid après chaque redémarrage de worker
- Invalidation incohérente entre instances
- Mémoire multipliée par le nombre de workers

Le `cacheMiddleware` fait déjà Redis+LRU, mais `statsService` et `metadataService` utilisent des LRU purs sans Redis.

#### 🟠 P18 — Fichiers uploadés stockés localement

**Fichier** : `app.js:242`

```js
this.app.use('/uploads', express.static(path.join(__dirname, 'uploads'), staticOptions));
```

Les fichiers `uploads/` sont sur le disque local. En multi-instances, un fichier uploadé sur l'instance A n'est pas accessible depuis l'instance B.

**Solutions** : Cloudinary (déjà partiellement en place), S3, ou volume partagé NFS.

#### 🟠 P19 — `CronService` avec `CronLock` distribué — bien implémenté ✅

Le `CronLock` via Sequelize (advisory lock) évite la double exécution en multi-instances. C'est correct. Cependant, les cron jobs génèrent de la charge I/O qui devrait être sur un worker dédié en production.

### 5.2 Sessions

L'authentification est **stateless** (JWT) — ✅ pas de sessions en mémoire. Le JWT blacklist est dans Redis — ✅ partagé entre instances.

---

## 6. CACHE

### 6.1 État actuel

| Donnée | Cachée ? | Où ? | TTL |
|--------|---------|------|-----|
| Metadata (langues, types, wilayas) | ✅ | LRU in-process | 10 min |
| Dashboard stats | ✅ | LRU in-process | 5 min |
| Réponses API GET | ✅ | Redis + LRU | 1-5 min |
| Auth (getUserWithRoles) | ❌ | Aucun | - |
| Stats publiques (`/stats/public`) | ❌ | Aucun | - |
| Sitemap | ✅ | HTTP Cache-Control | 1h |
| Détail oeuvre (`findWithFullDetails`) | ❌ | Aucun | - |

### 6.2 Données à cacher en priorité

#### 🟠 P20 — `getUserWithRoles` appelé sur CHAQUE requête authentifiée

**Fichier** : `middlewares/authMiddleware.js:218`

```js
const user = await getUserWithRoles(decoded.userId || decoded.id || decoded.id_user);
```

C'est **la requête la plus exécutée** du système. Chaque requête authentifiée fait un `findByPk` avec include Roles + Organisations. Avec 1000 req/s, ça fait 1000 requêtes DB/s juste pour l'auth.

#### 🟠 P21 — `/api/stats/public` sans cache

**Fichier** : `controllers/statsController.js:17-47`

5 requêtes COUNT à chaque visite de la page d'accueil. Ces stats changent rarement.

#### 🟠 P22 — Détail oeuvre/événement/patrimoine sans cache

Les pages détail sont les plus consultées (SEO + partage) et font les plus grosses requêtes (10+ JOIN). Zero cache.

### 6.3 Stratégie Redis recommandée

| Clé Redis | TTL | Invalidation | Données |
|-----------|-----|-------------|---------|
| `user:session:{userId}` | 15 min | Login/logout/changement rôle | User + Roles + flags |
| `stats:public` | 5 min | Création oeuvre/event | 5 COUNT |
| `oeuvre:detail:{id}` | 10 min | Update oeuvre | findWithFullDetails |
| `event:detail:{id}` | 5 min | Update event | findWithFullDetails |
| `lieu:detail:{id}` | 15 min | Update lieu | Full includes |
| `metadata:all` | 30 min | Admin update metadata | 9 tables ref |
| `metadata:wilayas:full` | 24h | Jamais (données fixes) | 58 wilayas + dairas + communes |
| `search:{hash(query)}` | 2 min | Aucune (expire) | Résultats recherche |
| `views:buffer:{entityType}:{id}` | - | Flush toutes les 30s | INCR atomique |
| `sitemap:xml` | 1h | Création/update entité | XML complet |

**Stratégie d'invalidation** : Event-driven avec pattern `cache:invalidate:{entity}:{id}` publié via Redis PUB/SUB après chaque mutation.

---

## 7. PROBLÈMES DÉTAILLÉS AVEC CODE CORRIGÉ

### 🔴 P1 — findWithFullDetails : 10+ JOIN → Diviser en 2 requêtes

**Fichier** : `repositories/oeuvreRepository.js`  
**Impact** : -60% temps de réponse sur les pages détail  
**Sévérité** : 🔴 Critique

```js
// ✅ CORRIGÉ : 2 requêtes légères au lieu d'1 requête monstre
async findWithFullDetails(oeuvreId) {
  // Requête 1 : données essentielles (rapide)
  const oeuvre = await this.findById(oeuvreId, {
    include: [
      ...this.getDefaultIncludes(), // User, TypeOeuvre, Langue, Media
      {
        model: this.models.TagMotCle, as: 'Tags',
        attributes: ['id_tag', 'nom'],
        through: { attributes: [] }
      }
    ]
  });

  if (!oeuvre) return null;

  // Requête 2 : données secondaires (lazy, en parallèle)
  const [intervenants, subtype] = await Promise.all([
    this.models.OeuvreIntervenant?.findAll({
      where: { id_oeuvre: oeuvreId },
      include: [
        { model: this.models.Intervenant, as: 'Intervenant', attributes: ['id_intervenant', 'nom', 'prenom', 'specialites'], required: false },
        { model: this.models.TypeUser, as: 'TypeUser', attributes: ['id_type_user', 'nom_type'], required: false }
      ],
      order: [['ordre', 'ASC']]
    }) || [],
    this._findSubtype(oeuvreId, oeuvre.id_type_oeuvre)
  ]);

  // Attacher les résultats
  const result = oeuvre.get({ plain: true });
  result.intervenants = intervenants;
  if (subtype) result.subtype = subtype;
  return result;
}

// Helper : charge le sous-type spécifique
async _findSubtype(oeuvreId, typeId) {
  const subtypeMap = {
    1: 'Livre', 2: 'OeuvreArt', 3: 'Film',
    4: 'Article', 5: 'ArticleScientifique', 6: 'AlbumMusical'
  };
  const modelName = subtypeMap[typeId];
  if (!modelName || !this.models[modelName]) return null;
  return this.models[modelName].findOne({ where: { id_oeuvre: oeuvreId } });
}
```

---

### 🔴 P2 — Recherche géo Haversine → Index spatial

**Fichier** : `services/lieuService.js`  
**Impact** : -95% temps de réponse sur recherche géo  
**Sévérité** : 🔴 Critique

```sql
-- Migration : ajouter un index spatial
ALTER TABLE lieu ADD SPATIAL INDEX idx_lieu_coords (point);
-- Ou si pas de colonne POINT :
ALTER TABLE lieu ADD INDEX idx_lieu_lat_lng (latitude, longitude);
```

```js
// ✅ CORRIGÉ : pré-filtrer par bounding box AVANT Haversine
async searchLieux({ lat, lng, radius, ...rest }) {
  if (radius && lat && lng) {
    const safeLat = parseFloat(lat);
    const safeLng = parseFloat(lng);
    const safeRadius = Math.min(parseFloat(radius), 500);

    // Bounding box rapide (utilise l'index)
    const latDelta = safeRadius / 111;
    const lngDelta = safeRadius / (111 * Math.cos(safeLat * Math.PI / 180));

    where.latitude = { [Op.between]: [safeLat - latDelta, safeLat + latDelta] };
    where.longitude = { [Op.between]: [safeLng - lngDelta, safeLng + lngDelta] };

    // PUIS Haversine en HAVING pour précision (sur le subset filtré)
    // ...
  }
}
```

---

### 🔴 P11 — incrementViews → Buffer Redis

**Impact** : Élimine le lock contention sur les pages les plus consultées  
**Sévérité** : 🔴 Critique

```js
// ✅ CORRIGÉ : Buffer les vues dans Redis, flush en batch
// utils/viewCounter.js
const { getClient } = require('./redisClient');
const logger = require('./logger');

class ViewCounter {
  constructor() {
    this.localBuffer = new Map(); // fallback si pas de Redis
    this.flushInterval = setInterval(() => this.flush(), 30000); // 30s
    if (this.flushInterval.unref) this.flushInterval.unref();
  }

  async increment(entityType, entityId) {
    const redis = getClient();
    const key = `views:${entityType}:${entityId}`;

    if (redis) {
      try {
        await redis.incr(key);
        return;
      } catch (e) { /* fallback */ }
    }

    // Fallback mémoire
    const count = this.localBuffer.get(key) || 0;
    this.localBuffer.set(key, count + 1);
  }

  async flush() {
    const redis = getClient();
    const entries = redis
      ? await this._getRedisEntries(redis)
      : Array.from(this.localBuffer.entries());

    if (entries.length === 0) return;

    // Batch UPDATE avec CASE WHEN (1 seule requête)
    // GROUP par entityType pour faire un UPDATE par table
    const byType = new Map();
    for (const [key, count] of entries) {
      const [, type, id] = key.split(':');
      if (!byType.has(type)) byType.set(type, []);
      byType.get(type).push({ id: parseInt(id), count: parseInt(count) });
    }

    for (const [type, items] of byType) {
      const Model = this._getModel(type);
      if (!Model) continue;

      const cases = items.map(i => `WHEN ${i.id} THEN nb_vues + ${i.count}`).join(' ');
      const ids = items.map(i => i.id).join(',');
      const pk = this._getPK(type);

      await Model.sequelize.query(
        `UPDATE ${Model.tableName} SET nb_vues = CASE ${pk} ${cases} END WHERE ${pk} IN (${ids})`,
        { type: 'UPDATE' }
      );
    }

    // Nettoyer
    if (redis) {
      for (const [key] of entries) await redis.del(key);
    } else {
      this.localBuffer.clear();
    }
  }
}

module.exports = new ViewCounter();
```

---

### 🟠 P20 — Auth : cacher getUserWithRoles dans Redis

**Fichier** : `middlewares/authMiddleware.js`  
**Impact** : -1 requête DB par requête authentifiée (le plus gros quick-win)  
**Sévérité** : 🟠 Important

```js
// ✅ CORRIGÉ : cache Redis 15 min pour getUserWithRoles
const getUserWithRoles = async (userId) => {
  // 1. Check Redis cache
  const redis = getRedisClient();
  if (redis) {
    try {
      const cached = await redis.get(`user:session:${userId}`);
      if (cached) {
        const user = JSON.parse(cached);
        // Re-attacher les helpers
        user.roleNames = user.roleNames || [];
        user.isAdmin = user.roleNames.includes('Administrateur') || user.id_type_user === 29;
        user.isProfessionnel = user.roleNames.includes('Professionnel') || (user.id_type_user > 1 && user.id_type_user < 29);
        user.isProfessionnelValide = user.isProfessionnel && user.statut === 'actif';
        return user;
      }
    } catch (e) { /* fallback DB */ }
  }

  // 2. DB query (existant)
  const user = await User.findByPk(userId, queryOptions);
  if (!user) return null;

  // ... (helpers existants)

  // 3. Mettre en cache
  if (redis && user) {
    try {
      const cacheData = {
        id_user: user.id_user,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        photo_url: user.photo_url,
        id_type_user: user.id_type_user,
        statut: user.statut,
        email_verifie: user.email_verifie,
        password_changed_at: user.password_changed_at,
        roleNames: user.roleNames,
        Organisations: user.Organisations?.map(o => ({ id: o.id_organisation, nom: o.nom })) || []
      };
      await redis.setEx(`user:session:${userId}`, 900, JSON.stringify(cacheData)); // 15 min
    } catch (e) { /* non-blocking */ }
  }

  return user;
};

// ⚠️ IMPORTANT : Invalider sur login, logout, changement de rôle, changement de password
// Dans userService.login/logout/changePassword/updateRole :
// await redis.del(`user:session:${userId}`);
```

---

### 🟠 P21 — Stats publiques : ajouter cache

**Fichier** : `controllers/statsController.js`  
**Impact** : -5 requêtes COUNT par visite page d'accueil  

```js
// ✅ CORRIGÉ : cache 5 min
async getPublicStats(req, res) {
  try {
    const cacheMiddleware = require('../middlewares/cacheMiddleware');
    const cacheKey = 'stats:public';

    // Check cache
    const cached = await cacheMiddleware.store?.get?.(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    // ... (requêtes existantes inchangées)

    const response = { success: true, data: { /* ... */ }, cached: false, timestamp: new Date().toISOString() };

    // Set cache 5 min
    await cacheMiddleware.store?.set?.(cacheKey, response, 300);

    res.json(response);
  } catch (error) {
    this._handleError(res, error);
  }
}
```

---

### 🟡 P6 — articleBlockController : remplacer Sync par async

**Fichier** : `controllers/articleBlockController.js:294-304`

```js
// ✅ CORRIGÉ : version async
static getMulterConfig() {
  const multer = require('multer');
  const fs = require('fs');
  const fsp = require('fs').promises;

  // Créer le dossier une seule fois au démarrage (pas dans chaque upload)
  const uploadDir = path.join(__dirname, '..', 'uploads', 'articles');
  // Sync ok ici car c'est au require-time, pas dans un handler
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      // Le dossier existe déjà — pas besoin de vérifier à chaque upload
      cb(null, uploadDir);
    },
    // ...
  });
}
```

---

### 🟡 P10 — Nonce CSP inutile pour une API pure

**Fichier** : `app.js:117-141`

```js
// ✅ CORRIGÉ : Pas de nonce CSP pour une API JSON
// Supprimer le crypto.randomBytes par requête
this.app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
}));
// → Économise ~0.5ms par requête (crypto.randomBytes supprimé)
```

---

### 🟠 P3/P4 — Ajouter limit aux findAll sans pagination

```js
// repositories/userRepository.js — findArtisansByWilaya
async findArtisansByWilaya(wilayaId, options = {}) {
  const { limit = 100 } = options; // ✅ Ajouter limit par défaut
  return this.model.findAll({
    where: { wilaya_residence: parseInt(wilayaId), id_type_user: { [Op.ne]: 1 } },
    limit, // ✅
    // ...
  });
}

// repositories/evenementRepository.js — getPendingProfessionals
async getPendingProfessionals(evenementId, limit = 50) { // ✅
  return this.models.EvenementUser.findAll({
    where: { id_evenement: evenementId, statut_participation: 'en_attente' },
    limit, // ✅
    // ...
  });
}
```

---

### 🟡 P12 — reorderOeuvres : CASE WHEN au lieu de boucle

```js
// ✅ CORRIGÉ : 1 seule requête UPDATE
async reorderOeuvres(evenementId, userId, oeuvres) {
  if (oeuvres.length === 0) return;

  const cases = oeuvres.map(item =>
    `WHEN id_oeuvre = ${parseInt(item.id_oeuvre)} THEN ${parseInt(item.ordre ?? item.ordre_presentation)}`
  ).join(' ');

  const ids = oeuvres.map(item => parseInt(item.id_oeuvre)).join(',');

  await this.model.sequelize.query(
    `UPDATE evenement_oeuvre
     SET ordre_presentation = CASE ${cases} END
     WHERE id_evenement = ? AND id_presentateur = ? AND id_oeuvre IN (${ids})`,
    {
      replacements: [evenementId, userId],
      type: 'UPDATE'
    }
  );
}
```

---

### 🟠 P5 — Sitemap : builder incrémental + cache

```js
// ✅ CORRIGÉ : cache Redis + construction streaming
router.get('/', async (req, res) => {
  try {
    const redis = require('../utils/redisClient').getClient();

    // Cache Redis 1h
    if (redis) {
      const cached = await redis.get('sitemap:xml');
      if (cached) {
        res.set('Content-Type', 'application/xml; charset=utf-8');
        res.set('Cache-Control', 'public, max-age=3600');
        return res.send(cached);
      }
    }

    // Construction (existante mais avec limit raisonnable)
    const SITEMAP_LIMIT = 10000; // ✅ Réduit de 50000 à 10000 par type
    // ... (code existant)

    // Stocker en cache Redis
    if (redis) {
      await redis.setEx('sitemap:xml', 3600, xml);
    }

    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (error) { /* ... */ }
});
```

---

## 8. PLAN DE MONTÉE EN CHARGE

### 🟢 100 utilisateurs simultanés — Quick Wins (1-2 jours)

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 1 | **Cache `getUserWithRoles` dans Redis** (P20) | -50% latence sur toutes les routes auth | 2h |
| 2 | **Cache `/stats/public`** (P21) | Page d'accueil instantanée | 30min |
| 3 | **Ajouter `limit` aux findAll non paginés** (P3/P4) | Prévention OOM | 30min |
| 4 | **Supprimer le nonce CSP par requête** (P10) | -0.5ms/requête | 15min |
| 5 | **Réduire SITEMAP_LIMIT à 10000** (P5) | -80% mémoire sitemap | 5min |
| 6 | **Index composé** : `(statut, date_creation)` sur Oeuvre, Evenement | -50% sur les listes | 30min |

**Résultat estimé** : temps de réponse moyen de 200ms → 80ms

---

### 🟡 1 000 utilisateurs simultanés — Optimisations moyennes (1-2 semaines)

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 7 | **Splitter `findWithFullDetails`** en 2 requêtes (P1) | -60% latence pages détail | 3h |
| 8 | **View counter via Redis buffer** (P11) | Élimine lock contention | 4h |
| 9 | **Index spatial sur Lieu** (lat, lng) (P2) | Recherche géo: 2s → 50ms | 2h |
| 10 | **FULLTEXT index** sur les colonnes de recherche | Recherche: 1s → 100ms | 3h |
| 11 | **Cache Redis pour pages détail** (P22) | -80% requêtes DB | 4h |
| 12 | **PM2 cluster mode** (2-4 workers) | x2-4 throughput | 1h |
| 13 | **Ajuster pool BDD** : `max = ceil(max_connections / workers) - 5` | Stabilité sous charge | 15min |
| 14 | **Migrer metadataService et statsService vers Redis** au lieu de LRU pur (P17) | Cache partagé multi-instance | 3h |
| 15 | **Rate limiter les rooms Socket.IO** (P15) | Prévention DoS | 1h |

**Résultat estimé** : 1000 req/s soutenues, p95 < 200ms

---

### 🔴 10 000+ utilisateurs simultanés — Architecture cible (1-3 mois)

```
                    ┌─────────────┐
                    │   CDN/CF    │ ← static assets, Cache-Control
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Nginx/LB   │ ← SSL termination, rate limit L7
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼────┐ ┌────▼─────┐ ┌────▼─────┐
        │ Node PM2 │ │ Node PM2 │ │ Node PM2 │  ← cluster (4 workers each)
        │ Worker 1 │ │ Worker 2 │ │ Worker 3 │
        └─────┬────┘ └────┬─────┘ └────┬─────┘
              │            │            │
        ┌─────▼────────────▼────────────▼─────┐
        │         Redis Cluster (3 nodes)       │ ← sessions, cache, rate limit, queues
        └─────────────────┬───────────────────┘
                          │
        ┌─────────────────▼───────────────────┐
        │     MySQL Read Replicas (1W + 2R)    │ ← écritures sur primary, lectures sur replicas
        └─────────────────────────────────────┘
```

| # | Action | Impact |
|---|--------|--------|
| 16 | **Read replicas MySQL** : router les SELECT vers les replicas | x3 capacité lecture |
| 17 | **Redis Cluster** pour HA et sharding | Résilience + capacité cache |
| 18 | **CDN** (Cloudflare/CloudFront) devant `/uploads` | -90% bande passante serveur |
| 19 | **S3/Cloudinary exclusif** pour tous les uploads | Stateless complet |
| 20 | **Worker dédié pour les cron jobs** (pas sur les API workers) | Stabilité API sous charge |
| 21 | **Bull + Redis** pour toutes les tâches async (emails, notifications, vues) | Découplage |
| 22 | **Elasticsearch** pour la recherche globale au lieu de LIKE %% | Recherche < 50ms |
| 23 | **Connection pooling externe** (ProxySQL) | Optimisation connexions MySQL |
| 24 | **Health check + auto-scaling** sur métriques (CPU, event loop lag) | Élasticité |
| 25 | **APM** (Sentry Performance ou Datadog) pour monitoring continu | Visibilité |

**Résultat estimé** : 10 000+ req/s, p99 < 500ms, haute disponibilité

---

## PRIORISATION FINALE

```
SEMAINE 1 (Quick wins — impact immédiat)
├── P20: Cache getUserWithRoles dans Redis       ← LE PLUS IMPACTANT
├── P21: Cache stats publiques
├── P3/P4: Ajouter limit aux findAll
├── P10: Supprimer nonce CSP
├── P5: Réduire SITEMAP_LIMIT
└── Index DB: (statut, date_creation) sur Oeuvre + Evenement

SEMAINE 2-3 (Optimisations)
├── P1: Splitter findWithFullDetails
├── P11: View counter Redis buffer
├── P2: Index spatial lat/lng
├── P22: Cache Redis détails entités
└── P17: Migrer LRU → Redis pour metadataService/statsService

MOIS 2+ (Architecture)
├── PM2 cluster + pool DB ajusté
├── Read replicas MySQL
├── CDN + S3 pour uploads
├── Elasticsearch pour recherche
└── APM + monitoring
```
