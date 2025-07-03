// middlewares/rateLimiter.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

// Configuration Redis (optionnel, pour environnement distribué)
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD
});

// 1. Rate limiter global (pour toutes les routes)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes par fenêtre
  message: {
    success: false,
    error: 'Trop de requêtes, veuillez réessayer plus tard.',
    retryAfter: new Date(Date.now() + 15 * 60 * 1000)
  },
  standardHeaders: true, // Retourne les headers `RateLimit-*`
  legacyHeaders: false, // Désactive les headers `X-RateLimit-*`
  // store: new RedisStore({ client: redisClient }), // Décommenter pour Redis
});

// 2. Rate limiter strict pour les endpoints sensibles
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requêtes max
  skipSuccessfulRequests: false,
  message: {
    success: false,
    error: 'Limite atteinte pour cette action. Réessayez dans 15 minutes.'
  }
});

// 3. Rate limiter pour la création de contenu
const createContentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 20, // 20 créations par heure
  skipSuccessfulRequests: true, // Ne compte que les échecs
  keyGenerator: (req) => req.user?.id_user || req.ip,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Vous avez atteint la limite de création d\'œuvres (20 par heure)',
      remainingTime: req.rateLimit.resetTime
    });
  }
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
    // Utiliser le header X-Forwarded-For si derrière un proxy
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip;
  },
  handler: async (req, res) => {
    // Log des tentatives excessives
    console.warn(`⚠️ Rate limit atteint pour ${req.ip} sur ${req.path}`);
    
    // Optionnel : Enregistrer dans la base de données
    if (req.user) {
      await logRateLimitViolation(req.user.id_user, req.path, req.ip);
    }
    
    res.status(429).json({
      success: false,
      error: 'Trop de requêtes',
      retryAfter: req.rateLimit.resetTime,
      limit: req.rateLimit.limit,
      current: req.rateLimit.current,
      remaining: req.rateLimit.remaining
    });
  }
});

// 8. Rate limiter par endpoint avec configuration
const endpointLimiters = {
  login: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true
  }),
  
  register: rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: 'Trop de tentatives d\'inscription'
  }),
  
  forgotPassword: rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    skipSuccessfulRequests: false
  }),
  
  apiKey: rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 heures
    max: 5,
    message: 'Limite de génération de clés API atteinte'
  })
};

// Fonction helper pour logger les violations
async function logRateLimitViolation(userId, endpoint, ip) {
  // Implémenter selon vos besoins
  console.log(`Rate limit violation: User ${userId} on ${endpoint} from ${ip}`);
}

module.exports = {
  globalLimiter,
  strictLimiter,
  createContentLimiter,
  viewLimiter,
  dynamicLimiter,
  progressiveLimiter,
  advancedLimiter,
  endpointLimiters,
  
  // Arrays expected by app.js
  auth: [
    endpointLimiters.login,
    endpointLimiters.register,
    endpointLimiters.forgotPassword
  ].filter(Boolean), 
  creation: [createContentLimiter],
  sensitiveActions: [strictLimiter],
  general: [globalLimiter]
};