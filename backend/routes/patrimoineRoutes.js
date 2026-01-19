// routes/patrimoineRoutes.js - VERSION i18n
const express = require('express');
const router = express.Router();

const initPatrimoineRoutes = (models) => {
  const PatrimoineController = require('../controllers/PatrimoineController');
  const ParcoursIntelligentController = require('../controllers/ParcoursIntelligentController');
  const LieuController = require('../controllers/LieuController');
  const createAuthMiddleware = require('../middlewares/authMiddleware');
  const validationMiddleware = require('../middlewares/validationMiddleware');
  const cacheMiddleware = require('../middlewares/cacheMiddleware');
  const { body, query, param } = require('express-validator');

  // ⚡ Import du middleware de validation de langue
  const { validateLanguage } = require('../middlewares/language');

  const authMiddleware = createAuthMiddleware(models);
  const patrimoineController = new PatrimoineController(models);
  const parcoursController = new ParcoursIntelligentController(models);
  const lieuController = new LieuController(models);

  // ====================================================================
  // ROUTES PUBLIQUES - CONSULTATION
  // ====================================================================

  // Sites populaires
  router.get('/sites/populaires',
    cacheMiddleware.conditionalCache(3600),
    patrimoineController.getSitesPopulaires.bind(patrimoineController)
  );

  // Tous les sites
  router.get('/sites',
    [
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
      query('wilaya').optional().isInt(),
      query('search').optional().trim(),
      query('includeQR').optional().isBoolean()
    ],
    validationMiddleware.handleValidationErrors,
    patrimoineController.getAllSitesPatrimoniaux.bind(patrimoineController)
  );

  // Recherche
  router.get('/recherche',
    [
      query('q').optional().trim().escape(),
      query('wilaya').optional().isInt(),
      query('limit').optional().isInt({ min: 1, max: 50 })
    ],
    validationMiddleware.handleValidationErrors,
    patrimoineController.recherchePatrimoine.bind(patrimoineController)
  );

  // Monuments et vestiges
  router.get('/monuments/:type',
    patrimoineController.getMonumentsByType.bind(patrimoineController)
  );

  router.get('/vestiges/:type',
    patrimoineController.getVestigesByType.bind(patrimoineController)
  );

  // Statistiques
  router.get('/statistiques',
    cacheMiddleware.conditionalCache(7200),
    patrimoineController.getStatistiquesPatrimoine.bind(patrimoineController)
  );

  // ⚡ Types de patrimoine (pour filtres frontend)
  router.get('/types',
    cacheMiddleware.conditionalCache(86400), // Cache 24h
    patrimoineController.getTypesPatrimoine.bind(patrimoineController)
  );

  // ====================================================================
  // ⚡ ROUTES DE TRADUCTION (ADMIN) - MONUMENTS
  // ====================================================================

  router.get('/monuments/:id/translations',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('id'),
    patrimoineController.getMonumentTranslations.bind(patrimoineController)
  );

  router.patch('/monuments/:id/translation/:lang',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('id'),
    validateLanguage,
    [
      body('nom').optional().isString().isLength({ max: 255 }),
      body('description').optional().isString().isLength({ max: 5000 })
    ],
    validationMiddleware.handleValidationErrors,
    patrimoineController.updateMonumentTranslation.bind(patrimoineController)
  );

  // ====================================================================
  // ⚡ ROUTES DE TRADUCTION (ADMIN) - VESTIGES
  // ====================================================================

  router.get('/vestiges/:id/translations',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('id'),
    patrimoineController.getVestigeTranslations.bind(patrimoineController)
  );

  router.patch('/vestiges/:id/translation/:lang',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('id'),
    validateLanguage,
    [
      body('nom').optional().isString().isLength({ max: 255 }),
      body('description').optional().isString().isLength({ max: 5000 })
    ],
    validationMiddleware.handleValidationErrors,
    patrimoineController.updateVestigeTranslation.bind(patrimoineController)
  );

  // ====================================================================
  // ROUTES SITES - DÉTAILS ET GALERIE
  // ====================================================================

  // Galerie d'un site
  router.get('/sites/:id/galerie',
    validationMiddleware.validateId('id'),
    [
      query('type').optional().isIn(['image', 'video', 'all'])
    ],
    validationMiddleware.handleValidationErrors,
    patrimoineController.getGalerieSite.bind(patrimoineController)
  );

  // QR Codes
  router.get('/sites/:id/carte-visite',
    validationMiddleware.validateId('id'),
    [
      query('format').optional().isIn(['vcard', 'json'])
    ],
    validationMiddleware.handleValidationErrors,
    patrimoineController.genererCarteVisite.bind(patrimoineController)
  );

  router.get('/sites/:id/qrcode',
    validationMiddleware.validateId('id'),
    [
      query('size').optional().isInt({ min: 100, max: 1000 }),
      query('format').optional().isIn(['png', 'svg'])
    ],
    validationMiddleware.handleValidationErrors,
    patrimoineController.downloadQRCode.bind(patrimoineController)
  );

  // Détails d'un site (APRÈS les routes spécifiques)
  router.get('/sites/:id',
    validationMiddleware.validateId('id'),
    patrimoineController.getSitePatrimonialById.bind(patrimoineController)
  );

  // ====================================================================
  // PARCOURS TOURISTIQUES
  // ====================================================================

  router.get('/parcours',
    [
      query('wilaya').optional().isInt(),
      query('limit').optional().isInt({ min: 1, max: 20 })
    ],
    validationMiddleware.handleValidationErrors,
    patrimoineController.getParcoursPatrimoniaux.bind(patrimoineController)
  );

  router.get('/parcours/evenement/:evenementId',
    validationMiddleware.validateId('evenementId'),
    [
      query('rayon').optional().isFloat({ min: 1, max: 50 }),
      query('maxSites').optional().isInt({ min: 1, max: 20 }),
      query('dureeMaxParcours').optional().isInt({ min: 60, max: 720 })
    ],
    validationMiddleware.handleValidationErrors,
    parcoursController.generateParcoursForEvenement.bind(parcoursController)
  );

  router.post('/parcours/personnalise',
    authMiddleware.authenticate,
    [
      body('latitude').isFloat({ min: -90, max: 90 }),
      body('longitude').isFloat({ min: -180, max: 180 }),
      body('interests').optional().isArray(),
      body('duration').optional().isInt({ min: 30, max: 480 }),
      body('transport').optional().isIn(['marche', 'velo', 'voiture'])
    ],
    validationMiddleware.handleValidationErrors,
    parcoursController.generateParcoursPersonnalise.bind(parcoursController)
  );

  router.get('/parcours/populaires/:wilayaId',
    validationMiddleware.validateId('wilayaId'),
    [
      query('limit').optional().isInt({ min: 1, max: 10 })
    ],
    validationMiddleware.handleValidationErrors,
    parcoursController.getParcoursPopulaires.bind(parcoursController)
  );

  // ====================================================================
  // LIEUX PATRIMONIAUX
  // ====================================================================

  router.get('/lieux/proximite',
    [
      query('latitude').isFloat({ min: -90, max: 90 }),
      query('longitude').isFloat({ min: -180, max: 180 }),
      query('rayon').optional().isFloat({ min: 0.1, max: 100 }),
      query('limit').optional().isInt({ min: 1, max: 50 })
    ],
    validationMiddleware.handleValidationErrors,
    lieuController.getLieuxProximite.bind(lieuController)
  );

  router.get('/lieux/statistiques',
    cacheMiddleware.conditionalCache(3600),
    lieuController.getStatistiquesLieux.bind(lieuController)
  );

  // ====================================================================
  // ROUTES AUTHENTIFIÉES - GESTION
  // ====================================================================

  // Création d'un site patrimonial
  router.post('/sites',
    authMiddleware.authenticate,
    authMiddleware.requireRole(['Admin', 'Professionnel']),
    [
      body('lieu.nom').custom((value) => {
        if (typeof value === 'string') return value.trim().length >= 3;
        if (typeof value === 'object') return Object.values(value).some(v => v && v.length >= 3);
        return false;
      }),
      body('lieu.adresse').custom((value) => {
        if (typeof value === 'string') return value.trim().length >= 5;
        if (typeof value === 'object') return Object.values(value).some(v => v && v.length >= 5);
        return false;
      }),
      body('lieu.latitude').isFloat({ min: -90, max: 90 }),
      body('lieu.longitude').isFloat({ min: -180, max: 180 }),
      body('lieu.typeLieu').isIn(['Wilaya', 'Daira', 'Commune']),
      body('lieu.wilayaId').isInt(),
      body('details.description').optional(),
      body('details.histoire').optional(),
      body('monument').optional().isObject(),
      body('vestige').optional().isObject(),
      body('services').optional().isArray(),
      body('medias').optional().isArray()
    ],
    validationMiddleware.handleValidationErrors,
    patrimoineController.createSitePatrimonial.bind(patrimoineController)
  );

  // Mise à jour
  router.put('/sites/:id',
    authMiddleware.authenticate,
    authMiddleware.requireRole(['Admin']),
    validationMiddleware.validateId('id'),
    patrimoineController.updateSitePatrimonial.bind(patrimoineController)
  );

  // Suppression
  router.delete('/sites/:id',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('id'),
    patrimoineController.deleteSitePatrimonial.bind(patrimoineController)
  );

  // Noter un site
  router.post('/sites/:id/noter',
    authMiddleware.authenticate,
    validationMiddleware.validateId('id'),
    [
      body('note').isInt({ min: 1, max: 5 }),
      body('commentaire').optional().trim().isLength({ max: 500 })
    ],
    validationMiddleware.handleValidationErrors,
    patrimoineController.noterSite.bind(patrimoineController)
  );

  // Favoris
  router.post('/sites/:id/favoris',
    authMiddleware.authenticate,
    validationMiddleware.validateId('id'),
    patrimoineController.ajouterAuxFavoris.bind(patrimoineController)
  );

  router.delete('/sites/:id/favoris',
    authMiddleware.authenticate,
    validationMiddleware.validateId('id'),
    patrimoineController.retirerDesFavoris.bind(patrimoineController)
  );

  // Médias
  router.post('/sites/:id/medias',
    authMiddleware.authenticate,
    authMiddleware.requireRole(['Admin', 'Professionnel']),
    validationMiddleware.validateId('id'),
    patrimoineController.uploadMedias.bind(patrimoineController)
  );

  router.delete('/sites/:id/medias/:mediaId',
    authMiddleware.authenticate,
    authMiddleware.requireRole(['Admin']),
    validationMiddleware.validateId('id'),
    validationMiddleware.validateId('mediaId'),
    patrimoineController.deleteMedia.bind(patrimoineController)
  );

  // Horaires
  router.put('/sites/:id/horaires',
    authMiddleware.authenticate,
    authMiddleware.requireRole(['Admin', 'Professionnel']),
    validationMiddleware.validateId('id'),
    [
      body('horaires').isObject()
    ],
    validationMiddleware.handleValidationErrors,
    patrimoineController.updateHoraires.bind(patrimoineController)
  );

  // ====================================================================
  // ROUTES MOBILE
  // ====================================================================

  router.get('/mobile/nearby',
    [
      query('lat').isFloat({ min: -90, max: 90 }),
      query('lng').isFloat({ min: -180, max: 180 }),
      query('radius').optional().isFloat({ min: 0.1, max: 50 })
    ],
    validationMiddleware.handleValidationErrors,
    patrimoineController.getNearbyMobile.bind(patrimoineController)
  );

  router.post('/mobile/qr-scan',
    authMiddleware.authenticate,
    [
      body('qrData').notEmpty()
    ],
    validationMiddleware.handleValidationErrors,
    patrimoineController.handleQRScan.bind(patrimoineController)
  );

  router.get('/mobile/offline/:wilaya',
    validationMiddleware.validateId('wilaya'),
    patrimoineController.getOfflineDataPack.bind(patrimoineController)
  );

  // ====================================================================
  // ROUTES ADMIN
  // ====================================================================

  router.post('/admin/import',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    patrimoineController.importSitesPatrimoniaux.bind(patrimoineController)
  );

  router.get('/admin/export',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    [
      query('format').optional().isIn(['csv', 'excel', 'json'])
    ],
    validationMiddleware.handleValidationErrors,
    patrimoineController.exportSitesPatrimoniaux.bind(patrimoineController)
  );

  console.log('✅ Routes patrimoine i18n initialisées');
  console.log('  🌍 Routes traduction: monuments/:id/translations, vestiges/:id/translations');
  
  return router;
};

module.exports = initPatrimoineRoutes;
