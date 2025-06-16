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

  // ====================================================================
  // ROUTES PUBLIQUES - Accessibles sans authentification
  // ====================================================================
  
  /**
   * @route   GET /api/evenements
   * @desc    Récupérer tous les événements avec filtres et pagination
   * @access  Public
   */
  router.get('/', 
    cache.cacheStrategy.medium,
    validation.validatePagination,
    controller.getAllEvenements
  );

  /**
   * @route   GET /api/evenements/upcoming
   * @desc    Récupérer les événements à venir
   * @access  Public
   */
  router.get('/upcoming',
    cache.cacheStrategy.short,
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
    cache.cacheStrategy.long,
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
    rateLimit.general,
    controller.exportProgramme
  );

  // ====================================================================
  // ROUTES AUTHENTIFIÉES - CRÉATION ET MODIFICATION
  // ====================================================================

  /**
   * @route   POST /api/evenements
   * @desc    Créer un nouvel événement
   * @access  Private - Professionnel validé avec organisation OU Admin
   * @note    L'upload d'image est géré dans le contrôleur
   */
  router.post('/',
    auth.authenticate,
    auth.requireValidatedProfessional, // Vérifie organisation pour les professionnels
    security.sanitizeInput,
    rateLimit.creation,
    [
      body('nom_evenement')
        .notEmpty().withMessage('Le nom de l\'événement est requis')
        .trim()
        .isLength({ min: 3, max: 200 }).withMessage('Le nom doit faire entre 3 et 200 caractères'),
      body('description')
        .optional()
        .trim()
        .isLength({ max: 5000 }).withMessage('La description ne doit pas dépasser 5000 caractères'),
      body('date_debut')
        .isISO8601().withMessage('Date de début invalide')
        .toDate(),
      body('date_fin')
        .isISO8601().withMessage('Date de fin invalide')
        .toDate()
        .custom((value, { req }) => {
          if (new Date(value) < new Date(req.body.date_debut)) {
            throw new Error('La date de fin doit être après la date de début');
          }
          return true;
        }),
      body('id_lieu')
        .isInt({ min: 1 }).withMessage('Lieu invalide'),
      body('id_type_evenement')
        .isInt({ min: 1 }).withMessage('Type d\'événement invalide'),
      body('capacite_max')
        .optional()
        .isInt({ min: 1, max: 100000 }).withMessage('Capacité entre 1 et 100 000'),
      body('prix_min')
        .optional()
        .isFloat({ min: 0 }).withMessage('Prix minimum doit être positif'),
      body('prix_max')
        .optional()
        .isFloat({ min: 0 }).withMessage('Prix maximum doit être positif')
        .custom((value, { req }) => {
          if (req.body.prix_min && parseFloat(value) < parseFloat(req.body.prix_min)) {
            throw new Error('Le prix maximum doit être supérieur au prix minimum');
          }
          return true;
        })
    ],
    validation.handleValidationErrors,
    validation.validateEventCreation,
    cache.invalidateOnChange('evenement'),
    audit.logCriticalAction(audit.actions.CREATE_EVENT, 'evenement'),
    controller.createEvenement // Gère l'upload en interne
  );

  /**
   * @route   PUT /api/evenements/:id
   * @desc    Mettre à jour un événement
   * @access  Private - Owner OU Admin
   * @note    L'upload d'image est géré dans le contrôleur
   */
  router.put('/:id',
    auth.authenticate,
    validation.validateId('id'),
    auth.requireOwnership('Evenement', 'id', 'id_user'),
    security.sanitizeInput,
    [
      body('nom_evenement')
        .optional()
        .trim()
        .isLength({ min: 3, max: 200 }),
      body('description')
        .optional()
        .trim()
        .isLength({ max: 5000 }),
      body('date_debut')
        .optional()
        .isISO8601()
        .toDate(),
      body('date_fin')
        .optional()
        .isISO8601()
        .toDate()
        .custom((value, { req }) => {
          if (req.body.date_debut && new Date(value) < new Date(req.body.date_debut)) {
            throw new Error('La date de fin doit être après la date de début');
          }
          return true;
        }),
      body('capacite_max')
        .optional()
        .isInt({ min: 1, max: 100000 }),
      body('prix_min')
        .optional()
        .isFloat({ min: 0 }),
      body('prix_max')
        .optional()
        .isFloat({ min: 0 })
        .custom((value, { req }) => {
          if (req.body.prix_min && parseFloat(value) < parseFloat(req.body.prix_min)) {
            throw new Error('Le prix maximum doit être supérieur au prix minimum');
          }
          return true;
        })
    ],
    validation.handleValidationErrors,
    cache.invalidateOnChange('evenement'),
    audit.logCriticalAction(audit.actions.UPDATE_EVENT, 'evenement'),
    controller.updateEvenement // Gère l'upload en interne
  );

  /**
   * @route   DELETE /api/evenements/:id
   * @desc    Supprimer un événement
   * @access  Private - Owner OU Admin
   */
  router.delete('/:id',
    auth.authenticate,
    validation.validateId('id'),
    auth.requireOwnership('Evenement', 'id', 'id_user'),
    rateLimit.sensitiveActions,
    cache.invalidateOnChange('evenement'),
    audit.logCriticalAction(audit.actions.DELETE_EVENT, 'evenement'),
    controller.deleteEvenement
  );

  /**
   * @route   PATCH /api/evenements/:id/cancel
   * @desc    Annuler un événement
   * @access  Private - Owner OU Admin
   */
  router.patch('/:id/cancel',
    auth.authenticate,
    validation.validateId('id'),
    auth.requireOwnership('Evenement', 'id', 'id_user'),
    security.sanitizeInput,
    [
      body('raison_annulation')
        .notEmpty().withMessage('La raison d\'annulation est requise')
        .trim()
        .isLength({ min: 10, max: 500 }).withMessage('Entre 10 et 500 caractères')
    ],
    validation.handleValidationErrors,
    cache.invalidateOnChange('evenement'),
    audit.logCriticalAction(audit.actions.CANCEL_EVENT, 'evenement'),
    controller.cancelEvenement
  );

  // ====================================================================
  // ROUTES AUTHENTIFIÉES - INSCRIPTIONS
  // ====================================================================

  /**
   * @route   POST /api/evenements/:id/inscription
   * @desc    S'inscrire à un événement
   * @access  Private - Tout utilisateur authentifié
   */
  router.post('/:id/inscription',
    auth.authenticate,
    validation.validateId('id'),
    rateLimit.creation,
    cache.invalidateCache(['/evenements']),
    audit.logAction('inscription_evenement', { entityType: 'evenement' }),
    controller.inscrireUtilisateur
  );

  /**
   * @route   DELETE /api/evenements/:id/inscription
   * @desc    Se désinscrire d'un événement
   * @access  Private - Tout utilisateur authentifié
   */
  router.delete('/:id/inscription',
    auth.authenticate,
    validation.validateId('id'),
    cache.invalidateCache(['/evenements']),
    audit.logAction('desinscription_evenement', { entityType: 'evenement' }),
    controller.desinscrireUtilisateur
  );

  // ====================================================================
  // ROUTES AUTHENTIFIÉES - GESTION DES PARTICIPANTS
  // ====================================================================

  /**
   * @route   GET /api/evenements/:id/participants
   * @desc    Récupérer les participants d'un événement
   * @access  Private - Owner OU Admin
   */
  router.get('/:id/participants',
    auth.authenticate,
    validation.validateId('id'),
    auth.requireOwnership('Evenement', 'id', 'id_user'),
    cache.userCache(300),
    audit.logDataAccess('participants_evenement'),
    controller.getParticipants
  );

  /**
   * @route   PATCH /api/evenements/:id/participants/:userId/validate
   * @desc    Valider/Refuser la participation d'un utilisateur
   * @access  Private - Owner OU Admin
   */
  router.patch('/:id/participants/:userId/validate',
    auth.authenticate,
    validation.validateId('id'),
    validation.validateId('userId'),
    auth.requireOwnership('Evenement', 'id', 'id_user'),
    security.sanitizeInput,
    [
      body('statut_participation')
        .isIn(['accepter', 'refuser'])
        .withMessage('Statut invalide (accepter ou refuser)')
    ],
    validation.handleValidationErrors,
    cache.invalidateCache(['/evenements']),
    audit.logAction('validate_participation', { entityType: 'evenement' }),
    controller.validateParticipation
  );

  // ====================================================================
  // ROUTES AUTHENTIFIÉES - GESTION DES MÉDIAS
  // ====================================================================

  /**
   * @route   POST /api/evenements/:id/medias
   * @desc    Ajouter des médias à un événement
   * @access  Private - Owner OU Admin
   * @note    Upload géré dans le contrôleur (max 10 images)
   */
  router.post('/:id/medias',
    auth.authenticate,
    validation.validateId('id'),
    auth.requireOwnership('Evenement', 'id', 'id_user'),
    security.sanitizeInput,
    rateLimit.creation,
    [
      body('descriptions')
        .optional()
        .isArray()
        .withMessage('Les descriptions doivent être un tableau'),
      body('descriptions.*')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description max 500 caractères')
    ],
    validation.handleValidationErrors,
    cache.invalidateCache(['/evenements']),
    audit.logAction('add_medias_evenement', { entityType: 'evenement' }),
    controller.addMedias // Gère l'upload en interne
  );

  /**
   * @route   DELETE /api/evenements/:id/medias/:mediaId
   * @desc    Supprimer un média d'un événement
   * @access  Private - Owner OU Admin
   */
  router.delete('/:id/medias/:mediaId',
    auth.authenticate,
    validation.validateId('id'),
    validation.validateId('mediaId'),
    auth.requireOwnership('Evenement', 'id', 'id_user'),
    cache.invalidateCache(['/evenements']),
    audit.logAction('delete_media_evenement', { entityType: 'evenement' }),
    controller.deleteMedia
  );

  // ====================================================================
  // ROUTES AUTHENTIFIÉES - GESTION DES ŒUVRES
  // ====================================================================

  /**
   * @route   GET /api/evenements/:id/mes-oeuvres
   * @desc    Récupérer les œuvres disponibles pour cet événement
   * @access  Private - Owner OU Admin
   */
  router.get('/:id/mes-oeuvres',
    auth.authenticate,
    validation.validateId('id'),
    auth.requireOwnership('Evenement', 'id', 'id_user'),
    cache.userCache(300),
    controller.getMesOeuvresEvenement
  );

  /**
   * @route   POST /api/evenements/:id/oeuvres
   * @desc    Ajouter une œuvre à un événement
   * @access  Private - Owner OU Admin
   */
  router.post('/:id/oeuvres',
    auth.authenticate,
    validation.validateId('id'),
    auth.requireOwnership('Evenement', 'id', 'id_user'),
    security.sanitizeInput,
    [
      body('id_oeuvre')
        .isInt({ min: 1 })
        .withMessage('ID de l\'œuvre invalide'),
      body('ordre')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Ordre invalide')
    ],
    validation.handleValidationErrors,
    cache.invalidateCache(['/evenements']),
    audit.logAction('add_oeuvre_evenement', { entityType: 'evenement' }),
    controller.addOeuvreProfessionnel
  );

  /**
   * @route   DELETE /api/evenements/:id/oeuvres/:oeuvreId
   * @desc    Retirer une œuvre d'un événement
   * @access  Private - Owner OU Admin
   */
  router.delete('/:id/oeuvres/:oeuvreId',
    auth.authenticate,
    validation.validateId('id'),
    validation.validateId('oeuvreId'),
    auth.requireOwnership('Evenement', 'id', 'id_user'),
    cache.invalidateCache(['/evenements']),
    audit.logAction('remove_oeuvre_evenement', { entityType: 'evenement' }),
    controller.removeOeuvreProfessionnel
  );

  // ====================================================================
  // ROUTES AUTHENTIFIÉES - NOTIFICATIONS
  // ====================================================================

  /**
   * @route   POST /api/evenements/:id/notification
   * @desc    Envoyer une notification manuelle aux participants
   * @access  Private - Owner OU Admin
   */
  router.post('/:id/notification',
    auth.authenticate,
    validation.validateId('id'),
    auth.requireOwnership('Evenement', 'id', 'id_user'),
    security.sanitizeInput,
    rateLimit.sensitiveActions,
    [
      body('sujet')
        .notEmpty()
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage('Sujet entre 3 et 100 caractères'),
      body('message')
        .notEmpty()
        .trim()
        .isLength({ min: 10, max: 1000 })
        .withMessage('Message entre 10 et 1000 caractères'),
      body('participants')
        .optional()
        .isArray()
        .withMessage('Participants doit être un tableau'),
      body('participants.*')
        .isInt({ min: 1 })
        .withMessage('ID participant invalide')
    ],
    validation.handleValidationErrors,
    audit.logAction('send_notification_evenement', { entityType: 'evenement' }),
    controller.sendNotificationManuelle
  );

  // Log de confirmation
  console.log('✅ Routes événements initialisées avec sécurité renforcée');
  
  return router;
};

module.exports = createEvenementRoutes;