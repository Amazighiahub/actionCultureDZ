// routes/intervenantRoutes.js - VERSION i18n
const express = require('express');
const IntervenantController = require('../controllers/intervenantController');
const validationMiddleware = require('../middlewares/validationMiddleware');
const { body, query, param } = require('express-validator');

// ⚡ Import du middleware de validation de langue
const { validateLanguage } = require('../middlewares/language');

const initIntervenantRoutes = (models, authMiddleware) => {
  const router = express.Router();
  
  
  const intervenantController = new IntervenantController(models);

  // ===== MIDDLEWARE PERSONNALISÉ =====
  
  const requireAdminOrProfessional = async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: req.t ? req.t('auth.tokenMissing') : 'Authentication required'
        });
      }

      if (req.user.role === 'Admin' || req.user.isAdmin) {
        return next();
      }
      
      if (req.user.role === 'Professionnel' || req.user.isProfessionnel) {
        if (req.user.statut === 'actif') {
          return next();
        } else {
          return res.status(403).json({
            success: false,
            error: req.t ? req.t('auth.pendingValidation') : 'Account pending validation',
            statut: req.user.statut
          });
        }
      }
      
      return res.status(403).json({
        success: false,
        error: req.t ? req.t('auth.forbidden') : 'Forbidden'
      });
    } catch (error) {
      console.error('Erreur vérification permissions:', error);
      return res.status(500).json({
        success: false,
        error: req.t ? req.t('common.serverError') : 'Server error'
      });
    }
  };

  // ===== ROUTES PUBLIQUES =====
  
  // Documentation API
  router.get('/docs/api', (req, res) => {
    res.json({
      success: true,
      message: 'API Intervenants i18n - Documentation',
      endpoints: {
        public: {
          list: 'GET /api/intervenants',
          search: 'GET /api/intervenants/search?q=terme',
          types: 'GET /api/intervenants/types',
          details: 'GET /api/intervenants/:id'
        },
        protected: {
          create: 'POST /api/intervenants',
          update: 'PUT /api/intervenants/:id',
          delete: 'DELETE /api/intervenants/:id'
        },
        i18n: {
          getTranslations: 'GET /api/intervenants/:id/translations (Admin)',
          updateTranslation: 'PATCH /api/intervenants/:id/translation/:lang (Admin)'
        }
      },
      languages: ['fr', 'ar', 'en', 'tz-ltn', 'tz-tfng']
    });
  });

  // Recherche d'intervenants (autocomplétion)
  router.get('/search',
    [
      query('q').trim().isLength({ min: 2 }).withMessage((value, { req }) => req.t('validation.searchRequired')),
      query('type_intervenant').optional().trim(),
      query('limit').optional().isInt({ min: 1, max: 50 })
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => intervenantController.searchIntervenants(req, res)
  );

  // Types d'intervenants
  router.get('/types',
    (req, res) => intervenantController.getTypesIntervenants(req, res)
  );

  // Statistiques (Admin)
  router.get('/stats/overview',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    (req, res) => intervenantController.getStatistiques(req, res)
  );

  // Liste des intervenants
  router.get('/',
    [
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
      query('search').optional().trim(),
      query('type_intervenant').optional().trim(),
      query('specialite').optional().trim(),
      query('wilaya_id').optional().isInt({ min: 1 }),
      query('disponible').optional().isBoolean()
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => intervenantController.getIntervenants(req, res)
  );

  // ========================================================================
  // ⚡ ROUTES DE TRADUCTION (ADMIN)
  // ========================================================================

  // Récupérer toutes les traductions d'un intervenant
  router.get('/:id/translations',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('id'),
    (req, res) => intervenantController.getIntervenantTranslations(req, res)
  );

  // Mettre à jour une traduction spécifique
  router.patch('/:id/translation/:lang',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('id'),
    validateLanguage,
    [
      body('nom').optional().isString().isLength({ max: 100 }),
      body('prenom').optional().isString().isLength({ max: 100 }),
      body('biographie').optional().isString().isLength({ max: 2000 })
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => intervenantController.updateIntervenantTranslation(req, res)
  );

  // ========================================================================
  // ROUTES AVEC :id (après les routes spécifiques)
  // ========================================================================

  // Détails d'un intervenant
  router.get('/:id',
    validationMiddleware.validateId('id'),
    (req, res) => intervenantController.getIntervenantById(req, res)
  );

  // Œuvres d'un intervenant
  router.get('/:id/oeuvres',
    validationMiddleware.validateId('id'),
    (req, res) => intervenantController.getOeuvresByIntervenant(req, res)
  );

  // ===== ROUTES PROTÉGÉES (Admin + Professionnel) =====

  // ⚡ Validation acceptant string OU JSON pour les champs multilingues
  const createIntervenantValidation = [
    body('nom')
      .custom((value) => {
        if (typeof value === 'string') return value.trim().length > 0 && value.trim().length <= 100;
        if (typeof value === 'object') return Object.values(value).some(v => v && v.length > 0);
        return false;
      })
      .withMessage((value, { req }) => req.t('validation.invalidName')),
    body('prenom')
      .custom((value) => {
        if (typeof value === 'string') return value.trim().length > 0 && value.trim().length <= 100;
        if (typeof value === 'object') return Object.values(value).some(v => v && v.length > 0);
        return false;
      })
      .withMessage((value, { req }) => req.t('validation.invalidFirstName')),
    body('type_intervenant').trim().notEmpty().withMessage((value, { req }) => req.t('validation.invalidType')),
    body('specialite').optional().trim().isLength({ max: 200 }),
    body('biographie')
      .optional()
      .custom((value) => {
        if (typeof value === 'string') return value.length <= 2000;
        if (typeof value === 'object') return true;
        return true;
      })
      .withMessage((value, { req }) => req.t('validation.descriptionTooLong')),
    body('email').optional().trim().isEmail().withMessage((value, { req }) => req.t('validation.invalidEmail')),
    body('telephone').optional().trim().matches(/^[0-9+\-\s()]+$/),
    body('site_web').optional().trim().isURL(),
    body('photo_url').optional().trim().isURL(),
    body('wilaya_id').optional().isInt({ min: 1 }),
    body('disponible').optional().isBoolean()
  ];

  // Créer un intervenant
  router.post('/',
    authMiddleware.authenticate,
    requireAdminOrProfessional,
    createIntervenantValidation,
    validationMiddleware.handleValidationErrors,
    (req, res) => intervenantController.createIntervenant(req, res)
  );

  // Mettre à jour un intervenant
  router.put('/:id',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('id'),
    [
      body('nom').optional().custom((value) => {
        if (typeof value === 'string') return value.trim().length > 0 && value.trim().length <= 100;
        if (typeof value === 'object') return true;
        return false;
      }),
      body('prenom').optional().custom((value) => {
        if (typeof value === 'string') return value.trim().length > 0 && value.trim().length <= 100;
        if (typeof value === 'object') return true;
        return false;
      }),
      body('biographie').optional().custom((value) => {
        if (typeof value === 'string') return value.length <= 2000;
        if (typeof value === 'object') return true;
        return true;
      }),
      body('email').optional().trim().isEmail(),
      body('telephone').optional().trim().matches(/^[0-9+\-\s()]+$/),
      body('site_web').optional().trim().isURL(),
      body('wilaya_id').optional().isInt({ min: 1 }),
      body('disponible').optional().isBoolean()
    ],
    validationMiddleware.handleValidationErrors,
    (req, res) => intervenantController.updateIntervenant(req, res)
  );

  // Supprimer un intervenant (Admin seulement)
  router.delete('/:id',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    validationMiddleware.validateId('id'),
    (req, res) => intervenantController.deleteIntervenant(req, res)
  );

  return router;
};

module.exports = initIntervenantRoutes;
