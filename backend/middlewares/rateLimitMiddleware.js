// middlewares/rateLimiter.js
const rateLimit = require('express-rate-limit');
const rateLimitRedis = require('rate-limit-redis');
const RedisStore = rateLimitRedis?.RedisStore || rateLimitRedis?.default || rateLimitRedis;
const { getClient: getRedisClient } = require('../utils/redisClient');
const logger = require('../utils/logger');

// ✅ SÉCURITÉ: Configuration Redis pour rate limiting distribué
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const USE_REDIS = process.env.USE_REDIS_RATE_LIMIT === 'true' || IS_PRODUCTION;

// Configuration Redis — réutilise le client partagé (utils/redisClient)
let redisClient = null;
let redisStore = null;

const createRedisStore = (options) => {
  if (typeof RedisStore !== 'function') {
    throw new Error('RedisStore export incompatible');
  }

  // Certaines versions exportent une classe, d'autres une factory
  try {
    return new RedisStore(options);
  } catch (e) {
    return RedisStore(options);
  }
};

if (USE_REDIS) {
  try {
    redisClient = getRedisClient();

    if (redisClient) {
      // Créer le store Redis via le client partagé
      redisStore = createRedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
      });
      logger.info('Rate limiting avec Redis activé (client partagé)');
    } else {
      logger.warn('Redis client non disponible, utilisation du store en mémoire');
    }
  } catch (error) {
    logger.warn('Redis non disponible, utilisation du store en mémoire:', error.message);
    redisStore = null;
  }
} else {
  logger.info('Rate limiting avec store en mémoire (dev mode)');
}

// 1. Rate limiter global (pour toutes les routes)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: IS_PRODUCTION ? 100 : 1000, // 100 en prod, 1000 en dev
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: req.t ? req.t('auth.tooManyRequests') : 'Too many requests',
      retryAfter: new Date(Date.now() + 15 * 60 * 1000)
    });
  },
  standardHeaders: false, // Ne pas exposer les headers RateLimit-*
  legacyHeaders: false,
  // ✅ SÉCURITÉ: Utiliser Redis en production pour scalabilité
  ...(redisStore && { store: redisStore }),
});

// 2. Rate limiter strict pour les endpoints sensibles
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: IS_PRODUCTION ? 5 : 100, // 5 en prod, 100 en dev
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: req.t ? req.t('auth.tooManyRequests') : 'Too many requests'
    });
  },
  // ✅ SÉCURITÉ: Redis en production
  ...(redisStore && { store: redisStore }),
});

// 3. Rate limiter pour la création de contenu (POST/PUT/PATCH/DELETE uniquement)
const createContentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 20, // 20 créations par heure
  skip: (req) => req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS',
  keyGenerator: (req) => req.user?.id_user || req.ip,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: req.t ? req.t('auth.tooManyRequests') : 'Creation limit reached'
    });
  },
  // ✅ SÉCURITÉ: Redis en production
  ...(redisStore && { store: redisStore }),
});

// 3b. Rate limiter spécifique commentaires (10/min/user)
const commentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 commentaires par minute
  keyGenerator: (req) => req.user?.id_user || req.ip,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: req.t ? req.t('auth.tooManyRequests') : 'Too many comments, please slow down'
    });
  },
  ...(redisStore && { store: redisStore }),
});

// 3c. Rate limiter spécifique uploads authentifiés (30/h/user)
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: IS_PRODUCTION ? 30 : 200, // 30 uploads/h en prod
  keyGenerator: (req) => req.user?.id_user || req.ip,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: req.t ? req.t('auth.tooManyRequests') : 'Upload limit reached, please try again later'
    });
  },
  ...(redisStore && { store: redisStore }),
});

// 3d. Rate limiter strict pour uploads PUBLICS (sans auth) — 5/h/IP
const publicUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: IS_PRODUCTION ? 5 : 50, // 5 uploads/h par IP en prod
  keyGenerator: (req) => req.ip,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: req.t ? req.t('auth.tooManyRequests') : 'Public upload limit reached, please try again later',
      code: 'PUBLIC_UPLOAD_RATE_LIMITED'
    });
  },
  ...(redisStore && { store: redisStore }),
});

// 4. Rate limiter pour les vues/statistiques
const viewLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // 30 vues par 5 minutes
  keyGenerator: (req) => {
    // Clé unique par IP + ID de l'œuvre
    return `${req.ip}:${req.params.id}`;
  },
  skip: (req) => {
    // Skip pour les utilisateurs authentifiés premium
    return req.user?.isPremium === true;
  }
});

// 5. Rate limiter dynamique basé sur le rôle
const dynamicLimiter = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: (req) => {
      // Limites différentes selon le rôle
      if (req.user?.role === 'admin') return 1000;
      if (req.user?.role === 'premium') return 500;
      if (req.user) return 200;
      return options.max || 50; // Non authentifié
    },
    keyGenerator: (req) => {
      // Utiliser l'ID utilisateur si authentifié, sinon l'IP
      return req.user?.id_user || req.ip;
    },
    ...options
  });
};

// 6. Rate limiter avec slowdown progressif
const speedLimiter = require('express-slow-down');

const progressiveLimiter = speedLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Commence à ralentir après 50 requêtes
  delayMs: (hits) => hits * 100, // Ajoute 100ms de délai par requête supplémentaire
  maxDelayMs: 5000, // Maximum 5 secondes de délai
  // store: new RedisStore({ client: redisClient }), // Pour Redis
});

// 7. Configuration avancée avec gestion des IPs trustées
const advancedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => {
    // Liste blanche d'IPs
    const trustedIPs = ['127.0.0.1', '::1', ...process.env.TRUSTED_IPS?.split(',') || []];
    return trustedIPs.includes(req.ip);
  },
  keyGenerator: (req) => {
    // Utiliser req.ip qui respecte la configuration trust proxy d'Express
    return req.ip;
  },
  handler: async (req, res) => {
    // Log des tentatives excessives
    logger.warn(`Rate limit atteint pour ${req.ip} sur ${req.path}`);
    
    // Optionnel : Enregistrer dans la base de données
    if (req.user) {
      await logRateLimitViolation(req.user.id_user, req.path, req.ip);
    }
    
    res.status(429).json({
      success: false,
      error: req.t ? req.t('auth.tooManyRequests') : 'Too many requests'
    });
  }
});

// 8. Rate limiter par endpoint avec configuration
// Handler commun pour les réponses 429 (JSON propre + i18n)
const authRateLimitHandler = (req, res) => {
  res.status(429).json({
    success: false,
    error: req.t ? req.t('auth.tooManyRequests') : 'Too many requests, please try again later.',
    code: 'RATE_LIMITED',
  });
};

const endpointLimiters = {
  login: rateLimit({
    windowMs: 60 * 60 * 1000,          // 1 heure
    max: IS_PRODUCTION ? 15 : 100,      // 15 tentatives/h en prod
    skipSuccessfulRequests: true,        // Ne compter que les échecs (brute force)
    standardHeaders: false,
    legacyHeaders: false,
    handler: authRateLimitHandler,
    ...(redisStore && { store: redisStore }),
  }),

  register: rateLimit({
    windowMs: 60 * 60 * 1000,           // 1 heure
    max: IS_PRODUCTION ? 5 : 50,         // 5 inscriptions/h par IP en prod
    skipSuccessfulRequests: false,
    standardHeaders: false,
    legacyHeaders: false,
    handler: authRateLimitHandler,
    ...(redisStore && { store: redisStore }),
  }),

  forgotPassword: rateLimit({
    windowMs: 60 * 60 * 1000,           // 1 heure
    max: IS_PRODUCTION ? 10 : 50,        // 10 demandes/h en prod
    skipSuccessfulRequests: false,
    standardHeaders: false,
    legacyHeaders: false,
    handler: authRateLimitHandler,
    ...(redisStore && { store: redisStore }),
  }),

  apiKey: rateLimit({
    windowMs: 24 * 60 * 60 * 1000,     // 24 heures
    max: 5,
    standardHeaders: false,
    legacyHeaders: false,
    handler: authRateLimitHandler,
    ...(redisStore && { store: redisStore }),
  })
};

// ============================================================================
// 9. RATE LIMITING PAR COMPTE (Protection brute force distribué)
// ============================================================================

class AccountRateLimiter {
  constructor(options = {}) {
    this.maxAttempts = options.maxAttempts || 5;
    this.lockoutDuration = options.lockoutDuration || 15 * 60 * 1000;
    this.cleanupInterval = options.cleanupInterval || 5 * 60 * 1000;
    this.redis = options.redis || null;
    this.localStore = new Map();

    const timer = setInterval(() => this._cleanup(), this.cleanupInterval);
    if (typeof timer.unref === 'function') {
      timer.unref();
    }
  }

  async _getAttempts(key) {
    if (this.redis) {
      try {
        const data = await this.redis.get(`lockout:${key}`);
        return data ? JSON.parse(data) : null;
      } catch { /* fallback to local */ }
    }
    return this.localStore.get(key) || null;
  }

  async _setAttempts(key, data) {
    if (this.redis) {
      try {
        await this.redis.set(`lockout:${key}`, JSON.stringify(data), { PX: this.lockoutDuration });
        return;
      } catch { /* fallback to local */ }
    }
    this.localStore.set(key, data);
  }

  async _deleteAttempts(key) {
    if (this.redis) {
      try { await this.redis.del(`lockout:${key}`); return; } catch { /* fallback to local */ }
    }
    this.localStore.delete(key);
  }

  _cleanup() {
    const now = Date.now();
    for (const [email, data] of this.localStore.entries()) {
      if (now > data.lockoutUntil && now - data.lastAttempt > this.lockoutDuration) {
        this.localStore.delete(email);
      }
    }
  }

  checkAccountLock = (req, res, next) => {
    const email = req.body?.email?.toLowerCase();
    if (!email) return next();

    this._getAttempts(email).then(attempts => {
      if (attempts && Date.now() < attempts.lockoutUntil) {
        const remainingTime = Math.ceil((attempts.lockoutUntil - Date.now()) / 1000 / 60);
        return res.status(429).json({
          success: false,
          error: req.t ? req.t('auth.accountLocked', { attempts: this.maxAttempts }) : `Account temporarily locked after ${this.maxAttempts} failed attempts.`,
          message: req.t ? req.t('auth.retryIn', { minutes: remainingTime }) : `Retry in ${remainingTime} minute(s).`,
          retryAfter: attempts.lockoutUntil,
          code: 'ACCOUNT_LOCKED'
        });
      }
      next();
    }).catch(() => next());
  };

  recordFailedAttempt = async (email) => {
    if (!email) return;
    email = email.toLowerCase();

    const now = Date.now();
    const attempts = (await this._getAttempts(email)) || {
      count: 0,
      lastAttempt: now,
      lockoutUntil: 0
    };

    attempts.count++;
    attempts.lastAttempt = now;

    if (attempts.count >= this.maxAttempts) {
      attempts.lockoutUntil = now + this.lockoutDuration;
      logger.warn(`Compte bloqué: ${email} après ${attempts.count} tentatives échouées`);
    }

    await this._setAttempts(email, attempts);
    return attempts;
  };

  resetAttempts = async (email) => {
    if (!email) return;
    await this._deleteAttempts(email.toLowerCase());
  };

  getAttemptStatus = async (email) => {
    if (!email) return null;
    return await this._getAttempts(email.toLowerCase());
  };
}

const accountRateLimiter = new AccountRateLimiter({
  maxAttempts: 5,
  lockoutDuration: 15 * 60 * 1000,
  cleanupInterval: 5 * 60 * 1000,
  redis: redisClient
});

// Fonction helper pour logger les violations
async function logRateLimitViolation(userId, endpoint, ip) {
  logger.warn(`Rate limit violation: User ${userId} on ${endpoint} from ${ip}`);
}

module.exports = {
  globalLimiter,
  strictLimiter,
  createContentLimiter,
  commentLimiter,
  uploadLimiter,
  viewLimiter,
  dynamicLimiter,
  progressiveLimiter,
  advancedLimiter,
  endpointLimiters,
  accountRateLimiter, // Rate limiting par compte email

  // Arrays expected by app.js
  auth: [
    endpointLimiters.login,
    endpointLimiters.register,
    endpointLimiters.forgotPassword
  ].filter(Boolean),
  creation: [createContentLimiter],
  upload: [uploadLimiter],
  publicUpload: [publicUploadLimiter],
  sensitiveActions: [strictLimiter],
  general: [globalLimiter]
};