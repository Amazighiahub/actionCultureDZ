// middlewares/cacheMiddleware.js - Middleware de gestion du cache

// Simuler un cache en mémoire simple (en production, utilisez Redis)
const cache = new Map();

// Fonction helper pour créer un middleware de cache
function createCacheMiddleware(ttl = 300) {
  return (req, res, next) => {
    // Ne pas mettre en cache les requêtes non-GET
    if (req.method !== 'GET') {
      return next();
    }

    const key = req.originalUrl || req.url;
    const cachedData = cache.get(key);

    // Vérifier si les données sont en cache et valides
    if (cachedData && cachedData.expiry > Date.now()) {
      console.log(`📦 Cache hit: ${key}`);
      return res.json(cachedData.data);
    }

    // Intercepter res.json pour mettre en cache la réponse
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      // Mettre en cache avec expiration
      cache.set(key, {
        data: data,
        expiry: Date.now() + (ttl * 1000)
      });
      console.log(`💾 Cached: ${key} for ${ttl}s`);
      
      // Nettoyer les anciennes entrées
      cleanupCache();
      
      return originalJson(data);
    };

    next();
  };
}

// Fonction pour créer un cache utilisateur
function createUserCacheMiddleware(ttl = 300) {
  return (req, res, next) => {
    if (req.method !== 'GET' || !req.user) {
      return next();
    }

    const key = `user:${req.user.id_user}:${req.originalUrl || req.url}`;
    const cachedData = cache.get(key);

    if (cachedData && cachedData.expiry > Date.now()) {
      console.log(`📦 User cache hit: ${key}`);
      return res.json(cachedData.data);
    }

    const originalJson = res.json.bind(res);
    res.json = function(data) {
      cache.set(key, {
        data: data,
        expiry: Date.now() + (ttl * 1000)
      });
      console.log(`💾 User cached: ${key} for ${ttl}s`);
      return originalJson(data);
    };

    next();
  };
}

// Fonction pour invalider le cache
function createInvalidateCacheMiddleware(patterns = []) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      // Invalider les patterns spécifiés après la réponse
      patterns.forEach(pattern => {
        for (const key of cache.keys()) {
          if (key.includes(pattern)) {
            cache.delete(key);
            console.log(`🗑️ Cache invalidated: ${key}`);
          }
        }
      });
      
      return originalJson(data);
    };

    next();
  };
}

const cacheMiddleware = {
  /**
   * Cache conditionnel avec TTL
   */
  conditionalCache: createCacheMiddleware,

  /**
   * Cache pour les données utilisateur
   */
  userCache: createUserCacheMiddleware,

  /**
   * Invalider le cache
   */
  invalidateCache: createInvalidateCacheMiddleware,

  /**
   * Invalider le cache lors de changements
   */
  invalidateOnChange: (resourceType) => {
    return createInvalidateCacheMiddleware([`/${resourceType}`]);
  },

  /**
   * Vider le cache
   */
  clearCache: (type = 'all') => {
    if (type === 'all') {
      cache.clear();
      console.log('🧹 Cache entièrement vidé');
    } else {
      let count = 0;
      for (const key of cache.keys()) {
        if (key.includes(type)) {
          cache.delete(key);
          count++;
        }
      }
      console.log(`🧹 ${count} entrées de cache vidées pour: ${type}`);
    }
  },

  /**
   * Obtenir les statistiques du cache
   */
  getStats: () => {
    let validEntries = 0;
    let expiredEntries = 0;
    const now = Date.now();

    for (const [key, value] of cache.entries()) {
      if (value.expiry > now) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: cache.size,
      validEntries,
      expiredEntries,
      memoryUsage: process.memoryUsage().heapUsed
    };
  }
};

// Ajouter les stratégies de cache après la définition de l'objet
cacheMiddleware.cacheStrategy = {
  short: createCacheMiddleware(60),      // 1 minute
  medium: createCacheMiddleware(300),    // 5 minutes  
  long: createCacheMiddleware(3600),     // 1 heure
  veryLong: createCacheMiddleware(86400) // 24 heures
};

// Nettoyer automatiquement les entrées expirées
function cleanupCache() {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, value] of cache.entries()) {
    if (value.expiry <= now) {
      cache.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 Nettoyé ${cleaned} entrées expirées du cache`);
  }
}

// Nettoyer périodiquement (toutes les 5 minutes)
const cleanupInterval = setInterval(cleanupCache, 5 * 60 * 1000);
if (typeof cleanupInterval.unref === 'function') {
  cleanupInterval.unref();
}

module.exports = cacheMiddleware;