# AUDIT DE SÉCURITÉ APPLICATIVE (AppSec) — EventCulture

**Date :** 2026-03-13
**Branche :** develop
**Auditeur :** Expert AppSec (Claude Opus 4.6)
**Référence :** [CARTOGRAPHIE_PROJET.md](./CARTOGRAPHIE_PROJET.md)

---

## RÉSUMÉ EXÉCUTIF

| Sévérité | Nombre | Description |
|----------|--------|-------------|
| 🔴 CRITIQUE | 13 | Failles exploitables immédiatement, impact majeur |
| 🟠 MAJEUR | 38 | Risques significatifs à corriger avant production |
| 🟡 MINEUR | 20 | Bonnes pratiques et durcissement |
| **TOTAL** | **71** | |

**Verdict :** L'application présente des vulnérabilités critiques dans chaque dimension de sécurité. **Déploiement en production non recommandé** avant correction des 13 constats critiques.

---

## TABLE DES MATIÈRES

1. [Authentification](#1-authentification)
2. [Autorisation & IDOR](#2-autorisation--idor)
3. [Validation d'entrées & Injection](#3-validation-dentrées--injection)
4. [Exposition de données](#4-exposition-de-données)
5. [Headers & Configuration](#5-headers--configuration)
6. [Upload de fichiers](#6-upload-de-fichiers)
7. [Rate Limiting](#7-rate-limiting)
8. [Tableau récapitulatif complet](#8-tableau-récapitulatif-complet)
9. [Points positifs](#9-points-positifs)

---

## 1. AUTHENTIFICATION

### 🔴 AUTH-01 — Refresh token stocké en clair dans la base de données

**Fichier :** `backend/services/user/userService.js:597-604`
**Impact :** Si un attaquant obtient un accès en lecture à la BDD (injection SQL, dump de backup), il récupère tous les refresh tokens en clair et peut usurper n'importe quel utilisateur.

**Code actuel :**
```js
async _saveRefreshToken(userId, refreshToken) {
    const expires = new Date();
    expires.setDate(expires.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
    await this.repository.update(userId, {
      refresh_token: refreshToken,        // ← stocké en clair
      refresh_token_expires: expires
    });
}
```

**Code corrigé :**
```js
const crypto = require('crypto');

async _saveRefreshToken(userId, refreshToken) {
    const expires = new Date();
    expires.setDate(expires.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await this.repository.update(userId, {
      refresh_token: hashedToken,
      refresh_token_expires: expires
    });
}

// Dans refreshToken() :
async refreshToken(refreshToken) {
    if (!refreshToken) throw this._unauthorizedError('Refresh token requis');
    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const user = await this.repository.findByRefreshToken(hashedToken);
    // ... suite identique
}
```

---

### 🔴 AUTH-02 — Pas d'épinglage d'algorithme JWT (attaque alg:none)

**Fichier :** `backend/services/user/userService.js:573-582` et `backend/middlewares/authMiddleware.js:69`
**Impact :** Un attaquant peut forger un token avec `"alg": "none"` et supprimer la signature. Sans épinglage, `jwt.verify` pourrait accepter ce token.

**Code actuel (génération) :**
```js
_generateToken(user) {
    return jwt.sign(
      { userId: user.id_user, email: user.email, typeUser: user.id_type_user },
      this.jwtSecret,
      { expiresIn: this.jwtExpiration }  // ← pas d'algorithme spécifié
    );
}
```

**Code actuel (vérification) :**
```js
const verifyToken = (token) => {
    try {
      return jwt.verify(token, JWT_SECRET);  // ← pas de { algorithms: ['HS256'] }
    } catch (error) { return null; }
};
```

**Code corrigé :**
```js
// Génération
jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiration, algorithm: 'HS256' });

// Vérification
jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
```

---

### 🟠 AUTH-03 — Secret JWT incohérent entre middleware et service

**Fichiers :** `backend/middlewares/authMiddleware.js:38` et `backend/services/user/userService.js:27`
**Impact :** Deux fallbacks différents (`'dev-secret-key-only-for-development'` vs `'default-secret'`). Si `JWT_SECRET` n'est pas défini, les tokens générés par le service ne seront PAS vérifiables par le middleware.

**Code corrigé :**
```js
// userService.js — source unique, pas de fallback
this.jwtSecret = process.env.JWT_SECRET;
if (!this.jwtSecret) throw new Error('JWT_SECRET must be configured');
```

---

### 🟠 AUTH-04 — Nombre de rounds bcrypt incohérent (10 vs 12)

**Fichiers :** `backend/services/user/userService.js:28` (10), `backend/models/users/user.js:353` (10), `backend/controllers/emailVerificationController.js:267` (12), `backend/config/envAdapter.js:173` (12)
**Impact :** 10 rounds est insuffisant en 2026 (OWASP recommande min 12). L'incohérence crée des comportements imprévisibles.

**Code corrigé :**
```js
// config/security.js — source unique
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;
module.exports = { BCRYPT_ROUNDS };
// Utiliser partout : require('../config/security').BCRYPT_ROUNDS
```

---

### 🟠 AUTH-05 — Pas de blacklist de tokens JWT au logout (TTL 24h)

**Fichier :** `backend/controllers/userController.js:108-123`
**Impact :** Le logout révoque le refresh token mais le access token JWT reste valide 24h. Un attaquant ayant intercepté le token peut continuer à l'utiliser.

**Code corrigé :**
```js
// Réduire le TTL à 15 min + blacklist Redis
{ expiresIn: '15m', algorithm: 'HS256' }

// Au logout :
await this.tokenBlacklist.add(token, remainingTTL);

// Dans authMiddleware.authenticate :
if (await tokenBlacklist.has(token)) {
  return res.status(401).json({ success: false, message: 'Token revoked' });
}
```

---

### 🟠 AUTH-06 — Pas d'invalidation des sessions au changement de mot de passe

**Fichier :** `backend/services/user/userService.js:322-346`
**Impact :** Si un compte est compromis, l'utilisateur change son mot de passe mais les sessions de l'attaquant restent valides.

**Code corrigé :**
```js
async changePassword(userId, ancienMotDePasse, nouveauMotDePasse) {
    // ... validation existante ...
    const hashedPassword = await bcrypt.hash(nouveauMotDePasse, BCRYPT_ROUNDS);
    await this.repository.update(userId, {
      password: hashedPassword,
      password_changed_at: new Date()
    });
    await this._clearRefreshToken(userId); // Forcer re-authentification
    return true;
}
```

---

### 🟠 AUTH-07 — Token JWT exposé dans le body JSON (annule httpOnly)

**Fichier :** `backend/controllers/userController.js:86-93`
**Impact :** Le token est envoyé à la fois dans un cookie httpOnly ET dans le corps JSON. Cela annule la protection httpOnly car le token est accessible via JavaScript (vulnérable XSS).

**Code corrigé :**
```js
res.json({
    success: true,
    message: req.t('auth.loginSuccess'),
    data: { user: this._translateUser(result.user, req.lang) }
    // token uniquement dans le cookie httpOnly
});
```

---

### 🟡 AUTH-08 — Énumération de comptes via /check-email

**Fichier :** `backend/routes/userRoutes.js:21` et `backend/controllers/userController.js:533-543`
**Impact :** Endpoint public sans rate limiting permettant de vérifier si un email est enregistré.

---

### 🟡 AUTH-09 — Validation de mot de passe inconsistante

**Fichier :** `backend/services/user/userService.js:335`
**Impact :** Seule la longueur est vérifiée (pas de complexité), contrairement à `resetPassword` qui vérifie 4 critères.

---

### 🟡 AUTH-10 — Rate limiters auth mal configurés (cascade de 3)

**Fichier :** `backend/middlewares/rateLimitMiddleware.js:360-364`
**Impact :** La route login est limitée par les 3 limiters (login + register + forgotPassword), ce qui bloque les utilisateurs légitimes.

---

### 🟡 AUTH-11 — optionalAuth échoue silencieusement

**Fichier :** `backend/middlewares/authMiddleware.js:260-286`
**Impact :** Si la BDD est indisponible, les requêtes continuent sans authentification.

---

## 2. AUTORISATION & IDOR

### 🔴 AUTHZ-01 — Notification send/broadcast sans vérification admin

**Fichier :** `backend/routes/notificationRoutes.js:149-168`
**Impact :** N'importe quel utilisateur authentifié peut envoyer des notifications à tout utilisateur ou broadcaster à TOUS les utilisateurs actifs (phishing interne).

**Code actuel :**
```js
router.post('/send',
    authMiddleware.authenticate,  // PAS de requireAdmin !
    [...],
    (req, res) => notificationController.sendNotification(req, res)
);

router.post('/broadcast',
    authMiddleware.authenticate,  // PAS de requireAdmin !
    [...],
    (req, res) => notificationController.broadcastNotification(req, res)
);
```

**Code corrigé :**
```js
router.post('/send',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    [...],
    (req, res) => notificationController.sendNotification(req, res)
);

router.post('/broadcast',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    [...],
    (req, res) => notificationController.broadcastNotification(req, res)
);
```

---

### 🔴 AUTHZ-02 — Mise à jour des traductions sans vérification admin

**Fichier :** `backend/routes/multilingualRoutes.js:22-27`
**Impact :** Tout utilisateur authentifié peut modifier les traductions de N'IMPORTE QUEL modèle/entité (User, Oeuvre, Lieu...).

**Code corrigé :**
```js
router.put(
    '/translations/:model/:id/:field',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    controller.updateTranslations.bind(controller)
);
```

---

### 🔴 AUTHZ-03 — Fuite des données participants d'événement (IDOR)

**Fichier :** `backend/routes/evenementRoutes.js:42-43` et `backend/controllers/evenementController.js:302-324`
**Impact :** Tout utilisateur authentifié peut voir la liste complète des participants (noms, emails, etc.) de N'IMPORTE QUEL événement. Fuite massive de PII.

**Code corrigé (controller) :**
```js
async getParticipants(req, res) {
    const evenementId = parseInt(req.params.id);
    const evenement = await models.Evenement.findByPk(evenementId, { attributes: ['id_evenement', 'id_user'] });
    if (!evenement) return res.status(404).json({ success: false, error: 'Not found' });
    if (evenement.id_user !== req.user.id_user && !req.user.isAdmin) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    // ... suite
}
```

---

### 🔴 AUTHZ-04 — Validation de participation sans vérification de propriétaire

**Fichier :** `backend/routes/evenementRoutes.js:67` et `backend/controllers/evenementController.js:627-669`
**Impact :** Tout utilisateur authentifié peut confirmer/rejeter les participants de N'IMPORTE QUEL événement.

---

### 🟠 AUTHZ-05 — Patrimoine médias/horaires sans vérification de rôle

**Fichier :** `backend/routes/patrimoineRoutes.js:47-49`
**Impact :** Tout utilisateur authentifié peut uploader/supprimer des médias et modifier les horaires de n'importe quel patrimoine.

**Code corrigé :**
```js
router.post('/:id/medias', authenticate, requireRole(['Admin', 'Moderateur']), validateId(), asyncHandler(...));
router.delete('/:id/medias/:mediaId', authenticate, requireRole(['Admin', 'Moderateur']), ...);
router.put('/:id/horaires', authenticate, requireRole(['Admin', 'Moderateur']), ...);
```

---

### 🟠 AUTHZ-06 — Export d'événement sans vérification de propriétaire

**Fichier :** `backend/routes/evenementRoutes.js:46`
**Impact :** Tout utilisateur authentifié peut exporter les détails complets de n'importe quel événement.

---

### 🟠 AUTHZ-07 — Instances d'auth middleware multiples et incohérentes

**Fichiers :** `backend/routes/dashboardRoutes.js:13`, `notificationRoutes.js:10`, `favoriRoutes.js:9`, `professionnelRoutes.js:17`, `programmeRoutes.js:13`, `lieuRoutes.js:13`, `metadataRoutes.js:13`
**Impact :** Chaque module crée sa propre instance d'auth middleware au lieu d'utiliser l'instance partagée. Risque de comportement incohérent.

---

### 🟠 AUTHZ-08 — Statut intervenant programme sans vérification de rôle

**Fichier :** `backend/routes/programmeRoutes.js:194-201`
**Impact :** Tout utilisateur authentifié peut changer le statut de n'importe quel intervenant dans n'importe quel programme.

---

### 🟠 AUTHZ-09 — Routes admin inatteignables (ordonnancement Express)

**Fichiers :** `backend/routes/artisanatRoutes.js:24,40`, `evenementRoutes.js:47,76`, `oeuvreRoutes.js:26,54`, `serviceRoutes.js:23,41`
**Impact :** Les routes `/:id` sont définies AVANT les routes `/admin/*`. Express capture "admin" comme `:id`, rendant les endpoints admin inatteignables. Les fonctions de modération sont cassées.

**Code corrigé :** Déplacer TOUTES les routes `/admin/*` et `/my/*` AVANT `/:id` dans chaque fichier.

---

### 🟡 AUTHZ-10 — Route debug expose l'architecture interne

**Fichier :** `backend/routes/index.js:445-507`
**Impact :** `GET /api/debug/routes` sans authentification en non-production expose la liste des modèles, middlewares et routes.

---

### 🟡 AUTHZ-11 — Rate limiter auth avec Map sans nettoyage (fuite mémoire)

**Fichier :** `backend/middlewares/authMiddleware.js:568-606`
**Impact :** Le `rateLimitStore` Map n'est jamais nettoyé, causant une fuite mémoire progressive.

---

## 3. VALIDATION D'ENTRÉES & INJECTION

### 🔴 INJ-01 — Injection SQL via `lang` dans Sequelize.literal()

**Fichiers :** `backend/controllers/lieuController.js:123,215,629`, `professionnelController.js:65`, `intervenantController.js:78,528`
**Impact :** Le paramètre `lang` est interpolé directement dans `Sequelize.literal()`. Si la validation en amont est contournée, injection SQL via ORDER BY.

**Code actuel :**
```js
order = [[this.sequelize.literal(`JSON_EXTRACT(\`Lieu\`.\`nom\`, '$.${lang}')`), 'ASC']];
```

**Code corrigé :**
```js
const { buildMultiLangOrder } = require('../utils/multiLangSearchBuilder');
order: buildMultiLangOrder(this.sequelize, 'nom', lang, 'ASC', 'Lieu');
```

---

### 🔴 INJ-02 — Mass Assignment dans updateProfessionalProfile (escalade admin)

**Fichier :** `backend/controllers/professionnelController.js:820-827`
**Impact :** `req.body` passé directement à `user.update()`. Un attaquant peut envoyer `{ "id_type_user": 1, "statut": "actif" }` pour devenir admin.

**Code actuel :**
```js
const updates = req.body;
await user.update(updates);
```

**Code corrigé :**
```js
const allowedFields = ['nom', 'prenom', 'biographie', 'entreprise', 'telephone', 'photo_url', 'site_web'];
const updates = {};
allowedFields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
await user.update(updates);
```

---

### 🟠 INJ-03 — Mass Assignment dans updateMyProfile

**Fichier :** `backend/controllers/professionnelController.js:162-196`
**Impact :** `...otherFields` du `req.body` spread directement dans les updates. Champs arbitraires possibles.

---

### 🟠 INJ-04 — Mass Assignment dans updateLieu

**Fichier :** `backend/controllers/lieuController.js:393-441`
**Impact :** Même pattern `...otherFields` sans whitelist.

---

### 🟠 INJ-05 — Mass Assignment dans updateProgramme

**Fichier :** `backend/controllers/programmeController.js:366-408`
**Impact :** Un attaquant peut modifier `id_evenement` pour déplacer un programme.

---

### 🟠 INJ-06 — Mass Assignment dans updateIntervenant

**Fichier :** `backend/controllers/intervenantController.js:348-404`
**Impact :** Un attaquant peut s'auto-vérifier avec `verifie: true`.

---

### 🟠 INJ-07 — Mass Assignment dans artisanatController

**Fichier :** `backend/controllers/artisanatController.js:96,109`
**Impact :** `req.body` passé directement au service sans filtrage.

---

### 🟠 INJ-08 — Mass Assignment dans serviceController

**Fichier :** `backend/controllers/serviceController.js:111,124`
**Impact :** Même pattern — `req.body` non filtré.

---

### 🟠 INJ-09 — Paramètre `field` non validé dans MultilingualController

**Fichier :** `backend/controllers/multilingualController.js:39,105`
**Impact :** `req.params.field` utilisé pour lire/écrire N'IMPORTE QUEL champ du modèle. `GET /api/multilingual/User/1/password` retournerait le hash.

**Code corrigé :**
```js
const validFields = ['nom', 'titre', 'description', 'adresse', 'histoire', 'biographie', 'nom_evenement'];
if (!validFields.includes(field)) {
  return res.status(400).json({ success: false, error: 'Invalid field' });
}
```

---

### 🟠 INJ-10 — Sanitisation XSS par regex contournable

**Fichier :** `backend/middlewares/securityMiddleware.js:54-61`
**Impact :** `<img src=x onerror=alert(1)>` (sans guillemets) bypass la regex. Nested tags survivent.

**Code corrigé :** Utiliser `sanitize-html` ou `DOMPurify` (server-side) au lieu de regex.

---

### 🟠 INJ-11 — Champs `metadata`/`config` contournent la sanitisation

**Fichier :** `backend/middlewares/securityMiddleware.js:44-50`
**Impact :** Tout champ contenant "metadata" ou "config" dans son nom avec du JSON valide bypass la sanitisation. `{"xss":"<script>alert(1)</script>"}` passe tel quel.

---

### 🟠 INJ-12 — createMultipleBlocks : injection de champs arbitraires

**Fichier :** `backend/controllers/articleBlockController.js:144-153`
**Impact :** `...blocks[i]` spread directement dans `ArticleBlock.create()`.

---

### 🟠 INJ-13 — Upload SVG autorisé sans sanitisation

**Fichier :** `backend/controllers/articleBlockController.js:593`
**Impact :** SVG peut contenir des `<script>` tags et des event handlers. XSS stocké possible.

---

### 🟠 INJ-14 — Pas de protection CSRF détectée

**Fichiers :** Tous les controllers et middlewares
**Impact :** Si les JWT sont transmis via cookies (ce qui est le cas), les attaques CSRF sont possibles sans token CSRF.

---

### 🟡 INJ-15 — Wildcards LIKE non échappés dans les recherches

**Fichiers :** `backend/repositories/userRepository.js:83-88`, `professionnelController.js:40,354`, `intervenantController.js:54,510`
**Impact :** `%` et `_` non échappés dans les patterns LIKE. Manipulation de résultats.

---

### 🟡 INJ-16 — Réponse de validation reflète les valeurs soumises

**Fichier :** `backend/middlewares/validationMiddleware.js:12`
**Impact :** `value: error.value` dans la réponse peut refléter des données sensibles (mots de passe).

---

### 🟡 INJ-17 — Prototype pollution potentielle dans parseFormData

**Fichier :** `backend/middlewares/parseFormData.js:7-11`
**Impact :** `Object.assign(req.body, parsedData)` pourrait être vulnérable si `parsedData` contient `constructor.prototype`.

---

### 🟡 INJ-18 — Paramètre `lang` non validé dans les routes de traduction

**Fichiers :** `backend/controllers/lieuController.js:755`, `programmeController.js:515`, `intervenantController.js:640`
**Impact :** `req.params.lang` utilisé comme clé dans `mergeTranslations()`. Risque de prototype pollution avec `__proto__`.

---

## 4. EXPOSITION DE DONNÉES

### 🔴 DATA-01 — error.message brut exposé dans les réponses 5xx

**Fichier :** `backend/utils/appError.js:112`
**Impact :** `error.message` peut contenir des noms de tables, colonnes, fragments SQL, chemins fichiers.

**Code actuel :**
```js
return AppError.internalError(error.message || 'Une erreur inattendue s\'est produite');
```

**Code corrigé :**
```js
return AppError.internalError('Une erreur inattendue s\'est produite');
// Logger error.message côté serveur uniquement
```

---

### 🔴 DATA-02 — appError.details non filtré dans les réponses

**Fichier :** `backend/middlewares/errorMiddleware.js:79`
**Impact :** Le champ `details` peut contenir des noms de modèles/colonnes Sequelize, exposant le schéma interne.

**Code corrigé :**
```js
...(appError.statusCode < 500 && appError.isOperational && appError.details && { details: appError.details }),
```

---

### 🔴 DATA-03 — Nom de colonne DB exposé dans les erreurs d'unicité

**Fichier :** `backend/utils/appError.js:85-86`
**Impact :** `"Users.email doit être unique"` confirme la structure du schéma.

**Code corrigé :**
```js
return AppError.conflict('Cette valeur existe déjà', 'UNIQUE_CONSTRAINT');
```

---

### 🟠 DATA-04 — Socket.IO sans authentification

**Fichier :** `backend/server.js:41-58`
**Impact :** Le `userId` est pris tel quel depuis `socket.handshake.auth` sans vérification JWT. `join_room` permet de rejoindre N'IMPORTE QUELLE room, y compris `user_42` pour espionner les notifications d'un autre utilisateur.

**Code corrigé :**
```js
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  socket.join(`user_${socket.userId}`);
  // NE PAS permettre join_room sans validation
});
```

---

### 🟠 DATA-05 — Emails utilisateurs dans les logs d'upload

**Fichier :** `backend/app.js:777,811,856,882,916`
**Impact :** `console.log(Upload par ${req.user.email})` persiste les emails en clair dans les fichiers log Winston.

**Code corrigé :**
```js
console.log(`Upload par userId=${req.user.id_user}: ${req.file.filename}`);
```

---

### 🟠 DATA-06 — `Access-Control-Allow-Origin: *` sur les fichiers statiques

**Fichier :** `backend/app.js:206`
**Impact :** Tout site tiers peut charger les fichiers uploadés via des requêtes cross-origin.

**Code corrigé :**
```js
res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'https://actionculture.dz');
```

---

### 🟠 DATA-07 — Route 404 expose le chemin demandé

**Fichier :** `backend/middlewares/errorMiddleware.js:29`
**Impact :** Le message d'erreur inclut `req.originalUrl`, aidant un attaquant à cartographier l'API.

---

### 🟠 DATA-08 — DB_USER loggé au démarrage

**Fichier :** `backend/server.js:113`
**Impact :** Le nom d'utilisateur de la BDD est écrit en clair dans les logs à chaque démarrage.

---

### 🟠 DATA-09 — Healthcheck expose mémoire/uptime en non-production

**Fichier :** `backend/app.js:542-548`
**Impact :** `process.memoryUsage()` et `process.uptime()` exposés si staging accessible publiquement.

---

### 🟠 DATA-10 — Route racine expose la configuration interne

**Fichier :** `backend/app.js:552-577`
**Impact :** Environnement, chemins d'upload et base URL exposés publiquement.

**Code corrigé :**
```js
this.app.get('/', (req, res) => {
  res.json({ message: 'API Action Culture', version: '1.0.0', status: 'running' });
});
```

---

### 🟠 DATA-11 — MetadataController retourne error.message en production

**Fichier :** `backend/controllers/metadataController.js:67,89,118`
**Impact :** `error.message` brut renvoyé sans vérifier `NODE_ENV`.

---

## 5. HEADERS & CONFIGURATION

### 🟠 CONF-01 — Credentials par défaut dans docker-compose.yml

**Fichier :** `docker-compose.yml:78-81`
**Impact :** Mot de passe MySQL par défaut `root` si les variables ne sont pas définies. Risque en production.

---

### 🟠 CONF-02 — Redis sans mot de passe en production

**Fichier :** `docker-compose.prod.yml:183`
**Impact :** `--requirepass ${REDIS_PASSWORD:-}` → chaîne vide par défaut = pas d'authentification Redis.

**Code corrigé :**
```yaml
--requirepass ${REDIS_PASSWORD:?REDIS_PASSWORD must be set for production}
```

---

### 🟠 CONF-03 — MYSQL_ROOT_PASSWORD dans le healthcheck (visible ps aux)

**Fichiers :** `docker-compose.yml:87`, `docker-compose.prod.yml:141`
**Impact :** Le mot de passe root apparaît dans la ligne de commande, visible via `docker inspect` et `ps aux`.

---

### 🟡 CONF-04 — CSP manque `frame-ancestors`

**Fichier :** `backend/app.js:127-134`
**Impact :** Pas de protection contre le clickjacking via CSP (seul X-Frame-Options est présent, qui est déprécié).

---

### 🟡 CONF-05 — `connectSrc` trop permissive

**Fichier :** `backend/app.js:133`
**Impact :** `"https:"` autorise les connexions à N'IMPORTE QUEL domaine HTTPS. Exfiltration de données possible.

---

### 🟡 CONF-06 — `styleSrc: 'unsafe-inline'`

**Fichier :** `backend/app.js:131`
**Impact :** Permet des attaques CSS injection (exfiltration via sélecteurs CSS).

---

### 🟡 CONF-07 — X-Frame-Options incohérent entre Nginx et backend

**Fichiers :** `nginx/prod.conf:77` (`SAMEORIGIN`) vs `backend/middlewares/securityMiddleware.js:198` (`DENY`)

---

### 🟡 CONF-08 — Nginx API manque de CSP

**Fichier :** `nginx/prod.conf:129-132`
**Impact :** Pas de `Content-Security-Policy: default-src 'none'` sur le serveur API.

---

## 6. UPLOAD DE FICHIERS

### 🔴 UPLOAD-01 — Validation magic-bytes complètement contournée pour Cloudinary

**Fichier :** `backend/utils/fileValidator.js:177-180`
**Impact :** Quand les fichiers vont sur Cloudinary, `file.path` est une URL HTTPS. Le validateur short-circuit et skip TOUTE validation.

**Code actuel :**
```js
if (file.path && (file.path.startsWith('http://') || file.path.startsWith('https://'))) {
  return next(); // ← SKIP toute la validation magic-bytes
}
```

**Code corrigé :** Stocker en local temp d'abord, valider les magic-bytes, PUIS uploader vers Cloudinary.

---

### 🟠 UPLOAD-02 — Endpoints d'upload publics sans authentification

**Fichier :** `backend/routes/uploadRoutes.js:52-67`
**Impact :** `/upload/document/public` accepte des PDFs/DOC jusqu'à 50MB sans authentification ni CAPTCHA.

---

### 🟠 UPLOAD-03 — Pas de protection ImageTragick / SVG Script Injection

**Impact :** Aucun re-encoding serveur. SVG avec `<script>` tags uploadable en spoofant le Content-Type.

---

### 🟠 UPLOAD-04 — unlinkSync sur des URLs Cloudinary échoue silencieusement

**Fichier :** `backend/routes/uploadRoutes.js:130-149`
**Impact :** Les fichiers invalides ne sont jamais supprimés de Cloudinary, laissant du contenu malveillant permanent.

---

### 🟡 UPLOAD-05 — Format BMP autorisé, listes inconsistantes

**Fichier :** `backend/services/uploadService.js:65`
**Impact :** BMP autorisé côté Cloudinary mais pas dans FileValidator. Inconsistance.

---

## 7. RATE LIMITING

### 🔴 RATE-01 — X-Forwarded-For spoofing bypass l'advancedLimiter

**Fichier :** `backend/middlewares/rateLimitMiddleware.js:164-170`
**Impact :** Le limiter utilise manuellement `X-Forwarded-For` au lieu de `req.ip`. Un attaquant envoie un header différent à chaque requête = aucune limite.

**Code actuel :**
```js
keyGenerator: (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip;
},
```

**Code corrigé :**
```js
keyGenerator: (req) => req.user?.id_user?.toString() || req.ip,
```

---

### 🟠 RATE-02 — createContentLimiter skip les requêtes réussies

**Fichier :** `backend/middlewares/rateLimitMiddleware.js:98`
**Impact :** `skipSuccessfulRequests: true` = les uploads réussis ne sont JAMAIS comptés. Aucune limite effective sur les uploads.

---

### 🟠 RATE-03 — Limite vidéo 500MB avec rate limiting inefficace

**Fichier :** `backend/services/uploadService.js:109`
**Impact :** 500MB par fichier vidéo + uploads réussis non comptés = épuisement du stockage Cloudinary.

---

### 🟠 RATE-04 — /check-email sans rate limiting

**Fichier :** `backend/routes/userRoutes.js:21`
**Impact :** Énumération de comptes illimitée.

---

### 🟠 RATE-05 — Rate limiting création appliqué aux GET et skip les POST

**Fichier :** `backend/app.js:443-446`
**Impact :** Les requêtes GET consomment le budget rate limit tandis que les POST (créations) sont skipées car réussies.

---

### 🟠 RATE-06 — Uploads dans app.js sans rate limiter dédié

**Fichier :** `backend/app.js:612-693`
**Impact :** Les routes d'upload définies dans app.js partagent le rate limiter global avec toutes les autres routes API.

---

### 🟡 RATE-07 — Headers rate limit exposent l'état interne

**Fichier :** `backend/middlewares/rateLimitMiddleware.js:73-74,182-188`
**Impact :** `RateLimit-*` headers + JSON détaillé aident l'attaquant à calibrer ses requêtes.

---

### 🟡 RATE-08 — Middleware de sécurité continue silencieusement en cas d'erreur

**Fichier :** `backend/middlewares/securityMiddleware.js:131-135`
**Impact :** Si la sanitisation échoue, la requête non sanitisée continue vers le handler.

---

## 8. TABLEAU RÉCAPITULATIF COMPLET

| # | ID | Sévérité | Catégorie | Description | Fichier |
|---|-----|----------|-----------|-------------|---------|
| 1 | AUTH-01 | 🔴 CRITIQUE | Auth | Refresh token en clair en BDD | userService.js:597 |
| 2 | AUTH-02 | 🔴 CRITIQUE | Auth | Pas d'épinglage algo JWT | userService.js:573, authMiddleware.js:69 |
| 3 | AUTHZ-01 | 🔴 CRITIQUE | Authz | Notification send/broadcast sans admin | notificationRoutes.js:149,161 |
| 4 | AUTHZ-02 | 🔴 CRITIQUE | Authz | Traductions modifiables par tous | multilingualRoutes.js:23 |
| 5 | AUTHZ-03 | 🔴 CRITIQUE | Authz | IDOR participants événement | evenementRoutes.js:42, evenementController.js:302 |
| 6 | AUTHZ-04 | 🔴 CRITIQUE | Authz | Validation participation sans ownership | evenementRoutes.js:67 |
| 7 | INJ-01 | 🔴 CRITIQUE | Injection | SQL injection via lang dans literal() | lieuController.js:123,215,629 |
| 8 | INJ-02 | 🔴 CRITIQUE | Injection | Mass assignment → escalade admin | professionnelController.js:820 |
| 9 | DATA-01 | 🔴 CRITIQUE | Data | error.message brut dans les 5xx | appError.js:112 |
| 10 | DATA-02 | 🔴 CRITIQUE | Data | appError.details non filtré | errorMiddleware.js:79 |
| 11 | DATA-03 | 🔴 CRITIQUE | Data | Colonne DB dans erreur unicité | appError.js:85 |
| 12 | UPLOAD-01 | 🔴 CRITIQUE | Upload | Validation magic-bytes contournée (Cloudinary) | fileValidator.js:177 |
| 13 | RATE-01 | 🔴 CRITIQUE | Rate Limit | X-Forwarded-For spoofing bypass | rateLimitMiddleware.js:164 |
| 14 | AUTH-03 | 🟠 MAJEUR | Auth | Secret JWT incohérent | authMiddleware.js:38, userService.js:27 |
| 15 | AUTH-04 | 🟠 MAJEUR | Auth | Bcrypt rounds incohérents (10 vs 12) | userService.js:28, user.js:353 |
| 16 | AUTH-05 | 🟠 MAJEUR | Auth | Pas de blacklist tokens au logout | userController.js:108 |
| 17 | AUTH-06 | 🟠 MAJEUR | Auth | Pas d'invalidation sessions au changement mdp | userService.js:322 |
| 18 | AUTH-07 | 🟠 MAJEUR | Auth | Token JWT dans body JSON (annule httpOnly) | userController.js:86 |
| 19 | AUTHZ-05 | 🟠 MAJEUR | Authz | Patrimoine médias sans rôle | patrimoineRoutes.js:47 |
| 20 | AUTHZ-06 | 🟠 MAJEUR | Authz | Export événement sans ownership | evenementRoutes.js:46 |
| 21 | AUTHZ-07 | 🟠 MAJEUR | Authz | Auth middleware instances multiples | 7 fichiers routes |
| 22 | AUTHZ-08 | 🟠 MAJEUR | Authz | Statut intervenant sans rôle | programmeRoutes.js:194 |
| 23 | AUTHZ-09 | 🟠 MAJEUR | Authz | Routes admin inatteignables (ordering) | 4 fichiers routes |
| 24 | INJ-03 | 🟠 MAJEUR | Injection | Mass assignment updateMyProfile | professionnelController.js:162 |
| 25 | INJ-04 | 🟠 MAJEUR | Injection | Mass assignment updateLieu | lieuController.js:393 |
| 26 | INJ-05 | 🟠 MAJEUR | Injection | Mass assignment updateProgramme | programmeController.js:366 |
| 27 | INJ-06 | 🟠 MAJEUR | Injection | Mass assignment updateIntervenant | intervenantController.js:348 |
| 28 | INJ-07 | 🟠 MAJEUR | Injection | Mass assignment artisanatController | artisanatController.js:96,109 |
| 29 | INJ-08 | 🟠 MAJEUR | Injection | Mass assignment serviceController | serviceController.js:111,124 |
| 30 | INJ-09 | 🟠 MAJEUR | Injection | Champ `field` non validé (multilingual) | multilingualController.js:39 |
| 31 | INJ-10 | 🟠 MAJEUR | Injection | Sanitisation XSS regex contournable | securityMiddleware.js:54 |
| 32 | INJ-11 | 🟠 MAJEUR | Injection | Champs metadata bypass sanitisation | securityMiddleware.js:44 |
| 33 | INJ-12 | 🟠 MAJEUR | Injection | createMultipleBlocks injection champs | articleBlockController.js:144 |
| 34 | INJ-13 | 🟠 MAJEUR | Injection | SVG upload sans sanitisation | articleBlockController.js:593 |
| 35 | INJ-14 | 🟠 MAJEUR | Injection | Pas de protection CSRF | Tous controllers |
| 36 | DATA-04 | 🟠 MAJEUR | Data | Socket.IO sans authentification | server.js:41 |
| 37 | DATA-05 | 🟠 MAJEUR | Data | Emails dans les logs | app.js:777,811,856,882,916 |
| 38 | DATA-06 | 🟠 MAJEUR | Data | ACAO: * sur fichiers statiques | app.js:206 |
| 39 | DATA-07 | 🟠 MAJEUR | Data | URL exposée dans 404 | errorMiddleware.js:29 |
| 40 | DATA-08 | 🟠 MAJEUR | Data | DB_USER dans les logs | server.js:113 |
| 41 | DATA-09 | 🟠 MAJEUR | Data | Healthcheck expose mémoire | app.js:542 |
| 42 | DATA-10 | 🟠 MAJEUR | Data | Route racine expose config | app.js:552 |
| 43 | DATA-11 | 🟠 MAJEUR | Data | error.message en prod (metadata) | metadataController.js:67 |
| 44 | CONF-01 | 🟠 MAJEUR | Config | Credentials par défaut Docker | docker-compose.yml:78 |
| 45 | CONF-02 | 🟠 MAJEUR | Config | Redis sans mot de passe prod | docker-compose.prod.yml:183 |
| 46 | CONF-03 | 🟠 MAJEUR | Config | ROOT_PASSWORD dans healthcheck | docker-compose.yml:87 |
| 47 | UPLOAD-02 | 🟠 MAJEUR | Upload | Upload public sans auth | uploadRoutes.js:52 |
| 48 | UPLOAD-03 | 🟠 MAJEUR | Upload | Pas de protection SVG/ImageTragick | Multiples fichiers |
| 49 | UPLOAD-04 | 🟠 MAJEUR | Upload | unlinkSync sur URLs Cloudinary | uploadRoutes.js:130 |
| 50 | RATE-02 | 🟠 MAJEUR | Rate Limit | skipSuccessfulRequests sur uploads | rateLimitMiddleware.js:98 |
| 51 | RATE-03 | 🟠 MAJEUR | Rate Limit | Vidéo 500MB + limiter inefficace | uploadService.js:109 |
| 52 | RATE-04 | 🟠 MAJEUR | Rate Limit | /check-email sans rate limiting | userRoutes.js:21 |
| 53 | RATE-05 | 🟠 MAJEUR | Rate Limit | Limiter création skip les POST | app.js:443 |
| 54 | RATE-06 | 🟠 MAJEUR | Rate Limit | Uploads sans limiter dédié | app.js:612 |
| 55 | AUTH-08 | 🟡 MINEUR | Auth | Énumération comptes /check-email | userController.js:533 |
| 56 | AUTH-09 | 🟡 MINEUR | Auth | Validation mot de passe inconsistante | userService.js:335 |
| 57 | AUTH-10 | 🟡 MINEUR | Auth | Rate limiters auth en cascade | rateLimitMiddleware.js:360 |
| 58 | AUTH-11 | 🟡 MINEUR | Auth | optionalAuth échoue silencieusement | authMiddleware.js:260 |
| 59 | AUTHZ-10 | 🟡 MINEUR | Authz | Debug routes sans auth | routes/index.js:445 |
| 60 | AUTHZ-11 | 🟡 MINEUR | Authz | Rate limiter Map sans cleanup | authMiddleware.js:568 |
| 61 | INJ-15 | 🟡 MINEUR | Injection | Wildcards LIKE non échappés | userRepository.js:83 |
| 62 | INJ-16 | 🟡 MINEUR | Injection | Validation reflète valeurs soumises | validationMiddleware.js:12 |
| 63 | INJ-17 | 🟡 MINEUR | Injection | Prototype pollution parseFormData | parseFormData.js:7 |
| 64 | INJ-18 | 🟡 MINEUR | Injection | lang non validé dans traductions | lieuController.js:755 |
| 65 | CONF-04 | 🟡 MINEUR | Config | CSP manque frame-ancestors | app.js:127 |
| 66 | CONF-05 | 🟡 MINEUR | Config | connectSrc trop permissive | app.js:133 |
| 67 | CONF-06 | 🟡 MINEUR | Config | unsafe-inline pour styles | app.js:131 |
| 68 | CONF-07 | 🟡 MINEUR | Config | X-Frame-Options incohérent | nginx/prod.conf:77 |
| 69 | CONF-08 | 🟡 MINEUR | Config | Pas de CSP sur API Nginx | nginx/prod.conf:129 |
| 70 | UPLOAD-05 | 🟡 MINEUR | Upload | BMP autorisé, listes inconsistantes | uploadService.js:65 |
| 71 | RATE-07 | 🟡 MINEUR | Rate Limit | Headers rate limit exposent état | rateLimitMiddleware.js:73 |

---

## 9. POINTS POSITIFS

Les éléments suivants sont correctement implémentés :

1. **`.gitignore`** — couvre `.env`, `.env.*`, `!.env.example`, credentials, clés privées
2. **`.env.example`** — ne contient aucun secret réel, placeholders clairs
3. **Pas de secrets hardcodés** — `cloudinaryService.js` lit tout depuis `process.env`
4. **Stack trace conditionnel** — `errorMiddleware.js` n'envoie le stack qu'en `development`
5. **CORS bien configuré** — pas de wildcard `*` sur l'API, origines validées dynamiquement
6. **Helmet bien configuré** — nonce CSP par requête, HSTS avec preload
7. **Rate limiting multi-tier** — présent sur auth, créations et actions sensibles
8. **UserDTO** — supprime explicitement le champ `password`
9. **envValidator** — vérifie en production que `DB_USER` ≠ `root`, JWT_SECRET suffisamment long
10. **Logger Winston** — structuré avec rotation des fichiers en production
11. **Docker prod** — ports MySQL/Redis non exposés à l'extérieur (`expose` au lieu de `ports`)
12. **Nginx** — `server_tokens off`, TLS 1.2+, OCSP stapling, scripts bloqués dans uploads
13. **Mots de passe** — hachés avec bcrypt (bien que rounds inconsistants)
14. **Cookies auth** — `httpOnly: true`, `secure` en production
15. **Validation d'IDs** — `validateId()` middleware sur la plupart des routes avec paramètres

---

## PRIORITÉ DE CORRECTION

### Phase 1 — Immédiat (avant tout déploiement)
- AUTH-01, AUTH-02 : Sécuriser JWT et refresh tokens
- AUTHZ-01 à AUTHZ-04 : Corriger les escalades de privilèges critiques
- INJ-01, INJ-02 : Corriger injection SQL et mass assignment admin
- DATA-01 à DATA-03 : Stopper les fuites d'information dans les erreurs
- UPLOAD-01 : Implémenter la validation magic-bytes pré-Cloudinary
- RATE-01 : Corriger le bypass X-Forwarded-For

### Phase 2 — Court terme (1-2 semaines)
- Tous les 🟠 MAJEUR restants (mass assignments, Socket.IO, CSRF, etc.)

### Phase 3 — Moyen terme (1 mois)
- Tous les 🟡 MINEUR (durcissement CSP, nettoyage logs, cohérence configs)

---

*Rapport généré le 2026-03-13 — EventCulture — Branche develop*
