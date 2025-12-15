// routes/artisanatRoutes.js - VERSION i18n
const express = require('express');
const router = express.Router();
const ArtisanatController = require('../controllers/ArtisanatController');
const createAuthMiddleware = require('../middlewares/authMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');
const { body, param, query } = require('express-validator');

// ⚡ Import du middleware de validation de langue
const { validateLanguage } = require('../middlewares/language');

const initArtisanatRoutes = (models) => {
  const authMiddleware = createAuthMiddleware(models);
  const artisanatController = new ArtisanatController(models);

  // ⚡ Validation acceptant string OU JSON pour les champs multilingues
  const createArtisanatValidation = [
    body('titre')
      .custom((value) => {
        if (typeof value === 'string') {
          return value.trim().length >= 3 && value.trim().length <= 255;
        }
        if (typeof value === 'object') {
          return Object.values(value).some(v => v && v.length >= 3);
        }
        return false;
      })
      .withMessage('Le titre doit contenir entre 3 et 255 caractères'),
    body('description')
      .optional()
      .custom((value) => {
        if (typeof value === 'string') return value.length <= 5000;
        if (typeof value === 'object') return true;
        return true;
      })
      .withMessage('Description trop longue'),
    body('id_langue').isInt().withMessage('Langue invalide'),
    body('id_materiau').optional().isInt().withMessage('Matériau invalide'),
    body('id_technique').optional().isInt().withMessage('Technique invalide'),
    body('prix').optional().isFloat({ min: 0 }).withMessage('Prix invalide'),
    body('dimensions').optional().isLength({ max: 255 }),
    body('poids').optional().isFloat({ min: 0 })
  ];

  const updateArtisanatValidation = [
    body('titre')
      .optional()
      .custom((value) => {
        if (typeof value === 'string') {
          return value.trim().length >= 3 && value.trim().length <= 255;
        }
        if (typeof value === 'object') return true;
        return false;
      })
      .withMessage('Le titre doit contenir entre 3 et 255 caractères'),
    body('description')
      .optional()
      .custom((value) => {
        if (typeof value === 'string') return value.length <= 5000;
        if (typeof value === 'object') return true;
        return true;
      })
  ];

  // ========================================================================
  // ROUTES PUBLIQUES (consultation)
  // ========================================================================

  // Liste des artisanats
  router.get('/', 
    [
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
      query('search').optional().trim(),
      query('materiau').optional().isInt(),
      query('technique').optional().isInt(),
      query('wilaya').optional().isInt()
    ],
    validationMiddleware.handleValidationErrors,
    artisanatController.getAllArtisanats.bind(artisanatController)
  );

  // Recherche
  router.get('/search', 
    [
      query('q').trim().isLength({ min: 2 }).withMessage('Minimum 2 caractères')
    ],
    validationMiddleware.handleValidationErrors,
    artisanatController.searchArtisanats.bind(artisanatController)
  );

  // Statistiques
  router.get('/statistics', 
    artisanatController.getStatistiques.bind(artisanatController)
  );

  // Artisans par région
  router.get('/region/:wilayaId/artisans', 
    validationMiddleware.validateId('wilayaId'),
    artisanatController.getArtisansByRegion.bind(artisanatController)
  );

  // ========================================================================
  // ⚡ ROUTES DE TRADUCTION (ADMIN)
  // ========================================================================

  // Récupérer toutes les traductions d'un artisanat
  router.get('/:id/translations',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('id'),
    artisanatController.getArtisanatTranslations.bind(artisanatController)
  );

  // Mettre à jour une traduction spécifique
  router.patch('/:id/translation/:lang',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('id'),
    validateLanguage,
    [
      body('titre').optional().isString().isLength({ max: 255 }),
      body('description').optional().isString().isLength({ max: 5000 })
    ],
    validationMiddleware.handleValidationErrors,
    artisanatController.updateArtisanatTranslation.bind(artisanatController)
  );

  // ========================================================================
  // ROUTES AVEC :id (après les routes spécifiques)
  // ========================================================================

  // Détails d'un artisanat
  router.get('/:id', 
    validationMiddleware.validateId('id'),
    artisanatController.getArtisanatById.bind(artisanatController)
  );

  // ========================================================================
  // ROUTES POUR PROFESSIONNELS VALIDÉS
  // ========================================================================

  // Créer un artisanat
  router.post('/', 
    authMiddleware.authenticate,
    authMiddleware.requireValidatedProfessional,
    createArtisanatValidation,
    validationMiddleware.handleValidationErrors,
    artisanatController.createArtisanat.bind(artisanatController)
  );

  // Upload de médias
  router.post('/:id/medias', 
    authMiddleware.authenticate,
    authMiddleware.requireValidatedProfessional,
    validationMiddleware.validateId('id'),
    async (req, res, next) => {
      try {
        const artisanat = await models.Artisanat.findByPk(req.params.id, {
          include: [{ model: models.Oeuvre }]
        });
        
        if (!artisanat) {
          return res.status(404).json({ success: false, error: 'Artisanat non trouvé' });
        }
        
        if (artisanat.Oeuvre.saisi_par !== req.user.id_user && !req.user.isAdmin) {
          return res.status(403).json({ success: false, error: 'Accès refusé' });
        }
        
        req.artisanat = artisanat;
        next();
      } catch (error) {
        next(error);
      }
    },
    artisanatController.upload.array('medias', 10),
    artisanatController.uploadMedias.bind(artisanatController)
  );

  // Mettre à jour un artisanat
  router.put('/:id', 
    authMiddleware.authenticate,
    authMiddleware.requireValidatedProfessional,
    validationMiddleware.validateId('id'),
    async (req, res, next) => {
      try {
        const artisanat = await models.Artisanat.findByPk(req.params.id, {
          include: [{ model: models.Oeuvre }]
        });
        
        if (!artisanat) {
          return res.status(404).json({ success: false, error: 'Artisanat non trouvé' });
        }
        
        if (artisanat.Oeuvre.saisi_par !== req.user.id_user && !req.user.isAdmin) {
          return res.status(403).json({ success: false, error: 'Accès refusé' });
        }
        
        req.artisanat = artisanat;
        next();
      } catch (error) {
        next(error);
      }
    },
    updateArtisanatValidation,
    validationMiddleware.handleValidationErrors,
    artisanatController.updateArtisanat.bind(artisanatController)
  );

  // Supprimer un artisanat
  router.delete('/:id', 
    authMiddleware.authenticate,
    authMiddleware.requireValidatedProfessional,
    validationMiddleware.validateId('id'),
    async (req, res, next) => {
      try {
        const artisanat = await models.Artisanat.findByPk(req.params.id, {
          include: [{ model: models.Oeuvre }]
        });
        
        if (!artisanat) {
          return res.status(404).json({ success: false, error: 'Artisanat non trouvé' });
        }
        
        if (artisanat.Oeuvre.saisi_par !== req.user.id_user && !req.user.isAdmin) {
          return res.status(403).json({ success: false, error: 'Accès refusé' });
        }
        
        req.artisanat = artisanat;
        next();
      } catch (error) {
        next(error);
      }
    },
    artisanatController.deleteArtisanat.bind(artisanatController)
  );

  console.log('✅ Routes artisanat i18n initialisées');
  console.log('  🌍 Routes traduction: GET /:id/translations, PATCH /:id/translation/:lang');

  return router;
};

module.exports = initArtisanatRoutes;
