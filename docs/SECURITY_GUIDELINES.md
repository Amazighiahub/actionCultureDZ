# Guide de Sécurité - EventCulture

Ce guide présente les bonnes pratiques de sécurité à suivre lors du développement sur le projet EventCulture.

---

## Table des Matières

1. [Prévention des Injections SQL](#1-prévention-des-injections-sql)
2. [Authentification et Autorisation](#2-authentification-et-autorisation)
3. [Validation des Entrées](#3-validation-des-entrées)
4. [Gestion des Fichiers](#4-gestion-des-fichiers)
5. [Gestion des Secrets](#5-gestion-des-secrets)
6. [Logging et Audit](#6-logging-et-audit)

---

## 1. Prévention des Injections SQL

### ❌ À NE PAS FAIRE

```javascript
// DANGEREUX - Interpolation directe
const query = `SELECT * FROM users WHERE name = '${userName}'`;
await sequelize.query(query);

// DANGEREUX - sequelize.literal avec variables non validées
const search = req.query.search;
sequelize.literal(`JSON_EXTRACT(field, '$.${lang}') LIKE '%${search}%'`)
```

### ✅ BONNES PRATIQUES

```javascript
// SÉCURISÉ - Utiliser les paramètres de Sequelize
const user = await User.findOne({
  where: { name: userName }
});

// SÉCURISÉ - Utiliser sequelize.fn et sequelize.col
sequelize.where(
  sequelize.fn('JSON_EXTRACT', sequelize.col(field), '$.fr'),
  { [Op.like]: `%${sanitizedSearch}%` }
)

// SÉCURISÉ - Utiliser sequelize.escape()
const safeSearch = sequelize.escape(`%${search}%`);

// SÉCURISÉ - Valider les paramètres avant utilisation
const safeLang = SUPPORTED_LANGUAGES.includes(lang) ? lang : 'fr';
```

### Utiliser MultiLangSearchBuilder

```javascript
const { buildMultiLangSearch } = require('../utils/MultiLangSearchBuilder');

// Cette fonction valide automatiquement les paramètres
const conditions = buildMultiLangSearch(sequelize, 'titre', searchTerm);
```

---

## 2. Authentification et Autorisation

### Middleware d'authentification

```javascript
// Toujours utiliser le middleware d'authentification pour les routes protégées
router.post('/resource',
  authMiddleware.authenticate,
  // ... votre handler
);

// Pour les routes admin
router.delete('/admin/resource/:id',
  authMiddleware.authenticate,
  authMiddleware.requireRole(['Admin']),
  // ... votre handler
);
```

### Vérification d'Ownership

```javascript
// TOUJOURS vérifier que l'utilisateur est propriétaire de la ressource
async updateResource(req, res) {
  const resource = await Resource.findByPk(req.params.id);

  if (!resource) {
    return res.status(404).json({ error: 'Non trouvé' });
  }

  // Vérification ownership
  const isAdmin = req.user?.role === 'Admin' || req.user?.isAdmin;
  const isOwner = resource.id_user === req.user?.id_user;

  if (!isAdmin && !isOwner) {
    return res.status(403).json({ error: 'Non autorisé' });
  }

  // Continuer avec la mise à jour...
}
```

### ❌ JAMAIS de fallback d'authentification

```javascript
// DANGEREUX - Ne JAMAIS faire ça!
authenticate: authMiddleware?.authenticate || ((req, res, next) => {
  req.user = { id_user: 1 };  // BYPASS D'AUTH!
  next();
})

// SÉCURISÉ - Échouer si le middleware n'est pas disponible
if (!authMiddleware?.authenticate) {
  throw new Error('Middleware d\'authentification non configuré');
}
```

---

## 3. Validation des Entrées

### Utiliser express-validator

```javascript
const { body, param, query } = require('express-validator');

router.post('/resource',
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Nom requis')
      .isLength({ min: 3, max: 100 }).withMessage('3-100 caractères'),
    body('email')
      .isEmail().withMessage('Email invalide')
      .normalizeEmail(),
    body('price')
      .optional()
      .isFloat({ min: 0 }).withMessage('Prix invalide')
  ],
  validationMiddleware.handleValidationErrors,
  controller.create
);
```

### Validation des IDs

```javascript
// Toujours valider les IDs de paramètres
router.get('/:id',
  param('id').isInt({ min: 1 }).withMessage('ID invalide'),
  validationMiddleware.handleValidationErrors,
  controller.getById
);
```

### Validation des coordonnées géographiques

```javascript
// Valider lat/lng avant utilisation
const safeLat = parseFloat(lat);
const safeLng = parseFloat(lng);

if (isNaN(safeLat) || isNaN(safeLng)) {
  return res.status(400).json({ error: 'Coordonnées invalides' });
}

if (safeLat < -90 || safeLat > 90 || safeLng < -180 || safeLng > 180) {
  return res.status(400).json({ error: 'Coordonnées hors limites' });
}
```

---

## 4. Gestion des Fichiers

### Validation du type de fichier

```javascript
const FileValidator = require('../utils/FileValidator');

// Utiliser le middleware de validation
router.post('/upload',
  upload.single('file'),
  FileValidator.uploadValidator(
    ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    10 * 1024 * 1024  // 10MB max
  ),
  controller.upload
);

// Pour les uploads multiples
async (req, res, next) => {
  const results = await FileValidator.validateFilesBatch(
    req.files.map(f => f.path),
    allowedTypes
  );
  const invalidFiles = results.filter(r => !r.valid);
  if (invalidFiles.length > 0) {
    // Supprimer les fichiers invalides
    req.files.forEach(f => fs.unlinkSync(f.path));
    return res.status(400).json({ error: 'Type non autorisé' });
  }
  next();
}
```

### Protection contre le Path Traversal

```javascript
// DANGEREUX - Chemin non validé
const filePath = path.join(__dirname, '..', req.body.filePath);
fs.unlinkSync(filePath);  // Peut supprimer n'importe quel fichier!

// SÉCURISÉ - Utiliser _securePath()
_securePath(filePath) {
  if (!filePath || typeof filePath !== 'string') return null;

  const cleanPath = filePath
    .replace(/^(https?:)?\/\/[^\/]+/, '')
    .replace(/\\/g, '/')
    .replace(/\.{2,}/g, '.');

  const absolutePath = path.resolve(__dirname, '..', cleanPath);

  // Vérifier que le chemin reste dans uploads
  if (!absolutePath.startsWith(this.uploadsRoot)) {
    console.error('Path traversal détecté!');
    return null;
  }

  return absolutePath;
}
```

---

## 5. Gestion des Secrets

### Ne JAMAIS commiter de secrets

```gitignore
# .gitignore
.env
.env.*
!.env.example
*.pem
*.key
credentials.json
```

### Utiliser des variables d'environnement

```javascript
// ✅ BON
const jwtSecret = process.env.JWT_SECRET;
const dbPassword = process.env.DB_PASSWORD;

// ❌ MAUVAIS
const jwtSecret = 'my-hardcoded-secret';
const dbPassword = 'root';
```

### Générer des secrets sécurisés

```bash
# Générer un JWT_SECRET
node scripts/generateSecret.js

# Ou manuellement
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Valider les secrets au démarrage

```javascript
if (isProduction) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET invalide pour la production');
  }
}
```

---

## 6. Logging et Audit

### Utiliser le logger centralisé

```javascript
const logger = require('../utils/logger');

// Au lieu de console.log
logger.info('Utilisateur connecté', { userId: user.id });
logger.warn('Tentative d\'accès non autorisé', { userId, resource });
logger.error('Erreur base de données', { error: err.message });
```

### Logger les actions sensibles

```javascript
// Utiliser le middleware d'audit
router.delete('/:id',
  authMiddleware.authenticate,
  auditMiddleware.logAction('DELETE_RESOURCE'),
  controller.delete
);
```

### Ne pas logger d'informations sensibles

```javascript
// ❌ MAUVAIS
logger.info('User login', { email, password });

// ✅ BON
logger.info('User login', { email, success: true });
```

---

## Checklist de Sécurité pour les PR

Avant de soumettre une Pull Request, vérifiez:

- [ ] Pas d'interpolation directe dans les requêtes SQL
- [ ] Tous les inputs utilisateur sont validés
- [ ] Les routes sensibles ont une authentification
- [ ] La vérification d'ownership est présente pour update/delete
- [ ] Les fichiers uploadés sont validés avec FileValidator
- [ ] Pas de secrets hardcodés
- [ ] Les erreurs sont loggées correctement (sans données sensibles)
- [ ] Les chemins de fichiers sont validés contre le path traversal

---

## Ressources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Sequelize Security Best Practices](https://sequelize.org/docs/v6/other-topics/security/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
