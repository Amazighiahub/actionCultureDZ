// routes/evenements.routes.js - Version corrigée

const express = require('express');
const { body, param, query } = require('express-validator');

const createEvenementRoutes = (models, middlewares = {}) => {
  const router = express.Router();
  
  // Contrôleur
  const createEvenementController = require('../controllers/EvenementController');
  const controller = createEvenementController(models);
  
  // Middlewares avec valeurs par défaut
  const { 
    auth = {}, 
    cache = {}, 
    validation = {}, 
    rateLimit = {}, 
    audit = {},
    security = {}
  } = middlewares;

  // Helper pour gérer les middlewares qui peuvent être des arrays
  const flattenMiddleware = (middleware) => {
    if (!middleware) return [(req, res, next) => next()];
    if (Array.isArray(middleware)) return middleware;
    return [middleware];
  };

  // Middleware par défaut si non défini
  const defaultMiddleware = (req, res, next) => next();

  const logEventRequest = (req, res, next) => next();

  // 🔒 SÉCURITÉ: Ne pas bypass l'auth/autorisation si un middleware requis manque
  const requireMiddleware = (name, middleware) => {
    if (typeof middleware === 'function') return middleware;
    return (req, res) => {
      console.error(`🚨 Middleware requis manquant: ${name} - accès refusé`);
      return res.status(503).json({
        success: false,
        error: 'Service temporairement indisponible',
        code: 'MIDDLEWARE_UNAVAILABLE',
        details: name
      });
    };
  };

  const requireAuth = requireMiddleware('auth.authenticate', auth.authenticate);
  const requireValidatedProfessional = requireMiddleware('auth.requireValidatedProfessional', auth.requireValidatedProfessional);
  const requireOwnership = auth.requireOwnership
    ? auth.requireOwnership
    : () => requireMiddleware('auth.requireOwnership', null);

  // ====================================================================
  // MIDDLEWARE CUSTOM POUR ÉVÉNEMENTS
  // ====================================================================
  
  if (process.env.NODE_ENV !== 'production') {
    router.use((req, res, next) => {
      req._startTime = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - req._startTime;
        const cached = res.getHeader('X-Cache') === 'HIT';
        
        console.log(JSON.stringify({
          type: 'event_request',
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration: duration,
          cached: cached,
          userId: req.user ? req.user.id_user : 'anonymous',
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        }));
      });
      next();
    });
  }

  const optimizeEventQuery = (req, res, next) => {
    if (!req.query.limit) {
      req.query.limit = 20;
    }
    
    req.query.limit = Math.min(parseInt(req.query.limit), 100);
    
    if (req.query.statut === 'termine' || req.query.statut === 'annule') {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=300');
    }
    
    next();
  };

  // ====================================================================
  // ROUTES PUBLIQUES
  // ====================================================================
  
  /**
   * @route   GET /api/evenements
   * @desc    Liste des événements
   */
  router.get('/', 
    logEventRequest,
    ...flattenMiddleware(rateLimit.evenements || rateLimit.general),
    optimizeEventQuery,
    cache.cacheStrategy?.medium || defaultMiddleware,
    validation.validatePagination || defaultMiddleware,
    async (req, res, next) => {
      try {
        res.setHeader('X-Data-Source', 'database');
        await controller.getAllEvenements(req, res, next);
      } catch (error) {
        if (cache.serveStale) {
          const staleData = await cache.serveStale(req);
          if (staleData) {
            res.setHeader('X-Cache', 'STALE');
            return res.json(staleData);
          }
        }
        next(error);
      }
    }
  );

  /**
   * @route   GET /api/evenements/search
   * @desc    Recherche d'événements
   */
  router.get('/search',
    logEventRequest,
    ...flattenMiddleware(rateLimit.search || rateLimit.general),
    [
      query('q')
        .optional()
        .trim()
        .isLength({ min: 2 })
        .withMessage('Recherche minimum 2 caractères')
        .customSanitizer(value => value.toLowerCase()),
      query('wilaya_id').optional().isInt(),
      query('type_id').optional().isInt(),
      query('date_debut').optional().isISO8601(),
      query('date_fin').optional().isISO8601()
    ],
    validation.handleValidationErrors || defaultMiddleware,
    optimizeEventQuery,
    cache.cacheStrategy?.short || defaultMiddleware,
    controller.searchEvenements || controller.getAllEvenements
  );

  /**
   * @route   GET /api/evenements/upcoming
   * @desc    Événements à venir
   */
  router.get('/upcoming',
    logEventRequest,
    ...flattenMiddleware(rateLimit.evenements || rateLimit.general),
    cache.cacheStrategy?.medium || defaultMiddleware,
    validation.validatePagination || defaultMiddleware,
    async (req, res, next) => {
      req.query.date_debut_min = new Date().toISOString();
      req.query.statut = 'planifie';
      
      if (controller.getEvenementsAvenir) {
        await controller.getEvenementsAvenir(req, res, next);
      } else {
        await controller.getAllEvenements(req, res, next);
      }
    }
  );

  /**
   * @route   GET /api/evenements/:id
   * @desc    Détail d'un événement
   */
  router.get('/:id',
    logEventRequest,
    validation.validateId?.('id') || defaultMiddleware,
    ...flattenMiddleware(rateLimit.evenements || rateLimit.general),
    async (req, res, next) => {
      const eventId = req.params.id;
      
      if (cache.checkExists) {
        const exists = await cache.checkExists(`event:${eventId}`);
        if (exists === false) {
          return res.status(404).json({
            success: false,
            error: 'Événement non trouvé'
          });
        }
      }
      
      next();
    },
    cache.cacheStrategy?.long || defaultMiddleware,
    controller.getEvenementById || defaultMiddleware
  );

  /**
   * @route   GET /api/evenements/:id/medias
   * @desc    Médias d'un événement
   */
  router.get('/:id/medias',
    logEventRequest,
    validation.validateId?.('id') || defaultMiddleware,
    ...flattenMiddleware(rateLimit.evenements || rateLimit.general),
    cache.cacheStrategy?.static || cache.cacheStrategy?.long || defaultMiddleware,
    controller.getMedias || controller.getEvenementById
  );

  /**
   * @route   GET /api/evenements/:id/programmes
   * @desc    Programmes d'un événement
   */
  router.get('/:id/programmes',
    logEventRequest,
    validation.validateId?.('id') || defaultMiddleware,
    ...flattenMiddleware(rateLimit.evenements || rateLimit.general),
    cache.cacheStrategy?.medium || defaultMiddleware,
    controller.getProgrammes || controller.getEvenementById
  );

  /**
   * @route   GET /api/evenements/stats
   * @desc    Statistiques publiques
   */
  router.get('/stats/public',
    logEventRequest,
    ...flattenMiddleware(rateLimit.general),
    cache.cacheStrategy?.static || cache.cacheStrategy?.long || defaultMiddleware,
    async (req, res) => {
      if (controller.getPublicStats) {
        const stats = await controller.getPublicStats();
        res.json({
          success: true,
          data: stats
        });
      } else {
        res.json({
          success: true,
          data: {
            total_evenements: 0,
            evenements_actifs: 0,
            participants_total: 0
          }
        });
      }
    }
  );

  // ====================================================================
  // ROUTES AUTHENTIFIÉES
  // ====================================================================

  /**
   * @route   POST /api/evenements
   * @desc    Créer un événement
   */
  router.post('/',
    requireAuth,
    requireValidatedProfessional,
    security.sanitizeInput || defaultMiddleware,
    ...flattenMiddleware(rateLimit.creation || rateLimit.general),
    controller.uploadMiddleware || defaultMiddleware,
    logEventRequest,
    [
      body('nom_evenement').notEmpty(),
      body('description').optional(),
      body('date_debut').notEmpty(),
      body('date_fin').optional(),
      body('capacite_max').optional().isInt({ min: 1 }),
      body('tarif').optional(),
      body('id_type_evenement').notEmpty(),
      body('id_lieu').optional()
    ],
    validation.handleValidationErrors || defaultMiddleware,
    validation.validateEventCreation || defaultMiddleware,
    async (req, res, next) => {
      req._cacheInvalidationKeys = [
        'events:list:*',
        'events:upcoming:*',
        `events:wilaya:${req.body.wilaya_id}:*`,
        `events:type:${req.body.id_type_evenement}:*`
      ];
      next();
    },
    cache.invalidatePatterns ? cache.invalidatePatterns(req => req._cacheInvalidationKeys) : defaultMiddleware,
    audit.logCriticalAction ? audit.logCriticalAction(audit.actions?.CREATE_EVENT || 'CREATE_EVENT', 'evenement') : defaultMiddleware,
    controller.createEvenement || defaultMiddleware
  );

  /**
   * @route   PUT /api/evenements/:id
   * @desc    Mettre à jour un événement
   */
  router.put('/:id',
    requireAuth,
    validation.validateId?.('id') || defaultMiddleware,
    requireOwnership('Evenement', 'id', 'id_user'),
    security.sanitizeInput || defaultMiddleware,
    ...flattenMiddleware(rateLimit.creation || rateLimit.general),
    logEventRequest,
    [
      body('nom_evenement').optional().trim().isLength({ min: 3, max: 200 }),
      body('description').optional().trim(),
      body('date_debut').optional().isISO8601(),
      body('date_fin').optional().isISO8601(),
      body('capacite_max').optional().isInt({ min: 1 }),
      body('tarif').optional().isFloat({ min: 0 })
    ],
    validation.handleValidationErrors || defaultMiddleware,
    (req, res, next) => {
      req._cacheInvalidationKeys = [
        `event:${req.params.id}:*`,
        'events:list:*',
        'events:upcoming:*'
      ];
      next();
    },
    cache.invalidatePatterns ? cache.invalidatePatterns(req => req._cacheInvalidationKeys) : defaultMiddleware,
    audit.logCriticalAction ? audit.logCriticalAction(audit.actions?.UPDATE_EVENT || 'UPDATE_EVENT', 'evenement') : defaultMiddleware,
    controller.updateEvenement || defaultMiddleware
  );

  /**
   * @route   GET /api/evenements/:id/config-inscription
   * @desc    Récupérer la configuration du formulaire d'inscription (types d'œuvres acceptées, etc.)
   */
  router.get('/:id/config-inscription',
    validation.validateId?.('id') || defaultMiddleware,
    auth.optionalAuth || defaultMiddleware,
    controller.getConfigInscription || defaultMiddleware
  );

  /**
   * @route   GET /api/evenements/:id/mon-inscription
   * @desc    Vérifier si l'utilisateur est inscrit à un événement
   */
  router.get('/:id/mon-inscription',
    requireAuth,
    validation.validateId?.('id') || defaultMiddleware,
    controller.getMonInscription || defaultMiddleware
  );

  /**
   * @route   POST /api/evenements/:id/inscription
   * @desc    S'inscrire à un événement (avec soumission d'œuvres optionnelle selon le type)
   */
  router.post('/:id/inscription',
    requireAuth,
    validation.validateId?.('id') || defaultMiddleware,
    ...flattenMiddleware(rateLimit.creation || rateLimit.general),
    logEventRequest,
    async (req, res, next) => {
      if (cache.acquireLock) {
        const lockKey = `inscription:${req.params.id}:${req.user.id_user}`;
        const locked = await cache.acquireLock(lockKey, 5000);
        
        if (!locked) {
          return res.status(429).json({
            success: false,
            error: 'Une inscription est déjà en cours'
          });
        }
        
        req._lockKey = lockKey;
      }
      next();
    },
    controller.inscrireUtilisateur || defaultMiddleware,
    async (req, res, next) => {
      if (req._lockKey && cache.releaseLock) {
        await cache.releaseLock(req._lockKey);
      }
      next();
    }
  );

  /**
   * @route   DELETE /api/evenements/:id/inscription
   * @desc    Se désinscrire d'un événement
   */
  router.delete('/:id/inscription',
    requireAuth,
    validation.validateId?.('id') || defaultMiddleware,
    ...flattenMiddleware(rateLimit.creation || rateLimit.general),
    logEventRequest,
    controller.desinscrireUtilisateur || defaultMiddleware
  );
  // ====================================================================
  // ROUTES GESTION DES OEUVRES DANS L'ÉVÉNEMENT
  // ====================================================================

  /**
   * @route   GET /api/evenements/:id/mes-oeuvres
   * @desc    Récupérer les oeuvres de l'utilisateur (ajoutées et disponibles)
   */
  router.get('/:id/mes-oeuvres',
    requireAuth,
    validation.validateId?.('id') || defaultMiddleware,
    controller.getMesOeuvresEvenement || defaultMiddleware
  );

  /**
   * @route   POST /api/evenements/:id/oeuvres
   * @desc    Ajouter une oeuvre à un événement
   */
  router.post('/:id/oeuvres',
    requireAuth,
    validation.validateId?.('id') || defaultMiddleware,
    [
      body('id_oeuvre').isInt().withMessage('ID œuvre invalide'),
      body('description_presentation').optional().isString(),
      body('duree_presentation').optional().isInt({ min: 1 })
    ],
    validation.handleValidationErrors || defaultMiddleware,
    controller.addOeuvreProfessionnel || defaultMiddleware
  );

  /**
   * @route   PUT /api/evenements/:id/oeuvres/:oeuvreId
   * @desc    Mettre à jour une association oeuvre-événement
   */
  router.put('/:id/oeuvres/:oeuvreId',
    requireAuth,
    validation.validateId?.('id') || defaultMiddleware,
    [
      body('description_presentation').optional().isString(),
      body('duree_presentation').optional().isInt({ min: 1 }),
      body('ordre_presentation').optional().isInt({ min: 1 })
    ],
    validation.handleValidationErrors || defaultMiddleware,
    controller.updateOeuvreEvenement || defaultMiddleware
  );

  /**
   * @route   DELETE /api/evenements/:id/oeuvres/:oeuvreId
   * @desc    Retirer une oeuvre d'un événement
   */
  router.delete('/:id/oeuvres/:oeuvreId',
    requireAuth,
    validation.validateId?.('id') || defaultMiddleware,
    controller.removeOeuvreProfessionnel || defaultMiddleware
  );

  /**
   * @route   PUT /api/evenements/:id/oeuvres/reorder
   * @desc    Réorganiser l'ordre des oeuvres
   */
  router.put('/:id/oeuvres/reorder',
    requireAuth,
    validation.validateId?.('id') || defaultMiddleware,
    [
      body('oeuvres').isArray().withMessage('Liste des œuvres requise'),
      body('oeuvres.*.id_oeuvre').isInt().withMessage('ID œuvre invalide'),
      body('oeuvres.*.ordre').isInt({ min: 1 }).withMessage('Ordre invalide')
    ],
    validation.handleValidationErrors || defaultMiddleware,
    controller.reorderOeuvresEvenement || defaultMiddleware
  );

  // ====================================================================
  // ROUTES BATCH
  // ====================================================================

  /**
   * @route   POST /api/evenements/batch
   * @desc    Récupérer plusieurs événements
   */
  router.post('/batch',
    ...flattenMiddleware(rateLimit.general),
    [
      body('ids').isArray({ max: 50 }).withMessage('Maximum 50 IDs'),
      body('ids.*').isInt().withMessage('IDs invalides')
    ],
    validation.handleValidationErrors || defaultMiddleware,
    async (req, res) => {
      if (controller.getBatchEvents) {
        const { ids } = req.body;
        const events = await controller.getBatchEvents(ids);
        
        res.json({
          success: true,
          data: events
        });
      } else {
        res.status(501).json({
          success: false,
          error: 'Batch non implémenté'
        });
      }
    }
  );

  // ====================================================================
  // MIDDLEWARE DE FIN
  // ====================================================================
  
  router.use((req, res, next) => {
    if (res.headersSent) return;
    
    res.setHeader('X-Request-ID', req.id || 'none');
    res.setHeader('X-Response-Time', Date.now() - (req._startTime || Date.now()));
    
    next();
  });

  // Gestion d'erreur spécifique
  router.use((err, req, res, next) => {
    if (err.name === 'EventNotFound') {
      return res.status(404).json({
        success: false,
        error: 'Événement non trouvé',
        code: 'EVENT_NOT_FOUND'
      });
    }
    
    if (err.name === 'EventFull') {
      return res.status(400).json({
        success: false,
        error: 'Événement complet',
        code: 'EVENT_FULL'
      });
    }
    
    next(err);
  });

  if (process.env.NODE_ENV !== 'production') {
    console.log('✅ Routes événements initialisées');
  }
  
  return router;
};

module.exports = createEvenementRoutes;