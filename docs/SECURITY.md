# 🔐 Guide de Sécurité et Bonnes Pratiques - EventCulture

## 📋 Table des matières
1. [Configuration](#configuration)
2. [Authentification & Autorisation](#authentification--autorisation)
3. [Validation & Sanitization](#validation--sanitization)
4. [Gestion des Fichiers](#gestion-des-fichiers)
5. [Base de Données](#base-de-données)
6. [Production](#production)
7. [Monitoring](#monitoring)

---

## Configuration

### Variables d'Environnement
✅ **À faire:**
- Tous les secrets doivent être dans `.env` (ignoré par Git)
- Copier `.env.example` et remplir vos valeurs
- Utiliser `EnvironmentValidator` pour valider au démarrage

❌ **À éviter:**
- Mettre des secrets en dur dans le code
- Commiter `.env` dans Git
- Utiliser les mêmes secrets en dev et production

### Démarrage Sécurisé
```javascript
// Dans server.js avant de démarrer l'app
const EnvironmentValidator = require('./config/envValidator');
EnvironmentValidator.validate(); // Lance une erreur si config invalide
EnvironmentValidator.printReport(); // Affiche la configuration
```

---

## Authentification & Autorisation

### JWT (JSON Web Tokens)
```javascript
// ✅ BON - Utiliser les variables d'environnement
const JWT_SECRET = process.env.JWT_SECRET;

// ❌ MAUVAIS - Secrets en dur
const JWT_SECRET = 'my-secret-key';
```

### Gestion des Tokens
- **Expiration**: Configurer JWT_EXPIRES_IN à 24h maximum
- **Renouvellement**: Implémenter un mécanisme de refresh token
- **Stockage**: Ne jamais stocker les tokens en localStorage en production
- **Révocation**: Implémenter une blacklist pour les tokens révoqués

### Middleware d'Authentification
```javascript
const { authenticate } = require('./middlewares/authMiddleware');

// Protéger les routes sensibles
app.post('/api/users', authenticate, userController.create);
```

---

## Validation & Sanitization

### Validation des Entrées
```javascript
const AppError = require('./utils/AppError');
const { body, validationResult } = require('express-validator');

// ✅ Utiliser express-validator
router.post('/users', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('name').trim().notEmpty()
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw AppError.badRequest('Validation failed', 'VALIDATION_ERROR', errors.array());
  }
  // Continuer...
});
```

### Gestion des Erreurs Cohérente
```javascript
// ✅ Utiliser la classe AppError
throw AppError.notFound('User', 'USER_NOT_FOUND');
throw AppError.unauthorized('Invalid credentials', 'AUTH_FAILED');
throw AppError.forbidden('No permission', 'NO_PERMISSION');

// Error handling middleware (à ajouter dans app.js)
app.use((err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(err.toJSON());
  }
  // Erreur non gérée
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erreur serveur' } });
});
```

---

## Gestion des Fichiers

### Validation des Uploads
```javascript
const FileValidator = require('./utils/FileValidator');

// ✅ Valider le type réel (magic number) pas seulement l'extension
const validator = FileValidator.uploadValidator(
  ['image/jpeg', 'image/png', 'image/webp'],
  5 * 1024 * 1024 // 5MB max
);

router.post('/upload', uploadMiddleware, validator, (req, res) => {
  // Le fichier est validé
});
```

### Nettoyage des Fichiers Temporaires
```bash
# Nettoyer manuellement
node scripts/cleanTempFiles.js

# Ou via cron (ajouter à crontab)
0 2 * * * cd /path/to/backend && node scripts/cleanTempFiles.js
```

### Stockage Sécurisé
- **Chemin**: Utiliser un chemin absolu, pas relative
- **Permissions**: 644 pour les fichiers, 755 pour les répertoires
- **Limite**: Implémenter un quota par utilisateur
- **Noms**: Générer des noms aléatoires pour éviter les enumeration attacks

---

## Base de Données

### Configuration Sécurisée
```javascript
// ✅ CORRECT - Dans .env et config/database.js
DB_USER=user_app  // Compte avec permissions limitées
DB_PASSWORD=strong_password_32_chars_min
DB_HOST=127.0.0.1  // Pas exposé sur Internet
DB_POOL_MAX=10     // Limite les connexions
```

### Migrations & Seed
```bash
# ✅ Vérifier toujours les migrations en dev d'abord
npm run db:migrate

# ❌ NE JAMAIS exécuter en production sans backup
npm run db:seed
```

### Requêtes Sécurisées
```javascript
// ✅ CORRECT - Paramétrisé (Sequelize/ORM)
await User.findAll({
  where: { email: userEmail }
});

// ❌ MAUVAIS - Injection SQL possible
await sequelize.query(`SELECT * FROM users WHERE email = '${email}'`);
```

---

## CORS & Sécurité HTTP

### Configuration CORS
```javascript
// ✅ CORRECT - Whitelist stricte
const allowedOrigins = [
  'https://yourdomain.com',
  'https://www.yourdomain.com'
];

// ❌ MAUVAIS - Accepter toutes les origines
origin: '*'
```

### Headers de Sécurité (Helmet)
```javascript
// ✅ Déjà activé dans app.js
const helmet = require('helmet');
app.use(helmet());
```

---

## Production

### Variables d'Environnement Production
```env
NODE_ENV=production
JWT_SECRET=generate_with_node_generateSecret.js
DB_USER=app_user      # Pas root
DB_PASSWORD=very_long_strong_password
DB_HOST=db.internal   # Pas localhost/127.0.0.1
BCRYPT_ROUNDS=12
EMAIL_PAUSED=false    # Activer les mails
```

### Checklist Pré-Production
- [ ] Tous les secrets en variables d'environnement
- [ ] CORS configuré avec domaine réel
- [ ] JWT_SECRET généré et sécurisé
- [ ] Base de données backupée
- [ ] HTTPS activé (certificat SSL/TLS)
- [ ] Rate limiting activé
- [ ] Logs centralisés (Winston, ELK, etc.)
- [ ] Monitoring en place
- [ ] Plan de disaster recovery

### HTTPS & SSL
```javascript
// ✅ Forcer HTTPS en production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

---

## Monitoring

### Logs Structurés
```javascript
// ✅ À implémenter: Winston ou Pino
const logger = require('winston');

logger.info('User created', { userId: 123, email: 'user@example.com' });
logger.error('Payment failed', { orderId: 456, error: err });

// ❌ À éviter: console.log en production
console.log('Something happened');
```

### Métriques
- Temps de réponse API
- Taux d'erreurs
- Utilisation du pool de connexions DB
- Espace disque des uploads
- Requêtes non autorisées (401, 403)

### Alertes
- JWT_SECRET non configuré
- Erreurs de connexion à la BD
- Espace disque faible
- Taux d'erreurs élevé (> 5%)

---

## Commandes Utiles

```bash
# Validation configuration
npm run start:safe

# Générer un JWT_SECRET sécurisé
node scripts/generateSecret.js

# Nettoyer les fichiers temporaires
node scripts/cleanTempFiles.js

# Vérifier les vulnérabilités
npm audit

# Linting
npm run lint
npm run lint:fix
```

---

## Ressources Complémentaires

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Checklist](https://nodejs.org/en/docs/guides/security/)
- [Express Security](https://expressjs.com/en/advanced/best-practice-security.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

**Dernière mise à jour**: 15 décembre 2025
**Responsable**: Équipe Security EventCulture
