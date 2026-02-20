// routes/index.js - VERSION AMÉLIORÉE AVEC DOCUMENTATION DYNAMIQUE
const express = require('express');
const router = express.Router();

// ========================================================================
// IMPORTS DES ROUTES
// ========================================================================
const initOeuvreRoutes = require('./oeuvreRoutes');
const initUserRoutes = require('./userRoutes');
const initEvenementRoutes = require('./evenementRoutes');
const initLieuRoutes = require('./lieuRoutes');
const initPatrimoineRoutes = require('./patrimoineRoutes');
const initCommentaireRoutes = require('./commentaireRoutes');
const initMetadataRoutes = require('./metadataRoutes');
const initUploadRoutes = require('./uploadRoutes');
const initArtisanatRoutes = require('./artisanatRoutes');
const initFavoriRoutes = require('./favoriRoutes');
const initDashboardRoutes = require('./dashboardRoutes');
const initProfessionnelRoutes = require('./professionnelRoutes');
const initProgrammeRoutes = require('./programmeRoutes');
const initParcoursIntelligentRoutes = require('./parcoursIntelligentRoutes');
const initNotificationRoutes = require('./notificationRoutes');
const initIntervenantRoutes = require('./intervenantRoutes');
const initServiceRoutes = require('./servicesRoutes');
const initSignalementRoutes  = require('./signalementRoutes')
const initTrackingRoutes = require('./trackingRoutes');
const initEmailVerificationRoutes = require('./emailVerificationRoutes');
// CORRECTION: Les routes admin sont dans le dossier admin/
const initAdminOeuvresRoutes = require('./admin/adminOeuvresRoutes');
const initAdminEvenementsRoutes = require('./admin/adminEvenementsRoutes');
const initAdminPatrimoineRoutes = require('./admin/adminPatrimoineRoutes');
const initAdminServicesRoutes = require('./admin/adminServicesRoutes');
const initArticleBlockRoutes = require('./articleBlockRoutes');
const initOrganisationRoutes = require('./organisationRoutes');
// ========================================================================
// FONCTIONS UTILITAIRES
// ========================================================================

/**
 * Extrait toutes les routes d'un router Express de manière récursive
 * @param {Router} router - Le router Express à analyser
 * @param {string} basePath - Le chemin de base
 * @returns {Array} Liste des routes avec leurs métadonnées
 */
const extractRoutes = (router, basePath = '') => {
  const routes = [];
  
  router.stack.forEach(layer => {
    if (layer.route) {
      // Route directe
      const path = basePath + layer.route.path;
      const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
      
      methods.forEach(method => {
        routes.push({
          method,
          path,
          middlewares: layer.route.stack
            .filter(l => l.name && l.name !== '<anonymous>')
            .map(l => l.name)
        });
      });
    } else if (layer.name === 'router' && layer.handle.stack) {
      // Sous-router
      const regexp = layer.regexp.source;
      let subPath = regexp
        .replace(/\\/g, '')
        .replace(/\^/g, '')
        .replace(/\$/g, '')
        .replace(/\?(?=\()/g, '')
        .replace(/\(\?\:/g, '(')
        .replace(/\(\?=/g, '(')
        .replace(/[()]/g, '');
      
      // Nettoyer le path
      if (subPath && !subPath.startsWith('/')) {
        subPath = '/' + subPath;
      }
      
      // Récursion pour les sous-routers
      routes.push(...extractRoutes(layer.handle, basePath + subPath));
    }
  });
  
  return routes;
};

/**
 * Groupe les routes par module
 * @param {Array} routes - Liste des routes
 * @returns {Object} Routes groupées par module
 */
const groupRoutesByModule = (routes) => {
  const grouped = {};
  
  routes.forEach(route => {
    // Extraire le module depuis le path
    const pathParts = route.path.split('/').filter(p => p && p !== 'api');
    const module = pathParts[0] || 'root';
    
    if (!grouped[module]) {
      grouped[module] = [];
    }
    
    grouped[module].push({
      method: route.method,
      path: route.path,
      auth: route.middlewares.includes('authenticate') ? 'required' : 'public',
      admin: route.middlewares.includes('requireAdmin'),
      professional: route.middlewares.includes('requireValidatedProfessional')
    });
  });
  
  return grouped;
};

// ========================================================================
// FONCTION PRINCIPALE D'INITIALISATION
// ========================================================================

const initRoutes = (models, authMiddleware) => {
  // Validation des paramètres
  if (!models || !models.sequelize) {
    throw new Error('models doit contenir une instance sequelize');
  }

  if (!authMiddleware || typeof authMiddleware !== 'object') {
    throw new Error('authMiddleware doit être un objet avec les méthodes authenticate, isAdmin, etc.');
  }

  console.log('🔧 Initialisation des routes API...');

  // ========================================================================
  // CHARGEMENT DES MIDDLEWARES
  // ========================================================================
  
  const middlewares = {
    auth: authMiddleware
  };

  // Charger les middlewares additionnels avec gestion d'erreur
  const middlewareLoaders = [
    {
      name: 'cache',
      loader: () => require('../middlewares/cacheMiddleware'),
      fallback: {
        cacheStrategy: {
          short: (req, res, next) => next(),
          medium: (req, res, next) => next(),
          long: (req, res, next) => next(),
          veryLong: (req, res, next) => next()
        },
        conditionalCache: () => (req, res, next) => next(),
        invalidateCache: () => (req, res, next) => next(),
        invalidateOnChange: () => (req, res, next) => next(),
        userCache: () => (req, res, next) => next(),
        noCache: (req, res, next) => next()
      }
    },
    {
      name: 'validation',
      loader: () => require('../middlewares/validationMiddleware'),
      fallback: {
        validatePagination: (req, res, next) => next(),
        validateId: () => (req, res, next) => next(),
        handleValidationErrors: (req, res, next) => next(),
        validateEventCreation: (req, res, next) => next(),
        validateWorkSubmission: (req, res, next) => next()
      }
    },
    {
      name: 'rateLimit',
      loader: () => require('../middlewares/rateLimitMiddleware'),
      fallback: {
        general: (req, res, next) => next(),
        auth: (req, res, next) => next(),
        creation: (req, res, next) => next(),
        adaptive: (req, res, next) => next(),
        sensitiveActions: (req, res, next) => next()
      }
    },
    {
      name: 'security',
      loader: () => require('../middlewares/securityMiddleware'),
      fallback: {
        sanitizeInput: (req, res, next) => next()
      }
    }
  ];

  // Charger chaque middleware
  middlewareLoaders.forEach(({ name, loader, fallback }) => {
    try {
      middlewares[name] = loader();
      console.log(`✅ Middleware ${name} chargé`);
    } catch (error) {
      console.warn(`⚠️ Middleware ${name} non disponible, utilisation du fallback`);
      middlewares[name] = fallback;
    }
  });

  // Gestion spéciale pour le middleware d'audit
  try {
    const auditMiddlewareModule = require('../middlewares/auditMiddleware');
    
    if (auditMiddlewareModule.create) {
      middlewares.audit = auditMiddlewareModule.create(models);
    } else if (auditMiddlewareModule.initialize) {
      middlewares.audit = auditMiddlewareModule.initialize(models);
    } else {
      middlewares.audit = auditMiddlewareModule;
    }
    
    middlewares.audit.actions = auditMiddlewareModule.actions || {
      CREATE_EVENT: 'create_event',
      UPDATE_EVENT: 'update_event',
      DELETE_EVENT: 'delete_event',
      CANCEL_EVENT: 'cancel_event',
      CREATE_OEUVRE: 'create_oeuvre',
      UPDATE_OEUVRE: 'update_oeuvre',
      DELETE_OEUVRE: 'delete_oeuvre'
    };
    
    console.log('✅ Middleware audit initialisé');
  } catch (error) {
    console.warn('⚠️ Middleware audit non disponible');
    middlewares.audit = {
      logAction: () => (req, res, next) => next(),
      logCriticalAction: () => (req, res, next) => next(),
      logDataAccess: () => (req, res, next) => next(),
      logUnauthorizedAccess: (req, res, next) => next(),
      actions: {}
    };
  }

  // ========================================================================
  // ROUTES SYSTÈME
  // ========================================================================

  // Route des statistiques publiques pour la page d'accueil (hero section)
  router.get('/stats/public', async (req, res) => {
    try {
      const { Lieu, Evenement, Oeuvre, User, Artisanat } = models;
      
      // Compter les sites patrimoniaux (lieux)
      const sitesPatrimoniaux = Lieu ? await Lieu.count() : 0;
      
      // Compter les événements actifs (planifiés ou en cours)
      const evenementsActifs = Evenement ? await Evenement.count({
        where: {
          statut: ['planifie', 'en_cours']
        }
      }) : 0;
      
      // Compter toutes les œuvres
      const oeuvres = Oeuvre ? await Oeuvre.count() : 0;
      
      // Compter les artisanats
      const artisanats = Artisanat ? await Artisanat.count() : 0;
      
      // Compter les membres (utilisateurs actifs)
      const membres = User ? await User.count({
        where: {
          statut: 'actif'
        }
      }) : 0;

      // Formater les nombres pour l'affichage
      const formatStat = (num) => {
        if (num >= 10000) return Math.floor(num / 1000) + 'k+';
        if (num >= 1000) return (num / 1000).toFixed(1).replace('.0', '') + 'k+';
        if (num >= 100) return Math.floor(num / 100) * 100 + '+';
        if (num >= 10) return Math.floor(num / 10) * 10 + '+';
        return num.toString();
      };

      res.json({
        success: true,
        data: {
          sites_patrimoniaux: sitesPatrimoniaux,
          sites_patrimoniaux_formatted: formatStat(sitesPatrimoniaux),
          evenements: evenementsActifs,
          evenements_formatted: formatStat(evenementsActifs),
          oeuvres: oeuvres + artisanats,
          oeuvres_formatted: formatStat(oeuvres + artisanats),
          membres: membres,
          membres_formatted: formatStat(membres)
        },
        cached: false,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erreur stats publiques:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des statistiques'
      });
    }
  });

  // Route de santé
  router.get('/health', async (req, res) => {
    try {
      await models.sequelize.authenticate();
      
      const health = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        database: 'Connected',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        models: Object.keys(models).filter(key => key !== 'sequelize' && key !== 'Sequelize').length
      };
      
      res.json(health);
    } catch (error) {
      res.status(503).json({
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        database: 'Disconnected',
        error: error.message
      });
    }
  });

  // Documentation API dynamique
  router.get('/', (req, res) => {
    // Extraire toutes les routes dynamiquement
    const allRoutes = extractRoutes(router, '/api');
    const groupedRoutes = groupRoutesByModule(allRoutes);
    
    // Statistiques
    const stats = {
      total: allRoutes.length,
      public: allRoutes.filter(r => !r.middlewares.includes('authenticate')).length,
      authenticated: allRoutes.filter(r => r.middlewares.includes('authenticate')).length,
      admin: allRoutes.filter(r => r.middlewares.includes('requireAdmin')).length,
      professional: allRoutes.filter(r => r.middlewares.includes('requireValidatedProfessional')).length
    };
    
    const documentation = {
      message: 'API Action Culture - Documentation complète',
      version: '1.0.0',
      baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`,
      
      statistics: stats,
      
      endpoints: Object.keys(groupedRoutes).sort().reduce((acc, module) => {
        acc[module] = {
          total: groupedRoutes[module].length,
          description: getModuleDescription(module),
          routes: groupedRoutes[module]
            .sort((a, b) => {
              const methodOrder = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
              if (a.method !== b.method) {
                return methodOrder.indexOf(a.method) - methodOrder.indexOf(b.method);
              }
              return a.path.localeCompare(b.path);
            })
            .map(route => formatRouteDescription(route))
        };
        return acc;
      }, {}),
      
      authentication: {
        type: 'Bearer Token (JWT)',
        header: 'Authorization: Bearer YOUR_TOKEN',
        endpoints: {
          register: 'POST /api/users/register',
          login: 'POST /api/users/login',
          refresh: 'POST /api/users/refresh-token'
        }
      },
      
      legend: {
        '🔓': 'Endpoint public',
        '🔒': 'Authentification requise',
        '👨‍💼': 'Rôle administrateur requis',
        '💼': 'Professionnel validé requis'
      }
    };
    
    res.json(documentation);
  });

  // Liste simple des endpoints
  router.get('/endpoints', (req, res) => {
    const allRoutes = extractRoutes(router, '/api');
    const format = req.query.format || 'simple';
    
    if (format === 'detailed') {
      res.json({
        success: true,
        total: allRoutes.length,
        endpoints: allRoutes
      });
    } else {
      const simpleList = allRoutes
        .map(route => `${route.method.padEnd(7)} ${route.path}`)
        .sort();
      
      res.json({
        success: true,
        total: simpleList.length,
        endpoints: simpleList
      });
    }
  });

  // Documentation par module
  router.get('/docs/:module', (req, res) => {
    const { module } = req.params;
    const allRoutes = extractRoutes(router, '/api');
    
    const moduleRoutes = allRoutes.filter(route => {
      const pathParts = route.path.split('/').filter(p => p && p !== 'api');
      return pathParts[0] === module;
    });
    
    if (moduleRoutes.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Module '${module}' non trouvé`,
        availableModules: getAvailableModules(allRoutes)
      });
    }
    
    res.json({
      success: true,
      module,
      description: getModuleDescription(module),
      total: moduleRoutes.length,
      routes: moduleRoutes.map(route => ({
        method: route.method,
        path: route.path,
        description: generateRouteDescription(route),
        requiresAuth: route.middlewares.includes('authenticate'),
        requiresAdmin: route.middlewares.includes('requireAdmin'),
        requiresProfessional: route.middlewares.includes('requireValidatedProfessional'),
        middlewares: route.middlewares
      }))
    });
  });

  // Routes de débogage
  router.get('/debug/routes', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).end();
    }
    const debug = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      
      modulesStatus: {
        // Routes principales
        oeuvres: typeof initOeuvreRoutes === 'function' ? '✅ Chargé' : '❌ Non chargé',
        users: typeof initUserRoutes === 'function' ? '✅ Chargé' : '❌ Non chargé',
        evenements: typeof initEvenementRoutes === 'function' ? '✅ Chargé' : '❌ Non chargé',
        lieux: typeof initLieuRoutes === 'function' ? '✅ Chargé' : '❌ Non chargé',
        patrimoine: typeof initPatrimoineRoutes === 'function' ? '✅ Chargé' : '❌ Non chargé',
        commentaires: typeof initCommentaireRoutes === 'function' ? '✅ Chargé' : '❌ Non chargé',
        metadata: typeof initMetadataRoutes === 'function' ? '✅ Chargé' : '❌ Non chargé',
        upload: typeof initUploadRoutes === 'function' ? '✅ Chargé' : '❌ Non chargé',
        artisanat: typeof initArtisanatRoutes === 'function' ? '✅ Chargé' : '❌ Non chargé',
        favoris: typeof initFavoriRoutes === 'function' ? '✅ Chargé' : '❌ Non chargé',
        dashboard: typeof initDashboardRoutes === 'function' ? '✅ Chargé' : '❌ Non chargé',
        professionnel: typeof initProfessionnelRoutes === 'function' ? '✅ Chargé' : '❌ Non chargé',
        programmes: typeof initProgrammeRoutes === 'function' ? '✅ Chargé' : '❌ Non chargé',
        parcours: typeof initParcoursIntelligentRoutes === 'function' ? '✅ Chargé' : '❌ Non chargé',
        notifications: typeof initNotificationRoutes === 'function' ? '✅ Chargé' : '❌ Non chargé',
        intervenants: typeof initIntervenantRoutes === 'function' ? '✅ Chargé' : '❌ Non chargé',
        services: typeof initServiceRoutes === 'function' ? '✅ Chargé' : '❌ Non chargé',
          // NOUVELLES ROUTES
  tracking: typeof initTrackingRoutes === 'function' ? '✅ Chargé' : '❌ Non chargé',
  signalements: typeof initSignalementRoutes === 'function' ? '✅ Chargé' : '❌ Non chargé',
        emailVerification: typeof initEmailVerificationRoutes === 'function' ? '✅ Chargé' : '❌ Non chargé',
        // Routes admin
        'admin/oeuvres': typeof initAdminOeuvresRoutes === 'function' ? '✅ Chargé' : '❌ Non chargé',
        'admin/evenements': typeof initAdminEvenementsRoutes === 'function' ? '✅ Chargé' : '❌ Non chargé',
        'admin/patrimoine': typeof initAdminPatrimoineRoutes === 'function' ? '✅ Chargé' : '❌ Non chargé',
        'admin/services': typeof initAdminServicesRoutes === 'function' ? '✅ Chargé' : '❌ Non chargé'
      },
      
      middlewares: {
        auth: authMiddleware ? '✅ Disponible' : '❌ Non disponible',
        authMethods: authMiddleware ? Object.keys(authMiddleware).filter(k => typeof authMiddleware[k] === 'function') : [],
        loadedMiddlewares: Object.keys(middlewares)
      },
      
      models: {
        available: models ? Object.keys(models).filter(key => key !== 'sequelize' && key !== 'Sequelize').length : 0,
        list: models ? Object.keys(models).filter(key => key !== 'sequelize' && key !== 'Sequelize') : []
      },
      
      routes: {}
    };
    
    // Compter les routes par module
    const allRoutes = extractRoutes(router, '/api');
    allRoutes.forEach(route => {
      const module = route.path.split('/').filter(p => p && p !== 'api')[0] || 'root';
      debug.routes[module] = (debug.routes[module] || 0) + 1;
    });
    
    debug.totalRoutes = allRoutes.length;
    
    res.json(debug);
  });

  // ========================================================================
  // MONTAGE DES ROUTES MÉTIER
  // ========================================================================

  if (process.env.NODE_ENV !== 'production') {
    console.log('🔧 Montage des routes métier...');
  }
  
  const routeDefinitions = [
    // Routes qui nécessitent uniquement models
    { path: '/upload', init: initUploadRoutes, args: [models, authMiddleware] },
    
    // Routes qui nécessitent models et authMiddleware
    { path: '/metadata', init: initMetadataRoutes, args: [models, authMiddleware] },
    { path: '/users', init: initUserRoutes, args: [models, authMiddleware] },
    { path: '/oeuvres', init: initOeuvreRoutes, args: [models, authMiddleware] },
    { path: '/article-blocks', init: initArticleBlockRoutes, args: [models, authMiddleware] },
    { path: '/services', init: initServiceRoutes, args: [models, authMiddleware] },
    
    // Routes qui nécessitent tous les middlewares
    { path: '/organisations', init: initOrganisationRoutes, args: [models, authMiddleware] },
    { path: '/evenements', init: initEvenementRoutes, args: [models, middlewares] },
    { path: '/intervenants', init: initIntervenantRoutes, args: [models, authMiddleware] },
    
    // Autres routes
    { path: '/lieux', init: initLieuRoutes, args: [models] },
    { path: '/patrimoine', init: initPatrimoineRoutes, args: [models] },
    { path: '/artisanat', init: initArtisanatRoutes, args: [models] },
    { path: '/commentaires', init: initCommentaireRoutes, args: [models, { auth: authMiddleware.authenticate, optionalAuth: authMiddleware.optionalAuth }] },
    { path: '/favoris', init: initFavoriRoutes, args: [models] },
    
    { path: '/notifications', init: initNotificationRoutes, args: [models] },
    { path: '/parcours', init: initParcoursIntelligentRoutes, args: [models] },
    { path: '/programmes', init: initProgrammeRoutes, args: [models] },
    { path: '/professionnel', init: initProfessionnelRoutes, args: [models] },
    { path: '/dashboard', init: initDashboardRoutes, args: [models] },
    { path: '/tracking', init: initTrackingRoutes, args: [models, authMiddleware] },
    { path: '/signalements', init: initSignalementRoutes, args: [models, authMiddleware] },
    { path: '/signalement', init: initSignalementRoutes, args: [models, authMiddleware] },
    { path: '/email-verification', init: initEmailVerificationRoutes, args: [models, authMiddleware] },
    // ========================================================================
    // ROUTES ADMIN - AJOUT
    // ========================================================================
    { path: '/admin/oeuvres', init: initAdminOeuvresRoutes, args: [models] },
    { path: '/admin/evenements', init: initAdminEvenementsRoutes, args: [models] },
    { path: '/admin/patrimoine', init: initAdminPatrimoineRoutes, args: [models] },
    { path: '/admin/services', init: initAdminServicesRoutes, args: [models] }
  ];

  let successCount = 0;
  let errorCount = 0;

  routeDefinitions.forEach(({ path, init, args }) => {
    try {
      if (typeof init === 'function') {
        router.use(path, init(...args));
        successCount++;
        console.log(`  ✅ ${path}`);
      } else {
        throw new Error(`Module non trouvé: ${path}`);
      }
    } catch (error) {
      errorCount++;
      console.error(`  ❌ ${path}: ${error.message}`);
      
      // Route de fallback pour les modules manquants
      router.use(path, (req, res) => {
        res.status(501).json({
          success: false,
          error: 'Module non implémenté',
          message: `Le module ${path} est en cours de développement`,
          details: error.message
        });
      });
    }
  });

  console.log(`✅ Routes montées: ${successCount} succès, ${errorCount} erreurs`);

  // ========================================================================
  // GESTION DES ERREURS
  // ========================================================================

  // 404 pour les routes non trouvées
  router.use('*', (req, res) => {
    // Ignorer certaines routes automatiques
    const ignoredPaths = ['/favicon.ico', '/robots.txt', '/.well-known'];
    if (ignoredPaths.some(path => req.originalUrl.includes(path))) {
      return res.status(404).end();
    }

    res.status(404).json({
      success: false,
      error: 'Route non trouvée',
      message: `La route ${req.method} ${req.originalUrl} n'existe pas`,
      suggestion: 'Consultez GET /api/ pour la documentation complète',
      availableEndpoints: '/api/endpoints'
    });
  });

  return router;
};

// ========================================================================
// FONCTIONS HELPERS
// ========================================================================

function getModuleDescription(module) {
  const descriptions = {
    // Routes principales
    users: 'Gestion des utilisateurs et authentification',
    oeuvres: 'Gestion des œuvres culturelles',
    evenements: 'Événements culturels et inscriptions',
    patrimoine: 'Sites patrimoniaux et parcours touristiques',
    artisanat: 'Artisanat traditionnel algérien',
    commentaires: 'Système de commentaires et notations',
    favoris: 'Gestion des favoris utilisateurs',
    notifications: 'Système de notifications',
    metadata: 'Données de référence (langues, catégories, etc.)',
    upload: 'Upload de fichiers et médias',
    lieux: 'Gestion des lieux et localisation',
    dashboard: 'Tableau de bord administrateur',
    professionnel: 'Espace professionnel',
    programmes: 'Programmes d\'événements',
    parcours: 'Parcours touristiques intelligents',
    intervenants: 'Gestion des intervenants (artistes, conférenciers, formateurs)',
    services: 'Gestion des services culturels',
    
    // Routes admin - AJOUT
    'admin': 'Interface d\'administration complète',
    'admin/oeuvres': 'Administration des œuvres : validation, modération, statistiques',
    'admin/evenements': 'Administration des événements : gestion participants, annulations',
    'admin/patrimoine': 'Administration du patrimoine : QR codes, parcours, statistiques',
    'admin/services': 'Administration des services : validations, suspensions, revenus'
  };
  
  // Gérer les sous-modules admin
  if (module.startsWith('admin/')) {
    return descriptions[module] || `Administration des ${module.split('/')[1]}`;
  }
  
  return descriptions[module] || 'Module de l\'API Action Culture';
}

function formatRouteDescription(route) {
  let description = `${route.method} ${route.path}`;
  const icons = [];
  
  if (route.auth === 'public') icons.push('🔓');
  else icons.push('🔒');
  
  if (route.admin) icons.push('👨‍💼');
  if (route.professional) icons.push('💼');
  
  return `${icons.join(' ')} ${description}`;
}

function generateRouteDescription(route) {
  // Générer une description basée sur le path et la méthode
  const pathParts = route.path.split('/').filter(p => p && p !== 'api');
  const module = pathParts[0];
  const resource = pathParts[1];
  
  if (route.method === 'GET' && !resource) return `Liste des ${module}`;
  if (route.method === 'GET' && resource === ':id') return `Détails d'un ${module}`;
  if (route.method === 'POST' && !resource) return `Créer un ${module}`;
  if (route.method === 'PUT' && resource === ':id') return `Modifier un ${module}`;
  if (route.method === 'DELETE' && resource === ':id') return `Supprimer un ${module}`;
  
  return `${route.method} ${route.path}`;
}

function getAvailableModules(routes) {
  const modules = new Set();
  routes.forEach(route => {
    const pathParts = route.path.split('/').filter(p => p && p !== 'api');
    if (pathParts[0]) modules.add(pathParts[0]);
  });
  return Array.from(modules).sort();
}

// ========================================================================
// EXPORT
// ========================================================================

module.exports = (models, authMiddleware) => {
  try {
    return initRoutes(models, authMiddleware);
  } catch (error) {
    console.error('❌ Erreur critique lors de l\'initialisation des routes:', error);
    
    // Router d'urgence en cas d'erreur critique
    const emergencyRouter = express.Router();
    
    emergencyRouter.get('/health', (req, res) => {
      res.status(503).json({
        status: 'ERROR',
        message: 'Service en maintenance',
        error: error.message
      });
    });
    
    emergencyRouter.all('*', (req, res) => {
      res.status(503).json({
        success: false,
        error: 'Service temporairement indisponible',
        message: 'L\'API est en cours de maintenance',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    });
    
    return emergencyRouter;
  }
};