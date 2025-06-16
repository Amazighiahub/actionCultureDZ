// middlewares/rateLimitMiddleware.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

// Configuration Redis (optionnel mais recommandé pour la production)
let redisClient = null;
if (process.env.REDIS_HOST) {
  redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB || 0,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  });

  redisClient.on('error', (err) => {
    console.error('❌ Erreur Redis:', err);
  });

  redisClient.on('connect', () => {
    console.log('✅ Redis connecté pour rate limiting');
  });
}

// Configuration de base du rate limiter
const createRateLimiter = (options) => {
  const baseConfig = {
    windowMs: 1 * 60 * 1000, // 1 minute par défaut
    standardHeaders: true, // Retourne les headers `RateLimit-*`
    legacyHeaders: false, // Désactive les headers `X-RateLimit-*`
    
    // Handler personnalisé pour les erreurs 429
    handler: (req, res) => {
      const retryAfter = Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000);
      
      // Logger l'incident
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
    
    // Fonction pour ignorer certaines requêtes
    skip: (req) => {
      // Exemption pour les Super Admins
      if (req.user?.Roles?.some(r => r.nom_role === 'Super Admin')) {
        return true;
      }
      
      // Exemption pour les requêtes de santé
      if (req.path === '/health' || req.path === '/api/health') {
        return true;
      }
      
      return false;
    },
    
    // Générateur de clé unique par utilisateur ou IP
    keyGenerator: (req) => {
      // Priorité : utilisateur authentifié > IP
      if (req.user?.id_user) {
        return `user_${req.user.id_user}`;
      }
      
      // Fallback sur l'IP (en tenant compte des proxies)
      return req.ip || req.connection.remoteAddress || 'unknown';
    },
    
    // Message personnalisé
    message: async (req, res) => {
      return `Trop de requêtes depuis cet utilisateur/IP, veuillez réessayer après ${options.windowMs / 60000} minute(s)`;
    }
  };

  // Utiliser Redis si disponible (recommandé pour plusieurs serveurs)
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

// Middleware pour ajouter les headers de rate limit même en succès
const addRateLimitHeaders = (req, res, next) => {
  if (req.rateLimit) {
    res.setHeader('X-RateLimit-Limit', req.rateLimit.limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, req.rateLimit.remaining));
    res.setHeader('X-RateLimit-Reset', new Date(req.rateLimit.resetTime).toISOString());
    
    // Ajouter un header personnalisé pour le temps restant
    const retryAfter = Math.max(0, Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000));
    if (retryAfter > 0) {
      res.setHeader('X-RateLimit-Retry-After', retryAfter);
    }
  }
  next();
};

// Limiteurs spécifiques avec configuration améliorée
const generalLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requêtes par minute
  message: 'Limite générale de 100 requêtes par minute dépassée',
  skipSuccessfulRequests: false,
  skipFailedRequests: true, // Ne pas compter les erreurs 5xx
});

const sensitiveActionsLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 actions sensibles par 5 minutes
  message: 'Limite d\'actions sensibles atteinte (10 par 5 minutes)',
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  // Délai progressif après un certain nombre de requêtes
  delayAfter: 5, // Commencer à ralentir après 5 requêtes
  delayMs: (hits) => {
    // Délai exponentiel : 0ms, 1000ms, 2000ms, 4000ms...
    return hits > 5 ? Math.pow(2, hits - 5) * 1000 : 0;
  },
});

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives par 15 minutes
  skipFailedRequests: false, // Compter toutes les tentatives
  skipSuccessfulRequests: true, // Ne pas compter les connexions réussies
  message: 'Trop de tentatives d\'authentification. Compte temporairement verrouillé.',
});

const creationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 20, // 20 créations par heure
  message: 'Limite de création de contenu atteinte (20 par heure)',
  skipFailedRequests: true,
});

const uploadLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // 10 uploads par 10 minutes
  message: 'Limite d\'upload atteinte (10 fichiers par 10 minutes)',
  skipFailedRequests: true,
});

const searchLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 recherches par minute
  message: 'Trop de recherches. Veuillez patienter.',
  skipFailedRequests: true,
});

// Middleware de rate limiting dynamique basé sur le rôle
const dynamicRateLimiter = (baseLimit = 100) => {
  return (req, res, next) => {
    let limit = baseLimit;
    
    // Augmenter la limite pour certains rôles
    if (req.user?.Roles) {
      if (req.user.Roles.some(r => r.nom_role === 'Admin')) {
        limit = limit * 2; // Double pour les admins
      } else if (req.user.Roles.some(r => r.nom_role === 'Moderateur')) {
        limit = Math.floor(limit * 1.5); // 50% de plus pour les modérateurs
      }
    }
    
    // Créer un limiteur avec la limite ajustée
    const limiter = createRateLimiter({
      windowMs: 1 * 60 * 1000,
      max: limit,
      message: `Limite de ${limit} requêtes par minute dépassée`
    });
    
    limiter(req, res, next);
  };
};

// Fonction pour réinitialiser le rate limit d'un utilisateur (admin)
const resetRateLimit = async (userId) => {
  if (!redisClient) {
    console.warn('⚠️ Redis non disponible pour reset rate limit');
    return false;
  }
  
  try {
    const keys = await redisClient.keys(`rl:user_${userId}:*`);
    if (keys.length > 0) {
      await redisClient.del(...keys);
      console.log(`✅ Rate limit réinitialisé pour l'utilisateur ${userId}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Erreur reset rate limit:', error);
    return false;
  }
};

// Middleware pour logger les rate limits approchants
const rateLimitWarning = (threshold = 0.8) => {
  return (req, res, next) => {
    if (req.rateLimit) {
      const { limit, remaining } = req.rateLimit;
      const used = limit - remaining;
      const percentage = used / limit;
      
      if (percentage >= threshold) {
        console.warn(`⚠️ Rate limit warning: ${req.user?.email || req.ip} a utilisé ${Math.round(percentage * 100)}% de sa limite sur ${req.path}`);
      }
    }
    next();
  };
};
// Ajoutez ceci dans votre fichier rateLimitMiddleware.js avant le module.exports :

// Limiteur adaptatif qui ajuste la limite selon l'historique de l'utilisateur
const adaptiveLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requêtes par minute par défaut
  message: 'Limite de requêtes adaptative dépassée',
  skipSuccessfulRequests: false,
  skipFailedRequests: true,
});

// Puis modifiez votre module.exports pour inclure adaptive :

module.exports = {
  // Limiteurs principaux avec headers
  general: [generalLimiter, addRateLimitHeaders, rateLimitWarning()],
  sensitiveActions: [sensitiveActionsLimiter, addRateLimitHeaders, rateLimitWarning(0.5)],
  auth: [authLimiter, addRateLimitHeaders],
  creation: [creationLimiter, addRateLimitHeaders, rateLimitWarning(0.7)],
  upload: [uploadLimiter, addRateLimitHeaders],
  search: [searchLimiter, addRateLimitHeaders],
  
  // AJOUTER CETTE LIGNE :
  adaptive: [adaptiveLimiter, addRateLimitHeaders, rateLimitWarning()],
  
  // Limiteur dynamique
  dynamic: dynamicRateLimiter,
  
  // Utilitaires
  addHeaders: addRateLimitHeaders,
  warning: rateLimitWarning,
  resetUserLimit: resetRateLimit,
  
  // Accès direct aux créateurs pour configuration personnalisée
  createLimiter: createRateLimiter
};