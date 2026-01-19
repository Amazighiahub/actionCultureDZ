const cors = require('cors');

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
      console.error('❌ CORS: Aucune origine configurée en production! Définissez FRONTEND_URL.');
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
  console.log('🌐 CORS - Origines autorisées:', allowedOrigins);
}

const corsOptions = {
  origin: function (origin, callback) {
    // Requêtes sans origin (applications mobiles, Postman, curl, etc.)
    if (!origin) {
      if (IS_DEVELOPMENT) {
        // Autorisé en développement
        return callback(null, true);
      }
      // En production: autoriser seulement si explicitement configuré
      if (process.env.CORS_ALLOW_NO_ORIGIN === 'true') {
        return callback(null, true);
      }
      return callback(new Error('Requêtes sans origin non autorisées en production'));
    }

    // Vérifier si l'origine est autorisée
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Log uniquement en dev pour éviter le spam en prod
      if (!IS_PRODUCTION) {
        console.warn(`⚠️ CORS: Requête rejetée de ${origin}`);
      }
      callback(new Error(`Origine non autorisée: ${origin}`));
    }
  },
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
  exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'X-Request-ID'],
  maxAge: IS_PRODUCTION ? 86400 : 3600, // 24h en prod, 1h en dev
  optionsSuccessStatus: 200 // Pour compatibilité avec certains navigateurs
};

module.exports = cors(corsOptions);