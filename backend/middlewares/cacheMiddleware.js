// middlewares/cacheMiddleware.js
const NodeCache = require('node-cache');

// Instance de cache en mémoire
const cache = new NodeCache({
  stdTTL: 300, // TTL par défaut: 5 minutes
  checkperiod: 60, // Vérification des expirations toutes les 60 secondes
  useClones: false, // Améliore les performances
  deleteOnExpire: true
});

// Statistiques du cache
let cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  clears: 0
};

// Helper pour générer une clé de cache unique
const generateCacheKey = (req) => {
  const { originalUrl, method } = req;
  const userId = req.user?.id_user || 'anonymous';
  
  // Inclure les paramètres importants dans la clé
  const params = {
    ...req.query,
    ...req.params,
    userId: userId
  };
  
  // Créer une clé unique basée sur l'URL, la méthode et les paramètres
  const paramsString = JSON.stringify(params, Object.keys(params).sort());
  return `${method}:${originalUrl}:${paramsString}`;
};

// Helper pour déterminer si une réponse peut être mise en cache
const isCacheable = (req, res) => {
  // Ne pas mettre en cache les requêtes autres que GET
  if (req.method !== 'GET') return false;
  
  // Ne pas mettre en cache les erreurs (sauf 404 parfois)
  if (res.statusCode >= 400) return false;
  
  // Ne pas mettre en cache si l'en-tête no-cache est présent
  if (req.headers['cache-control'] === 'no-cache') return false;
  
  // Ne pas mettre en cache certaines routes sensibles
  const nonCacheableRoutes = [
    '/notifications',
    '/dashboard',
    '/auth',
    '/login',
    '/logout'
  ];
  
  return !nonCacheableRoutes.some(route => req.originalUrl.includes(route));
};

const cacheMiddleware = {
  // Middleware de cache conditionnel avec TTL personnalisé
  conditionalCache: (ttl = 300) => {
    return async (req, res, next) => {
      // Vérifier si la requête est cacheable
      if (!isCacheable(req, res)) {
        return next();
      }
      
      const cacheKey = generateCacheKey(req);
      
      try {
        // Vérifier si les données sont en cache
        const cachedData = cache.get(cacheKey);
        
        if (cachedData) {
          cacheStats.hits++;
          
          // Ajouter des headers de cache
          res.set({
            'X-Cache': 'HIT',
            'X-Cache-Key': cacheKey,
            'X-Cache-TTL': ttl,
            'Cache-Control': `public, max-age=${ttl}`,
            'ETag': `W/"${Date.now()}"` // ETag simple
          });
          
          return res.json(cachedData);
        }
        
        cacheStats.misses++;
        
        // Intercepter la méthode json pour mettre en cache la réponse
        const originalJson = res.json.bind(res);
        
        res.json = function(data) {
          // Ne mettre en cache que les réponses réussies
          if (res.statusCode === 200 && data?.success !== false) {
            cache.set(cacheKey, data, ttl);
            cacheStats.sets++;
            
            res.set({
              'X-Cache': 'MISS',
              'X-Cache-Key': cacheKey,
              'X-Cache-TTL': ttl,
              'Cache-Control': `public, max-age=${ttl}`
            });
          }
          
          return originalJson(data);
        };
        
        next();
      } catch (error) {
        console.error('Erreur cache middleware:', error);
        next();
      }
    };
  },
  
  // Middleware pour invalider le cache sur certaines actions
  invalidateCache: (patterns = []) => {
    return (req, res, next) => {
      try {
        // Invalider le cache pour les patterns spécifiés
        const keys = cache.keys();
        let deletedCount = 0;
        
        keys.forEach(key => {
          if (patterns.some(pattern => key.includes(pattern))) {
            cache.del(key);
            deletedCount++;
          }
        });
        
        if (deletedCount > 0) {
          cacheStats.deletes += deletedCount;
          console.log(`Cache invalidé: ${deletedCount} entrées supprimées`);
        }
        
        next();
      } catch (error) {
        console.error('Erreur invalidation cache:', error);
        next();
      }
    };
  },
  
  // Invalider le cache après modification
  invalidateOnChange: (resourceType) => {
    return (req, res, next) => {
      const originalJson = res.json.bind(res);
      
      res.json = function(data) {
        // Si la modification a réussi, invalider le cache
        if (res.statusCode < 300 && data?.success !== false) {
          const patterns = [];
          
          switch (resourceType) {
            case 'oeuvre':
              patterns.push('/oeuvres', `/oeuvres/${req.params.id}`);
              break;
            case 'evenement':
              patterns.push('/evenements', `/evenements/${req.params.id}`);
              break;
            case 'user':
              patterns.push('/users', `/users/${req.params.id}`);
              break;
            case 'patrimoine':
              patterns.push('/patrimoine', `/patrimoine/sites/${req.params.id}`);
              break;
            default:
              patterns.push(`/${resourceType}`);
          }
          
          const keys = cache.keys();
          patterns.forEach(pattern => {
            keys.forEach(key => {
              if (key.includes(pattern)) {
                cache.del(key);
                cacheStats.deletes++;
              }
            });
          });
        }
        
        return originalJson(data);
      };
      
      next();
    };
  },
  
  // Nettoyer tout le cache
  clearCache: (req, res) => {
    try {
      cache.flushAll();
      cacheStats.clears++;
      
      res.json({
        success: true,
        message: 'Cache vidé avec succès',
        stats: {
          ...cacheStats,
          currentSize: cache.keys().length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Erreur lors du vidage du cache'
      });
    }
  },
  
  // Obtenir les statistiques du cache
  getCacheStats: (req, res) => {
    try {
      const keys = cache.keys();
      const stats = cache.getStats();
      
      res.json({
        success: true,
        data: {
          ...cacheStats,
          currentSize: keys.length,
          nodeStats: stats,
          hitRate: cacheStats.hits / (cacheStats.hits + cacheStats.misses) || 0,
          keys: process.env.NODE_ENV === 'development' ? keys : undefined
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des stats'
      });
    }
  },
  
  // Middleware pour les routes qui ne doivent jamais être mises en cache
  noCache: (req, res, next) => {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });
    next();
  },
  
  // Cache pour les assets statiques
  staticCache: (maxAge = 86400) => { // 24 heures par défaut
    return (req, res, next) => {
      res.set({
        'Cache-Control': `public, max-age=${maxAge}, immutable`,
        'Expires': new Date(Date.now() + maxAge * 1000).toUTCString()
      });
      next();
    };
  },
  
  // Cache personnalisé par utilisateur
  userCache: (ttl = 300) => {
    return async (req, res, next) => {
      if (!req.user) {
        return next();
      }
      
      const cacheKey = `user:${req.user.id_user}:${req.originalUrl}`;
      
      try {
        const cachedData = cache.get(cacheKey);
        
        if (cachedData) {
          cacheStats.hits++;
          res.set('X-Cache', 'HIT-USER');
          return res.json(cachedData);
        }
        
        cacheStats.misses++;
        
        const originalJson = res.json.bind(res);
        res.json = function(data) {
          if (res.statusCode === 200 && data?.success !== false) {
            cache.set(cacheKey, data, ttl);
            cacheStats.sets++;
            res.set('X-Cache', 'MISS-USER');
          }
          return originalJson(data);
        };
        
        next();
      } catch (error) {
        console.error('Erreur user cache:', error);
        next();
      }
    };
  },
  
  // Configuration du cache pour différents types de contenu
  cacheStrategy: {
    // Cache court pour les données qui changent souvent
    short: (req, res, next) => cacheMiddleware.conditionalCache(60)(req, res, next), // 1 minute
    
    // Cache moyen pour les données moyennement stables
    medium: (req, res, next) => cacheMiddleware.conditionalCache(300)(req, res, next), // 5 minutes
    
    // Cache long pour les données stables
    long: (req, res, next) => cacheMiddleware.conditionalCache(3600)(req, res, next), // 1 heure
    
    // Cache très long pour les données très stables
    veryLong: (req, res, next) => cacheMiddleware.conditionalCache(86400)(req, res, next), // 24 heures
  },
  
  // Réchauffer le cache pour certaines routes critiques
  warmCache: async (routes = []) => {
    console.log('🔥 Réchauffement du cache...');
    
    for (const route of routes) {
      try {
        // Simuler une requête pour réchauffer le cache
        // À implémenter selon vos besoins
        console.log(`  ✓ Cache réchauffé pour: ${route}`);
      } catch (error) {
        console.error(`  ✗ Erreur réchauffement cache pour ${route}:`, error);
      }
    }
    
    console.log('✅ Réchauffement du cache terminé');
  }
};

// Nettoyer le cache périodiquement
setInterval(() => {
  const stats = cache.getStats();
  console.log(`📊 Stats cache: ${stats.hits} hits, ${stats.misses} misses, ${stats.keys} clés`);
}, 3600000); // Toutes les heures

// Exporter le middleware
module.exports = cacheMiddleware;