// routes/lieuRoutes.js - VERSION i18n
const express = require('express');
const router = express.Router();
const LieuController = require('../controllers/lieuController');
const createAuthMiddleware = require('../middlewares/authMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');
const { body, param, query } = require('express-validator');

// ⚡ Import du middleware de validation de langue
const { validateLanguage } = require('../middlewares/language');

const initLieuRoutes = (models) => {
  const authMiddleware = createAuthMiddleware(models);
  const lieuController = new LieuController();

  // ⚡ Validation acceptant string OU JSON pour les champs multilingues
  const createLieuValidation = [
    body('nom')
      .custom((value) => {
        if (typeof value === 'string') {
          return value.trim().length >= 2 && value.trim().length <= 255;
        }
        if (typeof value === 'object') {
          return Object.values(value).some(v => v && v.length >= 2);
        }
        return false;
      })
      .withMessage((value, { req }) => req.t('validation.invalidName')),
    body('adresse')
      .custom((value) => {
        if (typeof value === 'string') {
          return value.trim().length >= 5 && value.trim().length <= 255;
        }
        if (typeof value === 'object') {
          return Object.values(value).some(v => v && v.length >= 5);
        }
        return false;
      })
      .withMessage((value, { req }) => req.t('validation.invalidAddress')),
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage((value, { req }) => req.t('validation.invalidLatitude')),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage((value, { req }) => req.t('validation.invalidLongitude')),
    body('typeLieu').optional().isIn(['Wilaya', 'Daira', 'Commune']).withMessage((value, { req }) => req.t('validation.invalidType')),
    body('typeLieuCulturel').optional().isString().withMessage((value, { req }) => req.t('validation.invalidType')),
    body('description')
      .optional()
      .custom((value) => {
        if (typeof value === 'string') return value.length <= 5000;
        if (typeof value === 'object') return true;
        return true;
      })
      .withMessage((value, { req }) => req.t('validation.descriptionTooLong')),
    body('histoire')
      .optional()
      .custom((value) => {
        if (typeof value === 'string') return value.length <= 10000;
        if (typeof value === 'object') return true;
        return true;
      })
      .withMessage((value, { req }) => req.t('validation.descriptionTooLong'))
  ];

  const updateLieuValidation = [
    body('nom')
      .optional()
      .custom((value) => {
        if (typeof value === 'string') {
          return value.trim().length >= 2 && value.trim().length <= 255;
        }
        if (typeof value === 'object') return true;
        return false;
      })
      .withMessage((value, { req }) => req.t('validation.invalidName')),
    body('adresse')
      .optional()
      .custom((value) => {
        if (typeof value === 'string') {
          return value.trim().length >= 5 && value.trim().length <= 255;
        }
        if (typeof value === 'object') return true;
        return false;
      })
      .withMessage((value, { req }) => req.t('validation.invalidAddress')),
    body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage((value, { req }) => req.t('validation.invalidLatitude')),
    body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage((value, { req }) => req.t('validation.invalidLongitude'))
  ];

  // ========================================================================
  // ROUTES PUBLIQUES
  // ========================================================================

  // Liste des lieux avec pagination et filtres
  router.get('/', 
    [
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
      query('search').optional().trim(),
      query('wilaya').optional().isInt(),
      query('type').optional().isString()
    ],
    validationMiddleware.handleValidationErrors,
    lieuController.getAllLieux.bind(lieuController)
  );

  // Lieux par wilaya
  router.get('/wilaya/:wilayaId',
    validationMiddleware.validateId('wilayaId'),
    lieuController.getLieuxByWilaya.bind(lieuController)
  );

  // Lieux à proximité
  router.get('/proximite',
    [
      query('latitude').isFloat({ min: -90, max: 90 }).withMessage((value, { req }) => req.t('validation.invalidLatitude')),
      query('longitude').isFloat({ min: -180, max: 180 }).withMessage((value, { req }) => req.t('validation.invalidLongitude')),
      query('radius').optional().isFloat({ min: 0.1, max: 100 }).withMessage((value, { req }) => req.t('validation.invalidRadius'))
    ],
    validationMiddleware.handleValidationErrors,
    lieuController.getLieuxProximite.bind(lieuController)
  );

  // Recherche de lieux
  router.get('/search',
    [
      query('q').optional().trim(),
      query('typeLieuCulturel').optional().isString(),
      query('wilayaId').optional().isInt()
    ],
    validationMiddleware.handleValidationErrors,
    lieuController.searchLieux.bind(lieuController)
  );

  // Vérifier les doublons (doit être AVANT les routes avec :id)
  router.post('/check-duplicate',
    authMiddleware.authenticate,
    [
      body('nom').isString().withMessage((value, { req }) => req.t('validation.invalidName')),
      body('latitude').isFloat().withMessage((value, { req }) => req.t('validation.invalidLatitude')),
      body('longitude').isFloat().withMessage((value, { req }) => req.t('validation.invalidLongitude'))
    ],
    validationMiddleware.handleValidationErrors,
    lieuController.checkDuplicate.bind(lieuController)
  );

  // Statistiques
  router.get('/statistiques', 
    lieuController.getStatistiquesLieux.bind(lieuController)
  );

  // ========================================================================
  // ⚡ ROUTES DE TRADUCTION (ADMIN)
  // ========================================================================

  // Récupérer toutes les traductions d'un lieu
  router.get('/:id/translations',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('id'),
    lieuController.getLieuTranslations.bind(lieuController)
  );

  // Mettre à jour une traduction spécifique
  router.patch('/:id/translation/:lang',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('id'),
    validateLanguage,
    [
      body('nom').optional().isString().isLength({ max: 255 }),
      body('adresse').optional().isString().isLength({ max: 255 }),
      body('description').optional().isString().isLength({ max: 5000 }),
      body('histoire').optional().isString().isLength({ max: 10000 })
    ],
    validationMiddleware.handleValidationErrors,
    lieuController.updateLieuTranslation.bind(lieuController)
  );

  // ========================================================================
  // ROUTES AVEC :id (après les routes spécifiques)
  // ========================================================================

  // Détails d'un lieu
  router.get('/:id', 
    validationMiddleware.validateId('id'),
    lieuController.getLieuById.bind(lieuController)
  );

  // ========================================================================
  // ROUTES PROTÉGÉES
  // ========================================================================

  // Créer un lieu
  router.post('/', 
    authMiddleware.authenticate,
    authMiddleware.requireRole(['Contributeur', 'Modérateur', 'Administrateur']),
    createLieuValidation,
    validationMiddleware.handleValidationErrors,
    lieuController.createLieu.bind(lieuController)
  );

  // Mettre à jour un lieu
  router.put('/:id',
    authMiddleware.authenticate,
    authMiddleware.requireRole(['Modérateur', 'Administrateur']),
    validationMiddleware.validateId('id'),
    updateLieuValidation,
    validationMiddleware.handleValidationErrors,
    lieuController.updateLieu.bind(lieuController)
  );

  // Supprimer un lieu
  router.delete('/:id',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('id'),
    lieuController.deleteLieu.bind(lieuController)
  );

  // ========================================================================
  // ROUTES SERVICES D'UN LIEU
  // ========================================================================

  // Obtenir les services d'un lieu
  router.get('/:id/services',
    validationMiddleware.validateId('id'),
    lieuController.getServicesLieu.bind(lieuController)
  );

  // Ajouter un service à un lieu
  router.post('/:id/services',
    authMiddleware.authenticate,
    authMiddleware.requireRole(['Contributeur', 'Modérateur', 'Administrateur']),
    validationMiddleware.validateId('id'),
    [
      body('nom').optional().custom((value) => {
        if (typeof value === 'string') return value.length >= 2;
        if (typeof value === 'object') return Object.values(value).some(v => v && v.length >= 2);
        return false;
      }).withMessage((value, { req }) => req.t('validation.invalidName')),
      body('services').optional().isArray().withMessage((value, { req }) => req.t('validation.invalidData')),
      body('disponible').optional().isBoolean()
    ],
    validationMiddleware.handleValidationErrors,
    lieuController.addServiceLieu.bind(lieuController)
  );

  // Mettre à jour un service
  router.put('/:id/services/:serviceId',
    authMiddleware.authenticate,
    authMiddleware.requireRole(['Modérateur', 'Administrateur']),
    validationMiddleware.validateId('id'),
    [
      param('serviceId').isInt().withMessage((value, { req }) => req.t('validation.invalidId')),
      body('nom').optional(),
      body('description').optional(),
      body('disponible').optional().isBoolean()
    ],
    validationMiddleware.handleValidationErrors,
    lieuController.updateServiceLieu.bind(lieuController)
  );

  // Supprimer un service
  router.delete('/:id/services/:serviceId',
    authMiddleware.authenticate,
    authMiddleware.requireRole(['Modérateur', 'Administrateur']),
    validationMiddleware.validateId('id'),
    [param('serviceId').isInt().withMessage((value, { req }) => req.t('validation.invalidId'))],
    validationMiddleware.handleValidationErrors,
    lieuController.deleteServiceLieu.bind(lieuController)
  );

  // ========================================================================
  // ROUTES DÉTAILS D'UN LIEU
  // ========================================================================

  // Obtenir les détails d'un lieu
  router.get('/:id/details',
    validationMiddleware.validateId('id'),
    lieuController.getDetailsLieu.bind(lieuController)
  );

  // Mettre à jour les détails d'un lieu
  router.put('/:id/details',
    authMiddleware.authenticate,
    authMiddleware.requireValidatedProfessional,
    param('id').isInt().withMessage((value, { req }) => req.t('validation.invalidId')),
    validationMiddleware.handleValidationErrors,
    lieuController.updateDetailsLieu.bind(lieuController)
  );


  return router;
};

module.exports = initLieuRoutes;
