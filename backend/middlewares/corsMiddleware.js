/**
 * corsMiddleware - Configuration CORS durcie
 *
 * Politique:
 *  - En production: whitelist STRICTE via FRONTEND_URL + CORS_ALLOWED_ORIGINS.
 *    Aucune origine n'est ajoutee automatiquement (pas de "www." magique).
 *  - Chaque origine est validee au boot: URL parseable, protocole https:// en prod.
 *  - Requetes sans Origin: autorisees seulement pour methodes safe (GET/HEAD/OPTIONS).
 *  - CORS_ALLOW_NO_ORIGIN=true reste disponible (compat legacy) mais log un WARN
 *    visible au boot et chaque usage est trace (sampling).
 *  - Rejets loges en prod pour observabilite (tentatives de scan/SSRF).
 */

const cors = require('cors');
const logger = require('../utils/logger');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
const IS_TEST = process.env.NODE_ENV === 'test';

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

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

// ============================================================================
// VALIDATION D'UNE ORIGINE
// ----------------------------------------------------------------------------
// Une origine CORS valide doit:
//  - etre parseable en URL
//  - avoir un protocole http:// ou https:// (pas de ws://, pas de file://)
//  - ne pas avoir de path / query / fragment (l'Origin header n'en a jamais)
//  - en production, utiliser https:// (sauf cas dev explicite)
// ============================================================================
function validateOrigin(origin, { requireHttps = false } = {}) {
  if (typeof origin !== 'string' || origin.length === 0) {
    return { valid: false, reason: 'empty' };
  }

  let url;
  try {
    url = new URL(origin);
  } catch (_err) {
    return { valid: false, reason: 'not-a-url' };
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return { valid: false, reason: `invalid-protocol:${url.protocol}` };
  }

  if (requireHttps && url.protocol !== 'https:') {
    return { valid: false, reason: 'http-not-allowed-in-production' };
  }

  // L'Origin header est scheme://host[:port] — tout chemin est suspect.
  if (url.pathname && url.pathname !== '/') {
    return { valid: false, reason: 'origin-has-path' };
  }
  if (url.search || url.hash) {
    return { valid: false, reason: 'origin-has-query-or-hash' };
  }

  // Normalise: supprime slash final eventuel → matche toujours l'Origin header envoye.
  const normalized = `${url.protocol}//${url.host}`;
  return { valid: true, normalized };
}

// ============================================================================
// CONSTRUCTION DE LA WHITELIST AU BOOT
// ============================================================================
function buildAllowedOrigins() {
  const origins = new Set();
  const invalidOrigins = [];

  const push = (value, source) => {
    const verdict = validateOrigin(value, { requireHttps: IS_PRODUCTION });
    if (verdict.valid) {
      origins.add(verdict.normalized);
    } else {
      invalidOrigins.push({ value, source, reason: verdict.reason });
    }
  };

  if (IS_PRODUCTION) {
    if (process.env.FRONTEND_URL) {
      push(process.env.FRONTEND_URL, 'FRONTEND_URL');
    }
    if (process.env.CORS_ALLOWED_ORIGINS) {
      process.env.CORS_ALLOWED_ORIGINS
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
        .forEach((o) => push(o, 'CORS_ALLOWED_ORIGINS'));
    }

    if (invalidOrigins.length > 0) {
      logger.error('CORS: origines invalides ignorees', { invalidOrigins });
    }
    if (origins.size === 0) {
      const msg = 'CORS: Aucune origine valide configuree en production! Definissez FRONTEND_URL et/ou CORS_ALLOWED_ORIGINS avec des URLs https://.';
      logger.error(msg);
      throw new Error(msg);
    }
  } else {
    // Dev / test: autorise localhost + FRONTEND_URL si fourni
    DEV_ORIGINS.forEach((o) => origins.add(o));
    if (process.env.FRONTEND_URL) {
      push(process.env.FRONTEND_URL, 'FRONTEND_URL');
    }
    if (process.env.CORS_ALLOWED_ORIGINS) {
      process.env.CORS_ALLOWED_ORIGINS
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
        .forEach((o) => push(o, 'CORS_ALLOWED_ORIGINS'));
    }
  }

  return Array.from(origins);
}

const allowedOrigins = buildAllowedOrigins();
const ALLOW_NO_ORIGIN_BYPASS = process.env.CORS_ALLOW_NO_ORIGIN === 'true';

// ============================================================================
// LOGS AU BOOT
// ============================================================================
if (!IS_PRODUCTION && !IS_TEST) {
  logger.info('CORS - Origines autorisees', { origins: allowedOrigins });
}
if (IS_PRODUCTION && ALLOW_NO_ORIGIN_BYPASS) {
  logger.warn('CORS_ALLOW_NO_ORIGIN=true en production: toute requete sans Origin sera autorisee, meme les mutations. A desactiver des que possible.');
}

// ============================================================================
// SAMPLING des logs pour limiter le bruit (1% en prod, 100% en dev)
// ============================================================================
function shouldSample() {
  if (!IS_PRODUCTION) return true;
  return Math.random() < 0.01;
}

function safeClientInfo(req) {
  return {
    ip: req.ip || req.socket?.remoteAddress,
    method: req.method,
    path: req.originalUrl || req.url,
    userAgent: req.get?.('User-Agent')?.slice(0, 120)
  };
}

// ============================================================================
// DELEGATE: decide par requete
// ============================================================================
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
  maxAge: IS_PRODUCTION ? 86400 : 3600,
  optionsSuccessStatus: 200
};

const corsOptionsDelegate = (req, callback) => {
  const origin = req.header('Origin');
  const method = req.method;

  // Cas 1: Origin present → whitelist stricte
  if (origin) {
    if (allowedOrigins.includes(origin)) {
      return callback(null, { ...baseCorsOptions, origin: true });
    }
    // Log systematique en prod aussi (tracabilite des tentatives d'abus)
    logger.warn('CORS: origine refusee', {
      origin,
      ...safeClientInfo(req),
      allowedCount: allowedOrigins.length
    });
    return callback(new Error('Origine non autorisee'));
  }

  // Cas 2: pas d'Origin
  //  - Dev: tout passe
  //  - Prod: methodes safe (pas de risque CSRF), sauf si bypass explicite
  if (IS_DEVELOPMENT || IS_TEST) {
    return callback(null, { ...baseCorsOptions, origin: true });
  }

  if (SAFE_METHODS.includes(method)) {
    return callback(null, { ...baseCorsOptions, origin: true });
  }

  if (ALLOW_NO_ORIGIN_BYPASS) {
    if (shouldSample()) {
      logger.warn('CORS: requete sans Origin autorisee via CORS_ALLOW_NO_ORIGIN', safeClientInfo(req));
    }
    return callback(null, { ...baseCorsOptions, origin: true });
  }

  logger.warn('CORS: requete sans Origin refusee (mutation en prod)', safeClientInfo(req));
  return callback(new Error('Requetes sans origin non autorisees en production'));
};

module.exports = cors(corsOptionsDelegate);
module.exports.allowedOrigins = allowedOrigins;
module.exports.validateOrigin = validateOrigin;
module.exports._internal = {
  corsOptionsDelegate,
  SAFE_METHODS,
  ALLOW_NO_ORIGIN_BYPASS
};
