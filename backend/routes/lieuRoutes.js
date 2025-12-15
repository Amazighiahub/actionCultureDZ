// routes/lieuRoutes.js - VERSION i18n
const express = require('express');
const router = express.Router();
const LieuController = require('../controllers/LieuController');
const createAuthMiddleware = require('../middlewares/authMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');
const { body, param, query } = require('express-validator');

// ⚡ Import du middleware de validation de langue
const { validateLanguage } = require('../middlewares/language');

const initLieuRoutes = (models) => {
  const authMiddleware = createAuthMiddleware(models);
  const lieuController = new LieuController(models);

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
      .withMessage('Le nom doit contenir entre 2 et 255 caractères'),
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
      .withMessage('L\'adresse doit contenir entre 5 et 255 caractères'),
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude invalide'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude invalide'),
    body('typeLieu').isIn(['Wilaya', 'Daira', 'Commune']).withMessage('Type de lieu invalide'),
    body('description')
      .optional()
      .custom((value) => {
        if (typeof value === 'string') return value.length <= 5000;
        if (typeof value === 'object') return true;
        return true;
      })
      .withMessage('Description trop longue'),
    body('histoire')
      .optional()
      .custom((value) => {
        if (typeof value === 'string') return value.length <= 10000;
        if (typeof value === 'object') return true;
        return true;
      })
      .withMessage('Histoire trop longue')
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
      .withMessage('Le nom doit contenir entre 2 et 255 caractères'),
    body('adresse')
      .optional()
      .custom((value) => {
        if (typeof value === 'string') {
          return value.trim().length >= 5 && value.trim().length <= 255;
        }
        if (typeof value === 'object') return true;
        return false;
      })
      .withMessage('L\'adresse doit contenir entre 5 et 255 caractères'),
    body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude invalide'),
    body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude invalide')
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
      query('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude invalide'),
      query('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude invalide'),
      query('radius').optional().isFloat({ min: 0.1, max: 100 }).withMessage('Rayon invalide')
    ],
    validationMiddleware.handleValidationErrors,
    lieuController.getLieuxProximite.bind(lieuController)
  );

  // Recherche de lieux
  router.get('/search',
    [
      query('q').trim().isLength({ min: 2 }).withMessage('Minimum 2 caractères')
    ],
    validationMiddleware.handleValidationErrors,
    lieuController.searchLieux.bind(lieuController)
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

  console.log('✅ Routes lieux i18n initialisées');
  console.log('  🌍 Routes traduction: GET /:id/translations, PATCH /:id/translation/:lang');

  return router;
};

module.exports = initLieuRoutes;
