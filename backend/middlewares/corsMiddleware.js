const cors = require('cors');
const logger = require('../utils/logger');

// ============================================================================
// CONFIGURATION CORS SÉCURISÉE
// ============================================================================
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

// Origines localhost pour développement uniquement
const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8080'
];

// Construire la liste des origines autorisées selon l'environnement
const buildAllowedOrigins = () => {
  const origins = [];

  // En production: UNIQUEMENT les domaines configurés
  if (IS_PRODUCTION) {
    if (process.env.FRONTEND_URL) {
      origins.push(process.env.FRONTEND_URL);
      // Supporter aussi la version www si applicable
      if (process.env.FRONTEND_URL.includes('://www.')) {
        origins.push(process.env.FRONTEND_URL.replace('://www.', '://'));
      } else if (!process.env.FRONTEND_URL.includes('://www.')) {
        const withWww = process.env.FRONTEND_URL.replace('://', '://www.');
        origins.push(withWww);
      }
    }

    // Ajouter des domaines supplémentaires si configurés
    if (process.env.CORS_ALLOWED_ORIGINS) {
      const extraOrigins = process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim());
      origins.push(...extraOrigins);
    }

    // Validation: au moins une origine doit être configurée
    if (origins.length === 0) {
      const msg = 'CORS: Aucune origine configurée en production! Définissez FRONTEND_URL.';
      logger.error(msg);
      throw new Error(msg);
    }
  } else {
    // En développement: autoriser localhost + domaines configurés
    origins.push(...DEV_ORIGINS);

    if (process.env.FRONTEND_URL) {
      origins.push(process.env.FRONTEND_URL);
    }
  }

  return origins;
};

const allowedOrigins = buildAllowedOrigins();

// Log des origines autorisées au démarrage (seulement en dev)
if (!IS_PRODUCTION) {
  logger.info('CORS - Origines autorisées:', allowedOrigins);
}

// Méthodes HTTP "safe" (lecture seule) — autorisées sans Origin en production
// car elles ne peuvent pas modifier l'état du serveur (pas de risque CSRF)
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

const baseCorsOptions = {
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-CSRF-Token',
    'X-Language',
    'Accept-Language'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'X-Request-ID', 'X-CSRF-Token'],
  maxAge: IS_PRODUCTION ? 86400 : 3600, // 24h en prod, 1h en dev
  optionsSuccessStatus: 200 // Pour compatibilité avec certains navigateurs
};

// Delegate function : reçoit req pour accéder à req.method
const corsOptionsDelegate = (req, callback) => {
  const origin = req.header('Origin');
  const method = req.method;

  // Cas 1: Origin présent → vérifier la whitelist
  if (origin) {
    if (allowedOrigins.includes(origin)) {
      return callback(null, { ...baseCorsOptions, origin: true });
    }
    if (!IS_PRODUCTION) {
      logger.warn(`CORS: Requête rejetée de ${origin}`);
    }
    return callback(new Error(`Origine non autorisée: ${origin}`));
  }

  // Cas 2: Pas d'Origin (curl, mobile apps, Googlebot, server-to-server, etc.)

  // Dev: tout autorisé
  if (IS_DEVELOPMENT) {
    return callback(null, { ...baseCorsOptions, origin: true });
  }

  // Prod: autoriser seulement les méthodes safe (lecture seule)
  // Les mutations (POST/PUT/PATCH/DELETE) restent protégées par CSRF token
  if (SAFE_METHODS.includes(method)) {
    return callback(null, { ...baseCorsOptions, origin: true });
  }

  // Backward compat: variable d'env pour autoriser tout
  if (process.env.CORS_ALLOW_NO_ORIGIN === 'true') {
    return callback(null, { ...baseCorsOptions, origin: true });
  }

  return callback(new Error('Requêtes sans origin non autorisées en production'));
};

module.exports = cors(corsOptionsDelegate);