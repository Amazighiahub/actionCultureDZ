// routes/metadataRoutes.js - VERSION i18n CORRIGÉE
const express = require('express');
const router = express.Router();
const MetadataController = require('../controllers/MetadataController');
const createAuthMiddleware = require('../middlewares/authMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');
const { body, param, query } = require('express-validator');

// ⚡ Import du middleware de validation de langue (CHEMIN CORRIGÉ)
const { validateLanguage } = require('../middlewares/language');

const initMetadataRoutes = (models) => {
  const authMiddleware = createAuthMiddleware(models);
  const metadataController = new MetadataController(models);

  // ========================================================================
  // ROUTES PUBLIQUES - CONSULTATION
  // ========================================================================

  // Toutes les métadonnées
  router.get('/',
    metadataController.getAllMetadata.bind(metadataController)
  );

  // Types d'œuvres
  router.get('/types-oeuvres',
    metadataController.getTypesOeuvres.bind(metadataController)
  );

  // Genres par type
  router.get('/genres/:typeId',
    validationMiddleware.validateId('typeId'),
    metadataController.getGenresParType.bind(metadataController)
  );

  // Catégories par genre
  router.get('/categories/:genreId',
    validationMiddleware.validateId('genreId'),
    metadataController.getCategoriesParGenre.bind(metadataController)
  );

  // Hiérarchie complète
  router.get('/hierarchie',
    metadataController.getHierarchieComplete.bind(metadataController)
  );

  // Tags avec recherche
  router.get('/tags',
    [
      query('search').optional().trim(),
      query('limit').optional().isInt({ min: 1, max: 100 })
    ],
    validationMiddleware.handleValidationErrors,
    metadataController.getTags.bind(metadataController)
  );

  // Matériaux
  router.get('/materiaux',
    [query('search').optional().trim()],
    validationMiddleware.handleValidationErrors,
    metadataController.getMateriaux.bind(metadataController)
  );

  // Techniques
  router.get('/techniques',
    [query('search').optional().trim()],
    validationMiddleware.handleValidationErrors,
    metadataController.getTechniques.bind(metadataController)
  );

  // Langues
  router.get('/langues',
    metadataController.getLangues.bind(metadataController)
  );

  // Wilayas
  router.get('/wilayas',
    metadataController.getWilayas.bind(metadataController)
  );

  // Dairas par wilaya
  router.get('/wilayas/:wilayaId/dairas',
    validationMiddleware.validateId('wilayaId'),
    metadataController.getDairasParWilaya.bind(metadataController)
  );

  // Communes par daira
  router.get('/dairas/:dairaId/communes',
    validationMiddleware.validateId('dairaId'),
    metadataController.getCommunesParDaira.bind(metadataController)
  );

  // Types d'événements
  router.get('/types-evenements',
    metadataController.getTypesEvenements.bind(metadataController)
  );

  // ========================================================================
  // ⚡ ROUTES DE TRADUCTION (ADMIN) - CATÉGORIES
  // ========================================================================

  router.get('/categories/:id/translations',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('id'),
    metadataController.getCategorieTranslations.bind(metadataController)
  );

  router.patch('/categories/:id/translation/:lang',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('id'),
    validateLanguage,
    [
      body('nom').optional().isString().isLength({ max: 100 }),
      body('description').optional().isString().isLength({ max: 500 })
    ],
    validationMiddleware.handleValidationErrors,
    metadataController.updateCategorieTranslation.bind(metadataController)
  );

  // ========================================================================
  // ⚡ ROUTES DE TRADUCTION (ADMIN) - GENRES
  // ========================================================================

  router.get('/genres/:id/translations',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('id'),
    metadataController.getGenreTranslations.bind(metadataController)
  );

  router.patch('/genres/:id/translation/:lang',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('id'),
    validateLanguage,
    [
      body('nom').optional().isString().isLength({ max: 100 }),
      body('description').optional().isString().isLength({ max: 500 })
    ],
    validationMiddleware.handleValidationErrors,
    metadataController.updateGenreTranslation.bind(metadataController)
  );

  // ========================================================================
  // ⚡ ROUTES DE TRADUCTION (ADMIN) - TYPES D'ŒUVRES
  // ========================================================================

  router.get('/types-oeuvres/:id/translations',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('id'),
    metadataController.getTypeOeuvreTranslations.bind(metadataController)
  );

  router.patch('/types-oeuvres/:id/translation/:lang',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('id'),
    validateLanguage,
    [
      body('nom').optional().isString().isLength({ max: 100 }),
      body('description').optional().isString().isLength({ max: 500 })
    ],
    validationMiddleware.handleValidationErrors,
    metadataController.updateTypeOeuvreTranslation.bind(metadataController)
  );

  // ========================================================================
  // ⚡ ROUTES DE TRADUCTION (ADMIN) - TAGS
  // ========================================================================

  router.get('/tags/:id/translations',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('id'),
    metadataController.getTagTranslations.bind(metadataController)
  );

  router.patch('/tags/:id/translation/:lang',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('id'),
    validateLanguage,
    [body('nom').optional().isString().isLength({ max: 100 })],
    validationMiddleware.handleValidationErrors,
    metadataController.updateTagTranslation.bind(metadataController)
  );

  // ========================================================================
  // ⚡ ROUTES DE TRADUCTION (ADMIN) - MATÉRIAUX
  // ========================================================================

  router.get('/materiaux/:id/translations',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('id'),
    metadataController.getMateriauTranslations.bind(metadataController)
  );

  router.patch('/materiaux/:id/translation/:lang',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('id'),
    validateLanguage,
    [
      body('nom').optional().isString().isLength({ max: 100 }),
      body('description').optional().isString().isLength({ max: 500 })
    ],
    validationMiddleware.handleValidationErrors,
    metadataController.updateMateriauTranslation.bind(metadataController)
  );

  // ========================================================================
  // ⚡ ROUTES DE TRADUCTION (ADMIN) - TECHNIQUES
  // ========================================================================

  router.get('/techniques/:id/translations',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('id'),
    metadataController.getTechniqueTranslations.bind(metadataController)
  );

  router.patch('/techniques/:id/translation/:lang',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('id'),
    validateLanguage,
    [
      body('nom').optional().isString().isLength({ max: 100 }),
      body('description').optional().isString().isLength({ max: 500 })
    ],
    validationMiddleware.handleValidationErrors,
    metadataController.updateTechniqueTranslation.bind(metadataController)
  );

  // ========================================================================
  // ROUTES ADMIN - GESTION DES MÉTADONNÉES
  // ========================================================================

  // Créer un type d'œuvre
  router.post('/types-oeuvres',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    [
      body('nom').custom((value) => {
        if (typeof value === 'string') return value.trim().length >= 2;
        if (typeof value === 'object') return Object.values(value).some(v => v && v.length >= 2);
        return false;
      }).withMessage('Nom requis (min 2 caractères)'),
      body('description').optional()
    ],
    validationMiddleware.handleValidationErrors,
    metadataController.createTypeOeuvre.bind(metadataController)
  );

  // Créer un genre
  router.post('/genres',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    [
      body('nom').custom((value) => {
        if (typeof value === 'string') return value.trim().length >= 2;
        if (typeof value === 'object') return Object.values(value).some(v => v && v.length >= 2);
        return false;
      }).withMessage('Nom requis'),
      body('id_type_oeuvre').isInt().withMessage('Type d\'œuvre requis')
    ],
    validationMiddleware.handleValidationErrors,
    metadataController.createGenre.bind(metadataController)
  );

  // Créer une catégorie
  router.post('/categories',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    [
      body('nom').custom((value) => {
        if (typeof value === 'string') return value.trim().length >= 2;
        if (typeof value === 'object') return Object.values(value).some(v => v && v.length >= 2);
        return false;
      }).withMessage('Nom requis'),
      body('id_genre').isInt().withMessage('Genre requis')
    ],
    validationMiddleware.handleValidationErrors,
    metadataController.createCategorie.bind(metadataController)
  );

  // Créer un tag
  router.post('/tags',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    [
      body('nom').custom((value) => {
        if (typeof value === 'string') return value.trim().length >= 2;
        if (typeof value === 'object') return Object.values(value).some(v => v && v.length >= 2);
        return false;
      }).withMessage('Nom requis')
    ],
    validationMiddleware.handleValidationErrors,
    metadataController.createTag.bind(metadataController)
  );

  // Créer un matériau
  router.post('/materiaux',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    [
      body('nom').custom((value) => {
        if (typeof value === 'string') return value.trim().length >= 2;
        if (typeof value === 'object') return Object.values(value).some(v => v && v.length >= 2);
        return false;
      }).withMessage('Nom requis')
    ],
    validationMiddleware.handleValidationErrors,
    metadataController.createMateriau.bind(metadataController)
  );

  // Créer une technique
  router.post('/techniques',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    [
      body('nom').custom((value) => {
        if (typeof value === 'string') return value.trim().length >= 2;
        if (typeof value === 'object') return Object.values(value).some(v => v && v.length >= 2);
        return false;
      }).withMessage('Nom requis')
    ],
    validationMiddleware.handleValidationErrors,
    metadataController.createTechnique.bind(metadataController)
  );

  console.log('✅ Routes metadata i18n initialisées');

  return router;
};

module.exports = initMetadataRoutes;