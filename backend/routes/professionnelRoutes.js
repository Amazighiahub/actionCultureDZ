// ========================================
// routes/professionnelRoutes.js - Routes pour les professionnels (MISE À JOUR)
// ========================================

const express = require('express');
const router = express.Router();
const ProfessionnelController = require('../controllers/professionnelController');
const evenementControllerV2 = require('../controllers/evenementController');
const createAuthMiddleware = require('../middlewares/authMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');
const rateLimitMiddleware = require('../middlewares/rateLimitMiddleware');
const cacheMiddleware = require('../middlewares/cacheMiddleware');
const auditMiddleware = require('../middlewares/auditMiddleware');
const { body, query, param } = require('express-validator');

const initProfessionnelRoutes = (models) => {
  const authMiddleware = createAuthMiddleware(models);
  const professionnelController = new ProfessionnelController();

  // 🔒 SÉCURITÉ: ne jamais bypass les contrôles si un middleware requis manque
  const requireMiddleware = (name, middleware) => {
    if (typeof middleware === 'function') return middleware;
    return (req, res) => {
      console.error(`🚨 Middleware requis manquant: ${name} - accès refusé`);
      return res.status(503).json({
        success: false,
        error: req.t ? req.t('common.serverError') : 'Service temporarily unavailable',
        code: 'MIDDLEWARE_UNAVAILABLE',
        details: name
      });
    };
  };

  const requireValidatedProfessional = requireMiddleware(
    'auth.requireValidatedProfessional',
    authMiddleware.requireValidatedProfessional
  );

  const requireOwnership = authMiddleware.requireOwnership
    ? authMiddleware.requireOwnership
    : () => requireMiddleware('auth.requireOwnership', null);

  // Toutes les routes nécessitent l'authentification et d'être un professionnel validé
  router.use(authMiddleware.authenticate);
  router.use(requireValidatedProfessional);

  // ========================================
  // DASHBOARD PROFESSIONNEL
  // ========================================

  /**
   * @route GET /professionnel/dashboard
   * @desc Tableau de bord du professionnel
   * @access Private (Professionnel validé)
   */
  router.get('/dashboard', 
    cacheMiddleware.conditionalCache(300), // 5 minutes de cache
    professionnelController.getDashboard.bind(professionnelController)
  );

  // ========================================
  // GESTION DES ŒUVRES
  // ========================================

  /**
   * @route GET /professionnel/oeuvres
   * @desc Liste des œuvres du professionnel
   * @access Private (Professionnel validé)
   */
  router.get('/oeuvres',
    validationMiddleware.validatePagination,
    [
      query('statut').optional().isIn(['publie', 'en_attente', 'rejete']).withMessage((value, { req }) => req.t('validation.invalidStatus')),
      query('type').optional().isInt().withMessage((value, { req }) => req.t('validation.invalidType'))
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(180), // 3 minutes de cache
    professionnelController.getMyOeuvres.bind(professionnelController)
  );

  /**
   * @route GET /professionnel/oeuvres/:id/stats
   * @desc Statistiques détaillées d'une œuvre
   * @access Private (Professionnel validé)
   */
  router.get('/oeuvres/:id/stats',
    validationMiddleware.validateId('id'),
    requireOwnership('Oeuvre', 'id', 'saisi_par'),
    cacheMiddleware.conditionalCache(300),
    professionnelController.getOeuvreStats.bind(professionnelController)
  );

  // ========================================
  // GESTION DES ARTISANATS
  // ========================================

  /**
   * @route GET /professionnel/artisanats
   * @desc Liste des artisanats du professionnel
   * @access Private (Professionnel validé)
   */
  router.get('/artisanats',
    validationMiddleware.validatePagination,
    [
      query('statut').optional().isIn(['en_vente', 'vendu', 'indisponible']).withMessage((value, { req }) => req.t('validation.invalidStatus'))
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(180),
    professionnelController.getMyArtisanats.bind(professionnelController)
  );

  /**
   * @route GET /professionnel/artisanats/:id/stats
   * @desc Statistiques d'un artisanat
   * @access Private (Professionnel validé)
   */
  router.get('/artisanats/:id/stats',
    validationMiddleware.validateId('id'),
    cacheMiddleware.conditionalCache(300),
    professionnelController.getOeuvreStats.bind(professionnelController) // Réutilise la même méthode
  );

  // ========================================
  // GESTION DES ÉVÉNEMENTS
  // ========================================

  /**
   * @route GET /professionnel/evenements
   * @desc Liste des événements du professionnel
   * @access Private (Professionnel validé)
   */
  router.get('/evenements',
    validationMiddleware.validatePagination,
    [
      query('statut').optional().isIn(['avenir', 'passe', 'en_cours']).withMessage((value, { req }) => req.t('validation.invalidStatus'))
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(180),
    professionnelController.getMyEvenements.bind(professionnelController)
  );

  /**
   * @route GET /professionnel/evenements/:id/stats
   * @desc Statistiques détaillées d'un événement
   * @access Private (Professionnel validé)
   */
  router.get('/evenements/:id/stats',
    validationMiddleware.validateId('id'),
    requireOwnership('Evenement', 'id', 'id_user'),
    cacheMiddleware.conditionalCache(300),
    professionnelController.getEvenementStats.bind(professionnelController)
  );

  /**
   * @route GET /professionnel/evenements/:id/participants
   * @desc Liste des participants avec leurs œuvres soumises
   * @access Private (Professionnel validé, propriétaire de l'événement)
   */
  router.get('/evenements/:id/participants',
    validationMiddleware.validateId('id'),
    requireOwnership('Evenement', 'id', 'id_user'),
    cacheMiddleware.conditionalCache(60),
    (req, res) => evenementControllerV2.getParticipants(req, res)
  );

  /**
   * @route GET /professionnel/evenements/:id/participants/:userId/profil
   * @desc Voir le profil complet d'un participant inscrit (avec portfolio et historique)
   * @access Private (Professionnel validé, propriétaire de l'événement)
   */
  router.get('/evenements/:id/participants/:userId/profil',
    validationMiddleware.validateId('id'),
    validationMiddleware.validateId('userId'),
    requireOwnership('Evenement', 'id', 'id_user'),
    (req, res) => evenementControllerV2.getParticipantProfil(req, res)
  );

  /**
   * @route POST /professionnel/evenements/:id/participants/manage
   * @desc Gestion des participants d'un événement
   * @access Private (Professionnel validé)
   */
  router.post('/evenements/:id/participants/manage',
    validationMiddleware.validateId('id'),
    [
      body('userId').isInt({ min: 1 }).withMessage((value, { req }) => req.t('validation.invalidUserId')),
      body('action')
        .isIn(['confirmer', 'rejeter', 'marquer_present', 'marquer_absent'])
        .withMessage((value, { req }) => req.t('validation.invalidAction')),
      body('notes').optional().isString().withMessage((value, { req }) => req.t('validation.invalidNotes'))
    ],
    validationMiddleware.handleValidationErrors,
    requireOwnership('Evenement', 'id', 'id_user'),
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('MANAGE_PARTICIPANT'),
    professionnelController.manageParticipants.bind(professionnelController)
  );

  // ========================================
  // CALENDRIER
  // ========================================

  /**
   * @route GET /professionnel/calendar
   * @desc Calendrier des événements du professionnel
   * @access Private (Professionnel validé)
   */
  router.get('/calendar',
    [
      query('year').optional().isInt({ min: 2020, max: 2030 }).withMessage((value, { req }) => req.t('validation.invalidYear')),
      query('month').optional().isInt({ min: 1, max: 12 }).withMessage((value, { req }) => req.t('validation.invalidMonth'))
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(600), // 10 minutes de cache
    professionnelController.getEventCalendar.bind(professionnelController)
  );

  // ========================================
  // PROFIL PROFESSIONNEL
  // ========================================

  /**
   * @route PUT /professionnel/profile
   * @desc Mise à jour du profil professionnel
   * @access Private (Professionnel validé)
   */
  router.put('/profile',
    [
      body('description_activite').optional().isLength({ max: 2000 }).withMessage((value, { req }) => req.t('validation.descriptionTooLong')),
      body('site_web').optional().isURL().withMessage((value, { req }) => req.t('validation.invalidWebsite')),
      body('horaires_atelier').optional().isString().withMessage((value, { req }) => req.t('validation.invalidSchedule')),
      body('accepte_commandes').optional().isBoolean().withMessage((value, { req }) => req.t('validation.booleanRequired')),
      body('prix_minimum').optional().isFloat({ min: 0 }).withMessage((value, { req }) => req.t('validation.invalidMinPrice')),
      body('delai_livraison').optional().isInt({ min: 1 }).withMessage((value, { req }) => req.t('validation.invalidDeliveryDelay')),
      body('specialites').optional().isArray().withMessage((value, { req }) => req.t('validation.specialtiesMustBeArray')),
      body('certifications').optional().isArray().withMessage((value, { req }) => req.t('validation.certificationsMustBeArray'))
    ],
    validationMiddleware.handleValidationErrors,
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('UPDATE_PROFESSIONAL_PROFILE'),
    professionnelController.updateProfessionalProfile.bind(professionnelController)
  );

  /**
   * @route POST /professionnel/portfolio/upload
   * @desc Upload d'images pour le portfolio
   * @access Private (Professionnel validé)
   */
  router.post('/portfolio/upload',
    rateLimitMiddleware.creation,
    auditMiddleware.logAction('UPLOAD_PORTFOLIO'),
    professionnelController.uploadPortfolio.bind(professionnelController)
  );

  // ========================================
  // EXPORTS
  // ========================================

  /**
   * @route GET /professionnel/export
   * @desc Export des données (Excel/CSV)
   * @access Private (Professionnel validé)
   */
  router.get('/export',
    [
      query('type').isIn(['oeuvres', 'evenements', 'participants', 'artisanats']).withMessage((value, { req }) => req.t('validation.invalidExportType')),
      query('format').optional().isIn(['csv', 'excel']).withMessage((value, { req }) => req.t('validation.invalidFormat')),
      query('evenementId').optional().isInt().withMessage((value, { req }) => req.t('validation.invalidEventId'))
    ],
    validationMiddleware.handleValidationErrors,
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('EXPORT_DATA'),
    professionnelController.exportData.bind(professionnelController)
  );

  // Routes spécialisées pour les exports
  router.get('/export/oeuvres',
    [query('format').optional().isIn(['csv', 'excel']).withMessage((value, { req }) => req.t('validation.invalidFormat'))],
    validationMiddleware.handleValidationErrors,
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('EXPORT_OEUVRES'),
    (req, res) => {
      req.query.type = 'oeuvres';
      professionnelController.exportData(req, res);
    }
  );

  router.get('/export/evenements',
    [query('format').optional().isIn(['csv', 'excel']).withMessage((value, { req }) => req.t('validation.invalidFormat'))],
    validationMiddleware.handleValidationErrors,
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('EXPORT_EVENEMENTS'),
    (req, res) => {
      req.query.type = 'evenements';
      professionnelController.exportData(req, res);
    }
  );

  router.get('/export/artisanats',
    [query('format').optional().isIn(['csv', 'excel']).withMessage((value, { req }) => req.t('validation.invalidFormat'))],
    validationMiddleware.handleValidationErrors,
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('EXPORT_ARTISANATS'),
    (req, res) => {
      req.query.type = 'artisanats';
      professionnelController.exportData(req, res);
    }
  );

  router.get('/export/participants/:evenementId',
    validationMiddleware.validateId('evenementId'),
    [query('format').optional().isIn(['csv', 'excel']).withMessage((value, { req }) => req.t('validation.invalidFormat'))],
    validationMiddleware.handleValidationErrors,
    requireOwnership('Evenement', 'evenementId', 'id_user'),
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('EXPORT_PARTICIPANTS'),
    (req, res) => {
      req.query.type = 'participants';
      req.query.evenementId = req.params.evenementId;
      professionnelController.exportData(req, res);
    }
  );

  // ========================================
  // NOTIFICATIONS
  // ========================================

  /**
   * @route GET /professionnel/notifications
   * @desc Notifications du professionnel
   * @access Private (Professionnel validé)
   */
  router.get('/notifications',
    [
      query('limit').optional().isInt({ min: 1, max: 100 }).withMessage((value, { req }) => req.t('validation.invalidLimit')),
      query('offset').optional().isInt({ min: 0 }).withMessage((value, { req }) => req.t('validation.invalidOffset')),
      query('marque').optional().isBoolean().withMessage((value, { req }) => req.t('validation.booleanRequired'))
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(60), // 1 minute de cache
    professionnelController.getNotifications.bind(professionnelController)
  );

  // ========================================
  // ANALYTICS AVANCÉES
  // ========================================

  /**
   * @route GET /professionnel/analytics/overview
   * @desc Vue d'ensemble des analytics
   * @access Private (Professionnel validé)
   */
  router.get('/analytics/overview',
    [
      query('period').optional().isInt({ min: 7, max: 365 }).withMessage((value, { req }) => req.t('validation.invalidPeriod'))
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(900), // 15 minutes de cache
    professionnelController.getAnalyticsOverview.bind(professionnelController)
  );

  /**
   * @route GET /professionnel/analytics/trends
   * @desc Tendances et évolutions
   * @access Private (Professionnel validé)
   */
  router.get('/analytics/trends',
    [
      query('period').optional().isInt({ min: 7, max: 365 }).withMessage((value, { req }) => req.t('validation.invalidPeriod')),
      query('metric').optional().isIn(['vues', 'favoris', 'participations']).withMessage((value, { req }) => req.t('validation.invalidMetric'))
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(900),
    professionnelController.getAnalyticsOverview.bind(professionnelController)
  );

  /**
   * @route GET /professionnel/analytics/demographics
   * @desc Données démographiques des visiteurs
   * @access Private (Professionnel validé)
   */
  router.get('/analytics/demographics',
    [
      query('period').optional().isInt({ min: 7, max: 365 }).withMessage((value, { req }) => req.t('validation.invalidPeriod'))
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(1800), // 30 minutes de cache
    professionnelController.getAnalyticsOverview.bind(professionnelController)
  );

  // ========================================
  // ROUTES AVANCÉES (À IMPLÉMENTER)
  // ========================================

  /**
   * @route GET /professionnel/benchmark
   * @desc Comparaison avec autres professionnels (anonymisé)
   * @access Private (Professionnel validé)
   */
  router.get('/benchmark',
    [
      query('metric').optional().isIn(['vues', 'favoris', 'engagement']).withMessage((value, { req }) => req.t('validation.invalidMetric')),
      query('region').optional().isString().withMessage((value, { req }) => req.t('validation.invalidRegion')),
      query('specialite').optional().isInt().withMessage((value, { req }) => req.t('validation.invalidSpecialty'))
    ],
    validationMiddleware.handleValidationErrors,
    cacheMiddleware.conditionalCache(3600), // 1 heure de cache
    (req, res) => {
      res.json({
        success: true,
        data: { percentile: null, metrics: [], message: req.t ? req.t('common.notImplemented') : 'Non implémenté' }
      });
    }
  );

  /**
   * @route GET /professionnel/recommendations
   * @desc Recommandations personnalisées
   * @access Private (Professionnel validé)
   */
  router.get('/recommendations',
    cacheMiddleware.conditionalCache(1800),
    (req, res) => {
      res.json({
        success: true,
        data: { suggestions: [], message: req.t ? req.t('common.notImplemented') : 'Non implémenté' }
      });
    }
  );

  /**
   * @route GET /professionnel/collaboration/suggestions
   * @desc Suggestions de collaborations
   * @access Private (Professionnel validé)
   */
  router.get('/collaboration/suggestions',
    cacheMiddleware.conditionalCache(3600),
    (req, res) => {
      res.json({
        success: true,
        data: { suggestions: [], message: req.t ? req.t('common.notImplemented') : 'Non implémenté' }
      });
    }
  );

  // ========================================
  // GESTION DES MÉDIAS PORTFOLIO
  // ========================================

  /**
   * @route DELETE /professionnel/portfolio/:mediaId
   * @desc Suppression d'un média du portfolio
   * @access Private (Professionnel validé)
   */
  router.delete('/portfolio/:mediaId',
    validationMiddleware.validateId('mediaId'),
    requireOwnership('Media', 'mediaId', 'id_user'),
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('DELETE_PORTFOLIO_MEDIA'),
    (req, res) => {
      res.status(501).json({
        success: false,
        error: req.t('common.notImplemented')
      });
    }
  );

  /**
   * @route PUT /professionnel/portfolio/:mediaId
   * @desc Mise à jour des métadonnées d'un média
   * @access Private (Professionnel validé)
   */
  router.put('/portfolio/:mediaId',
    validationMiddleware.validateId('mediaId'),
    [
      body('titre').optional().isLength({ max: 200 }).withMessage((value, { req }) => req.t('validation.titleTooLong')),
      body('description').optional().isLength({ max: 1000 }).withMessage((value, { req }) => req.t('validation.descriptionTooLong')),
      body('ordre').optional().isInt({ min: 1 }).withMessage((value, { req }) => req.t('validation.invalidOrder'))
    ],
    validationMiddleware.handleValidationErrors,
    requireOwnership('Media', 'mediaId', 'id_user'),
    auditMiddleware.logAction('UPDATE_PORTFOLIO_MEDIA'),
    (req, res) => {
      res.status(501).json({
        success: false,
        error: req.t('common.notImplemented')
      });
    }
  );

  // ========================================
  // SUPPORT ET AIDE
  // ========================================

  /**
   * @route POST /professionnel/support/ticket
   * @desc Créer un ticket de support
   * @access Private (Professionnel validé)
   */
  router.post('/support/ticket',
    [
      body('sujet').notEmpty().isLength({ max: 200 }).withMessage((value, { req }) => req.t('validation.subjectRequired')),
      body('message').notEmpty().isLength({ max: 2000 }).withMessage((value, { req }) => req.t('validation.messageRequired')),
      body('priorite').optional().isIn(['basse', 'normale', 'haute']).withMessage((value, { req }) => req.t('validation.invalidPriority')),
      body('categorie').optional().isIn(['technique', 'compte', 'contenu', 'autre']).withMessage((value, { req }) => req.t('validation.invalidCategory'))
    ],
    validationMiddleware.handleValidationErrors,
    rateLimitMiddleware.sensitiveActions,
    auditMiddleware.logAction('CREATE_SUPPORT_TICKET'),
    (req, res) => {
      res.json({
        success: true,
        data: { ticketId: null, message: req.t ? req.t('common.notImplemented') : 'Module support à venir' }
      });
    }
  );

  /**
   * @route GET /professionnel/help/faq
   * @desc FAQ pour les professionnels
   * @access Private (Professionnel validé)
   */
  router.get('/help/faq',
    cacheMiddleware.conditionalCache(3600),
    (req, res) => {
      res.json({
        success: true,
        data: {
          categories: [
            {
              nom: 'Gestion du contenu',
              questions: [
                {
                  question: 'Comment publier une œuvre ?',
                  reponse: 'Utilisez l\'interface de création d\'œuvre et soumettez-la pour validation.'
                },
                {
                  question: 'Pourquoi mon œuvre a été rejetée ?',
                  reponse: 'Consultez les notifications pour voir la raison du rejet.'
                }
              ]
            },
            {
              nom: 'Événements',
              questions: [
                {
                  question: 'Comment créer un événement ?',
                  reponse: 'Accédez à la section événements et cliquez sur "Créer un événement".'
                }
              ]
            }
          ]
        }
      });
    }
  );


  return router;
};

module.exports = initProfessionnelRoutes;