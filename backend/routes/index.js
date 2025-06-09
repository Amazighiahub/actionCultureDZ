// routes/index.js - VERSION CORRIGÉE
const express = require('express');
const router = express.Router();

// Import de toutes les routes
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

const initRoutes = (models, authMiddleware) => {
  // Vérifier que models contient sequelize
  if (!models || !models.sequelize) {
    throw new Error('models doit contenir une instance sequelize');
  }

  // Vérifier que authMiddleware est correctement passé
  if (!authMiddleware || typeof authMiddleware !== 'object') {
    throw new Error('authMiddleware doit être un objet avec les méthodes authenticate, isAdmin, etc.');
  }

  // IMPORTANT: Charger tous les middlewares nécessaires
  const middlewares = {
    auth: authMiddleware
  };

  // Charger le cache middleware
  try {
    middlewares.cache = require('../middlewares/cacheMiddleware');
    console.log('✅ Cache middleware chargé');
  } catch (error) {
    console.warn('⚠️ Cache middleware non disponible, utilisation de mocks');
    middlewares.cache = {
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
      noCache: (req, res, next) => next(),
      clearCache: (req, res) => res.json({ success: true }),
      getCacheStats: (req, res) => res.json({ success: true, data: {} })
    };
  }

  // Charger le validation middleware
  try {
    middlewares.validation = require('../middlewares/validationMiddleware');
  } catch (error) {
    console.warn('⚠️ Validation middleware non disponible');
    middlewares.validation = {
      validatePagination: (req, res, next) => next(),
      validateId: () => (req, res, next) => next(),
      handleValidationErrors: (req, res, next) => next(),
      validateEventCreation: (req, res, next) => next(),
      validateWorkSubmission: (req, res, next) => next()
    };
  }

  // Charger le rate limit middleware
  try {
    middlewares.rateLimit = require('../middlewares/rateLimitMiddleware');
  } catch (error) {
    console.warn('⚠️ RateLimit middleware non disponible');
    middlewares.rateLimit = {
      general: (req, res, next) => next(),
      auth: (req, res, next) => next(),
      creation: (req, res, next) => next(),
      adaptive: (req, res, next) => next(),
      sensitiveActions: (req, res, next) => next()
    };
  }

  // Charger l'audit middleware - VERSION CORRIGÉE
  try {
    const auditMiddlewareModule = require('../middlewares/auditMiddleware');
    
    // IMPORTANT: Initialiser le middleware d'audit avec les modèles
    if (auditMiddlewareModule.create) {
      // Utiliser la factory function pour créer une instance avec les modèles
      middlewares.audit = auditMiddlewareModule.create(models);
      console.log('✅ Audit middleware initialisé avec les modèles');
    } else if (auditMiddlewareModule.initialize) {
      // Ou utiliser la fonction d'initialisation
      middlewares.audit = auditMiddlewareModule.initialize(models);
      console.log('✅ Audit middleware initialisé via initialize');
    } else {
      // Fallback si l'ancien format est utilisé
      middlewares.audit = auditMiddlewareModule;
      console.warn('⚠️ Audit middleware utilisé sans initialisation des modèles');
    }
    
    // Ajouter les actions au middleware
    middlewares.audit.actions = auditMiddlewareModule.actions || {
      CREATE_EVENT: 'create_event',
      UPDATE_EVENT: 'update_event',
      DELETE_EVENT: 'delete_event',
      CANCEL_EVENT: 'cancel_event',
      CREATE_OEUVRE: 'create_oeuvre',
      UPDATE_OEUVRE: 'update_oeuvre',
      DELETE_OEUVRE: 'delete_oeuvre'
    };
  } catch (error) {
    console.warn('⚠️ Audit middleware non disponible:', error.message);
    middlewares.audit = {
      logAction: () => (req, res, next) => next(),
      logCriticalAction: () => (req, res, next) => next(),
      logDataAccess: () => (req, res, next) => next(),
      logUnauthorizedAccess: (req, res, next) => next(),
      actions: {
        CREATE_EVENT: 'create_event',
        UPDATE_EVENT: 'update_event',
        DELETE_EVENT: 'delete_event',
        CANCEL_EVENT: 'cancel_event',
        CREATE_OEUVRE: 'create_oeuvre',
        UPDATE_OEUVRE: 'update_oeuvre',
        DELETE_OEUVRE: 'delete_oeuvre'
      }
    };
  }

  // Charger le security middleware
  try {
    middlewares.security = require('../middlewares/securityMiddleware');
  } catch (error) {
    console.warn('⚠️ Security middleware non disponible');
    middlewares.security = {
      sanitizeInput: (req, res, next) => next()
    };
  }

  // Route de santé
  router.get('/health', async (req, res) => {
    try {
      // Test de la connexion à la base de données
      await models.sequelize.authenticate();
      
      res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        database: 'Connected',
        environment: process.env.NODE_ENV || 'development',
        models: Object.keys(models).filter(key => key !== 'sequelize' && key !== 'Sequelize').length
      });
    } catch (error) {
      res.status(503).json({
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        database: 'Disconnected',
        error: error.message
      });
    }
  });

  // Documentation API simplifiée
  router.get('/', (req, res) => {
    res.json({
      message: 'API Action Culture - Documentation',
      version: '1.0.0',
      baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`,
      documentation: '/api/docs',
      health: '/api/health',
      
      endpoints: {
        // Authentification & Utilisateurs
        users: {
          base: '/api/users',
          description: 'Gestion des utilisateurs et authentification',
          principales: [
            'POST /api/users/register - Inscription',
            'POST /api/users/login - Connexion',
            'GET /api/users/profile - Profil utilisateur',
            'GET /api/users/types-utilisateurs - Types disponibles'
          ]
        },
        
        // Métadonnées
        metadata: {
          base: '/api/metadata',
          description: 'Données de référence (langues, catégories, etc.)',
          principales: [
            'GET /api/metadata/all - Toutes les métadonnées',
            'GET /api/metadata/wilayas - Liste des wilayas',
            'GET /api/metadata/langues - Langues disponibles',
            'GET /api/metadata/categories - Catégories'
          ]
        },
        
        // Œuvres
        oeuvres: {
          base: '/api/oeuvres',
          description: 'Gestion des œuvres culturelles',
          principales: [
            'GET /api/oeuvres - Liste des œuvres',
            'GET /api/oeuvres/:id - Détails d\'une œuvre',
            'POST /api/oeuvres - Créer une œuvre (auth)',
            'GET /api/oeuvres/recent - Œuvres récentes'
          ]
        },
        
        // Événements
        evenements: {
          base: '/api/evenements',
          description: 'Événements culturels',
          principales: [
            'GET /api/evenements - Liste des événements',
            'GET /api/evenements/upcoming - À venir',
            'POST /api/evenements/:id/inscription - S\'inscrire (auth)',
            'GET /api/evenements/:id - Détails'
          ]
        },
        
        // Autres services
        patrimoine: '/api/patrimoine - Sites patrimoniaux',
        artisanat: '/api/artisanat - Artisanat traditionnel',
        commentaires: '/api/commentaires - Système de commentaires',
        favoris: '/api/favoris - Gestion des favoris (auth)',
        notifications: '/api/notifications - Notifications (auth)',
        parcours: '/api/parcours - Parcours intelligents',
        programmes: '/api/programmes - Programmes d\'événements',
        professionnel: '/api/professionnel - Espace pro (auth)',
        dashboard: '/api/dashboard - Admin (auth)',
        upload: '/api/upload - Upload de fichiers',
        lieux: '/api/lieux - Gestion des lieux'
      }
    });
  });

  // Monter toutes les routes
  console.log('🔧 Montage des routes...');
  
  try {
    // Routes qui nécessitent uniquement models
    if (typeof initUploadRoutes === 'function') {
      router.use('/upload', initUploadRoutes(models));
    }
    
    // Routes qui nécessitent models et authMiddleware seulement
    if (typeof initMetadataRoutes === 'function') {
      router.use('/metadata', initMetadataRoutes(models, authMiddleware));
    }
    
    if (typeof initUserRoutes === 'function') {
      router.use('/users', initUserRoutes(models, authMiddleware));
    }
    
    // Routes qui nécessitent tous les middlewares
    if (typeof initOeuvreRoutes === 'function') {
      router.use('/oeuvres', initOeuvreRoutes(models, authMiddleware));
    }
    
    // IMPORTANT: Passer tous les middlewares à evenementRoutes
    if (typeof initEvenementRoutes === 'function') {
      router.use('/evenements', initEvenementRoutes(models, middlewares));
    }
    
    // Autres routes
    const routesToInit = [
      { path: '/lieux', init: initLieuRoutes },
      { path: '/patrimoine', init: initPatrimoineRoutes },
      { path: '/artisanat', init: initArtisanatRoutes },
      { path: '/commentaires', init: initCommentaireRoutes },
      { path: '/favoris', init: initFavoriRoutes },
      { path: '/notifications', init: initNotificationRoutes },
      { path: '/parcours', init: initParcoursIntelligentRoutes },
      { path: '/programmes', init: initProgrammeRoutes },
      { path: '/professionnel', init: initProfessionnelRoutes },
      { path: '/dashboard', init: initDashboardRoutes }
    ];
    
    routesToInit.forEach(({ path, init }) => {
      if (typeof init === 'function') {
        // Certaines routes peuvent avoir besoin de tous les middlewares
        router.use(path, init(models, authMiddleware));
      } else {
        console.warn(`⚠️  Route ${path} non disponible (module non trouvé)`);
        // Route temporaire pour les modules manquants
        router.use(path, (req, res) => {
          res.status(501).json({
            success: false,
            error: 'Module non implémenté',
            message: `Le module ${path} est en cours de développement`
          });
        });
      }
    });
    
    console.log('✅ Routes montées avec succès');
    
  } catch (error) {
    console.error('❌ Erreur lors du montage des routes:', error);
    // Ne pas lancer l'erreur pour permettre au serveur de démarrer
  }

  // Gestion des erreurs 404
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
      suggestion: 'Consultez GET /api/ pour la documentation'
    });
  });

  return router;
};

// Export avec gestion d'erreur
module.exports = (models, authMiddleware) => {
  try {
    return initRoutes(models, authMiddleware);
  } catch (error) {
    console.error('❌ Erreur critique lors de l\'initialisation des routes:', error);
    // Retourner un router minimal en cas d'erreur
    const emergencyRouter = express.Router();
    emergencyRouter.all('*', (req, res) => {
      res.status(503).json({
        success: false,
        error: 'Service temporairement indisponible',
        message: 'L\'API est en cours de maintenance'
      });
    });
    return emergencyRouter;
  }
};