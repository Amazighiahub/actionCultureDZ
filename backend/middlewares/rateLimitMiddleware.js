// middlewares/rateLimitMiddleware.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

let redisClient = null;
if (process.env.REDIS_HOST) {
  redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB || 0,
    retryStrategy: times => Math.min(times * 50, 2000)
  });

  redisClient.on('error', err => console.error('❌ Erreur Redis:', err));
  redisClient.on('connect', () => console.log('✅ Redis connecté pour rate limiting'));
}

const violationsHistory = new Map();

const createRateLimiter = (options) => {
  const baseConfig = {
    windowMs: 1 * 60 * 1000,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      const retryAfter = Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000);
      console.warn(`⚠️ Rate limit atteint pour ${req.user?.email || req.ip} sur ${req.path}`);
      res.status(429).json({
        success: false,
        error: 'Trop de requêtes',
        message: `Limite de ${req.rateLimit.limit} requêtes par ${options.windowMs / 60000} minute(s) dépassée. Réessayez dans ${retryAfter} secondes.`,
        retryAfter,
        resetTime: req.rateLimit.resetTime,
        limit: req.rateLimit.limit,
        remaining: req.rateLimit.remaining,
        current: req.rateLimit.current
      });
    },
    skip: (req) => {
      if (req.user?.Roles?.some(r => r.nom_role === 'Super Admin')) return true;
      if (req.path === '/health' || req.path === '/api/health') return true;
      return false;
    },
    keyGenerator: (req) => req.user?.id_user ? `user_${req.user.id_user}` : req.ip || req.connection.remoteAddress || 'unknown'
  };

  if (process.env.NODE_ENV === 'production' && redisClient) {
    try {
      baseConfig.store = new RedisStore({
        client: redisClient,
        prefix: 'rl:',
        sendCommand: (...args) => redisClient.call(...args),
      });
      console.log('✅ Rate limiter utilise Redis');
    } catch (error) {
      console.warn('⚠️ Impossible d\'utiliser Redis pour le rate limiting:', error);
    }
  }

  return rateLimit({ ...baseConfig, ...options });
};

const getUserRequestHistory = async (userId) => {
  const history = violationsHistory.get(userId) || {
    violations: 0,
    recentViolations: 0,
    totalRequests: 0,
    lastViolation: null
  };
  if (history.lastViolation && Date.now() - history.lastViolation > 24 * 60 * 60 * 1000) {
    history.recentViolations = 0;
  }
  return history;
};

const logRateLimitViolation = (userId, path) => {
  const history = violationsHistory.get(userId) || {
    violations: 0,
    recentViolations: 0,
    totalRequests: 0,
    lastViolation: null
  };
  history.violations++;
  history.recentViolations++;
  history.lastViolation = Date.now();
  violationsHistory.set(userId, history);
  console.warn(`📊 Violation enregistrée pour ${userId} sur ${path}. Total: ${history.violations}`);
};

const adaptiveRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: async (req) => {
    const userId = req.user?.id_user || req.ip;
    const history = await getUserRequestHistory(userId);
    if (history.violations === 0 && history.totalRequests > 100) return 800;
    if (history.recentViolations > 0) return Math.max(100, 500 - (history.recentViolations * 100));
    return 500;
  },
  handler: (req, res) => {
    const userId = req.user?.id_user || req.ip;
    logRateLimitViolation(userId, req.path);
    res.status(429).json({
      success: false,
      message: 'Trop de requêtes. Veuillez réessayer plus tard.'
    });
  }
});

const generalLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: 'Trop de requêtes globales'
});

const creationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Trop de créations sur une courte période'
});

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Trop de tentatives d\'authentification'
});

const sensitiveActionsLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: 'Trop d\'actions sensibles en peu de temps'
});

module.exports = {
  adaptive: [adaptiveRateLimiter],
  general: [generalLimiter],
  creation: [creationLimiter],
  auth: [authLimiter],
  sensitiveActions: [sensitiveActionsLimiter],
  createLimiter: createRateLimiter
};
