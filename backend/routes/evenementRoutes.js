const express = require('express');
const { body, param, query } = require('express-validator');

// Factory function pour créer les routes avec les modèles et middlewares injectés
const createEvenementRoutes = (models, middlewares = {}) => {
  const router = express.Router();
  
  // Importer le contrôleur
  const createEvenementController = require('../controllers/evenementController');
  const controller = createEvenementController(models);
  
  // Si les middlewares ne sont pas fournis, les charger directement
  if (!middlewares || Object.keys(middlewares).length === 0) {
    console.log('⚠️  Middlewares non fournis, chargement direct...');
    
    // Charger les middlewares nécessaires
    const createAuthMiddleware = require('../middlewares/authMiddleware');
    const cacheMiddleware = require('../middlewares/cacheMiddleware');
    const validationMiddleware = require('../middlewares/validationMiddleware');
    const rateLimitMiddleware = require('../middlewares/rateLimitMiddleware');
    const auditMiddleware = require('../middlewares/auditMiddleware');
    const securityMiddleware = require('../middlewares/securityMiddleware');
    
    middlewares = {
      auth: createAuthMiddleware(models),
      cache: cacheMiddleware,
      validation: validationMiddleware,
      rateLimit: rateLimitMiddleware,
      audit: auditMiddleware,
      security: securityMiddleware
    };
  }
  
  // Destructurer les middlewares
  const { 
    auth, 
    cache, 
    validation, 
    rateLimit, 
    audit,
    security
  } = middlewares;

  // ============= ROUTES PUBLIQUES =============
  
  /**
   * @route   GET /api/evenements
   * @desc    Récupérer tous les événements avec filtres et pagination
   * @access  Public
   */
  router.get('/', 
    cache.cacheStrategy.medium, // Cache 5 minutes
    validation.validatePagination,
    controller.getAllEvenements
  );

  /**
   * @route   GET /api/evenements/upcoming
   * @desc    Récupérer les événements à venir
   * @access  Public
   */
  router.get('/upcoming',
    cache.cacheStrategy.short, // Cache 1 minute car les dates changent
    validation.validatePagination,
    controller.getEvenementsAvenir
  );

  /**
   * @route   GET /api/evenements/:id
   * @desc    Récupérer un événement par ID
   * @access  Public
   */
  router.get('/:id',
    validation.validateId('id'),
    cache.cacheStrategy.medium,
    controller.getEvenementById
  );

  /**
   * @route   GET /api/evenements/:id/share-data
   * @desc    Récupérer les données de partage social
   * @access  Public
   */
  router.get('/:id/share-data',
    validation.validateId('id'),
    cache.cacheStrategy.long, // Cache 1 heure car rarement modifié
    controller.getSocialShareData
  );

  /**
   * @route   GET /api/evenements/:id/medias
   * @desc    Récupérer les médias d'un événement
   * @access  Public
   */
  router.get('/:id/medias',
    validation.validateId('id'),
    cache.cacheStrategy.medium,
    controller.getMedias
  );

  /**
   * @route   GET /api/evenements/:id/export
   * @desc    Exporter le programme d'un événement
   * @access  Public
   */
  router.get('/:id/export',
    validation.validateId('id'),
    rateLimit.general, // Limiter les exports
    controller.exportProgramme
  );

  // ============= ROUTES AUTHENTIFIÉES =============

  /**
   * @route   POST /api/evenements
   * @desc    Créer un nouvel événement
   * @access  Private - Professionnel validé ou Admin
   */
  router.post('/',
    auth.authenticate,
    auth.requireValidatedProfessional,
    security.sanitizeInput,
    rateLimit.creation,
    [
      body('nom_evenement').notEmpty().trim().isLength({ min: 3, max: 200 }),
      body('description').optional().trim().isLength({ max: 5000 }),
      body('date_debut').isISO8601().toDate(),
      body('date_fin').isISO8601().toDate(),
      body('id_lieu').isInt({ min: 1 }),
      body('id_type_evenement').isInt({ min: 1 }),
      body('capacite_max').optional().isInt({ min: 1, max: 100000 }),
      body('prix_min').optional().isFloat({ min: 0 }),
      body('prix_max').optional().isFloat({ min: 0 })
    ],
    validation.handleValidationErrors,
    validation.validateEventCreation,
    cache.invalidateOnChange('evenement'),
    audit.logCriticalAction(audit.actions.CREATE_EVENT, 'evenement'),
    controller.createEvenement
  );

  /**
   * @route   PUT /api/evenements/:id
   * @desc    Mettre à jour un événement
   * @access  Private - Owner ou Admin
   */
  router.put('/:id',
    auth.authenticate,
    validation.validateId('id'),
    security.sanitizeInput,
    [
      body('nom_evenement').optional().trim().isLength({ min: 3, max: 200 }),
      body('description').optional().trim().isLength({ max: 5000 }),
      body('date_debut').optional().isISO8601().toDate(),
      body('date_fin').optional().isISO8601().toDate(),
      body('capacite_max').optional().isInt({ min: 1, max: 100000 })
    ],
    validation.handleValidationErrors,
    cache.invalidateOnChange('evenement'),
    audit.logCriticalAction(audit.actions.UPDATE_EVENT, 'evenement'),
    controller.updateEvenement
  );

  /**
   * @route   DELETE /api/evenements/:id
   * @desc    Supprimer un événement
   * @access  Private - Owner ou Admin
   */
  router.delete('/:id',
    auth.authenticate,
    validation.validateId('id'),
    rateLimit.sensitiveActions,
    cache.invalidateOnChange('evenement'),
    audit.logCriticalAction(audit.actions.DELETE_EVENT, 'evenement'),
    controller.deleteEvenement
  );

  /**
   * @route   PATCH /api/evenements/:id/cancel
   * @desc    Annuler un événement
   * @access  Private - Owner ou Admin
   */
  router.patch('/:id/cancel',
    auth.authenticate,
    validation.validateId('id'),
    security.sanitizeInput,
    [
      body('raison_annulation').notEmpty().trim().isLength({ min: 10, max: 500 })
    ],
    validation.handleValidationErrors,
    cache.invalidateOnChange('evenement'),
    audit.logCriticalAction(audit.actions.CANCEL_EVENT, 'evenement'),
    controller.cancelEvenement
  );

  /**
   * @route   POST /api/evenements/:id/inscription
   * @desc    S'inscrire à un événement
   * @access  Private - Authenticated user
   */
  router.post('/:id/inscription',
    auth.authenticate,
    validation.validateId('id'),
    rateLimit.creation,
    cache.invalidateCache(['/evenements']), // Simplifié
    audit.logAction('inscription_evenement', { entityType: 'evenement' }),
    controller.inscrireUtilisateur
  );

  /**
   * @route   DELETE /api/evenements/:id/inscription
   * @desc    Se désinscrire d'un événement
   * @access  Private - Authenticated user
   */
  router.delete('/:id/inscription',
    auth.authenticate,
    validation.validateId('id'),
    cache.invalidateCache(['/evenements']), // Simplifié
    audit.logAction('desinscription_evenement', { entityType: 'evenement' }),
    controller.desinscrireUtilisateur
  );

  /**
   * @route   GET /api/evenements/:id/participants
   * @desc    Récupérer les participants d'un événement
   * @access  Private - Owner ou Admin
   */
  router.get('/:id/participants',
    auth.authenticate,
    validation.validateId('id'),
    auth.requireOwnership('Evenement', 'id', 'id_user'),
    cache.userCache(300), // Cache utilisateur 5 minutes
    audit.logDataAccess('participants_evenement'),
    controller.getParticipants
  );

  /**
   * @route   PATCH /api/evenements/:id/participants/:userId/validate
   * @desc    Valider la participation d'un utilisateur
   * @access  Private - Owner ou Admin
   */
  router.patch('/:id/participants/:userId/validate',
    auth.authenticate,
    validation.validateId('id'),
    validation.validateId('userId'),
    auth.requireOwnership('Evenement', 'id', 'id_user'),
    security.sanitizeInput,
    [
      body('statut_participation').isIn(['accepter', 'refuser'])
    ],
    validation.handleValidationErrors,
    cache.invalidateCache(['/evenements']), // Simplifié
    audit.logAction('validate_participation', { entityType: 'evenement' }),
    controller.validateParticipation
  );

  /**
   * @route   POST /api/evenements/:id/medias
   * @desc    Ajouter des médias à un événement
   * @access  Private - Owner ou Admin
   */
  router.post('/:id/medias',
    auth.authenticate,
    validation.validateId('id'),
    auth.requireOwnership('Evenement', 'id', 'id_user'),
    security.sanitizeInput,
    rateLimit.creation,
    [
      body('medias').isArray({ min: 1, max: 10 }),
      body('medias.*.type_media').isIn(['image', 'video', 'document']),
      body('medias.*.url').isURL(),
      body('medias.*.titre').optional().trim().isLength({ max: 200 }),
      body('medias.*.ordre').optional().isInt({ min: 0 })
    ],
    validation.handleValidationErrors,
    cache.invalidateCache(['/evenements']), // Simplifié
    audit.logAction('add_medias_evenement', { entityType: 'evenement' }),
    controller.addMedias
  );

  /**
   * @route   DELETE /api/evenements/:id/medias/:mediaId
   * @desc    Supprimer un média d'un événement
   * @access  Private - Owner ou Admin
   */
  router.delete('/:id/medias/:mediaId',
    auth.authenticate,
    validation.validateId('id'),
    validation.validateId('mediaId'),
    auth.requireOwnership('Evenement', 'id', 'id_user'),
    cache.invalidateCache(['/evenements']), // Simplifié
    audit.logAction('delete_media_evenement', { entityType: 'evenement' }),
    controller.deleteMedia
  );

  /**
   * @route   GET /api/evenements/:id/mes-oeuvres
   * @desc    Récupérer les œuvres disponibles pour un professionnel
   * @access  Private - Professionnel validé
   */
  router.get('/:id/mes-oeuvres',
    auth.authenticate,
    auth.requireValidatedProfessional,
    validation.validateId('id'),
    cache.userCache(300),
    controller.getMesOeuvresEvenement
  );

  /**
   * @route   POST /api/evenements/:id/oeuvres
   * @desc    Ajouter une œuvre à un événement
   * @access  Private - Professionnel validé
   */
  router.post('/:id/oeuvres',
    auth.authenticate,
    auth.requireValidatedProfessional,
    validation.validateId('id'),
    security.sanitizeInput,
    [
      body('id_oeuvre').isInt({ min: 1 }),
      body('ordre').optional().isInt({ min: 0 })
    ],
    validation.handleValidationErrors,
    cache.invalidateCache(['/evenements']), // Simplifié
    audit.logAction('add_oeuvre_evenement', { entityType: 'evenement' }),
    controller.addOeuvreProfessionnel
  );

  /**
   * @route   DELETE /api/evenements/:id/oeuvres/:oeuvreId
   * @desc    Retirer une œuvre d'un événement
   * @access  Private - Professionnel validé
   */
  router.delete('/:id/oeuvres/:oeuvreId',
    auth.authenticate,
    auth.requireValidatedProfessional,
    validation.validateId('id'),
    validation.validateId('oeuvreId'),
    cache.invalidateCache(['/evenements']), // Simplifié
    audit.logAction('remove_oeuvre_evenement', { entityType: 'evenement' }),
    controller.removeOeuvreProfessionnel
  );

  /**
   * @route   POST /api/evenements/:id/notification
   * @desc    Envoyer une notification manuelle aux participants
   * @access  Private - Owner ou Admin
   */
  router.post('/:id/notification',
    auth.authenticate,
    validation.validateId('id'),
    auth.requireOwnership('Evenement', 'id', 'id_user'),
    security.sanitizeInput,
    rateLimit.sensitiveActions,
    [
      body('sujet').notEmpty().trim().isLength({ min: 3, max: 100 }),
      body('message').notEmpty().trim().isLength({ min: 10, max: 1000 }),
      body('participants').optional().isArray(),
      body('participants.*').isInt({ min: 1 })
    ],
    validation.handleValidationErrors,
    audit.logAction('send_notification_evenement', { entityType: 'evenement' }),
    controller.sendNotificationManuelle
  );

  return router;
};

module.exports = createEvenementRoutes;