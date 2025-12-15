// routes/oeuvreRoutes.js - VERSION i18n
const express = require('express');
const router = express.Router();
const OeuvreController = require('../controllers/OeuvreController');
const { body, param } = require('express-validator');
const uploadService = require('../services/uploadService');

// ⚡ Import du middleware de validation de langue
const { validateLanguage } = require('../middlewares/language');

const initOeuvreRoutes = (models, authMiddleware) => {
  const oeuvreController = new OeuvreController(models);

  // ========================================================================
  // MIDDLEWARES SIMPLIFIÉS
  // ========================================================================

  const validatePagination = (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    if (page < 1) req.query.page = 1;
    if (limit < 1 || limit > 100) req.query.limit = 10;
    
    next();
  };

  const validateId = (paramName) => {
    return (req, res, next) => {
      const id = req.params[paramName];
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: `${paramName} invalide`
        });
      }
      next();
    };
  };

  const handleValidationErrors = (req, res, next) => {
    const errors = require('express-validator').validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  };

  // Configuration upload avec gestion d'erreur
  let multerConfig;
  try {
    multerConfig = uploadService.uploadMedia();
  } catch (e) {
    console.warn('⚠️ uploadService non disponible, utilisation de multer basique');
    const multer = require('multer');
    const path = require('path');
    const fs = require('fs');
    
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', 'uploads', 'oeuvres');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `oeuvre-${uniqueSuffix}${path.extname(file.originalname)}`);
      }
    });

    multerConfig = multer({
      storage,
      limits: { fileSize: 50 * 1024 * 1024 }
    });
  }

  const handleMulterUpload = (fieldName = 'medias', maxCount = 10) => {
    return (req, res, next) => {
      const upload = multerConfig.array(fieldName, maxCount);
      upload(req, res, (err) => {
        if (err) {
          console.error('Erreur upload:', err);
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
              success: false, 
              error: 'Fichier trop volumineux (limite: 50MB)' 
            });
          }
          return res.status(400).json({ 
            success: false, 
            error: err.message || 'Erreur lors de l\'upload' 
          });
        }
        next();
      });
    };
  };

  const parseFormData = (req, res, next) => {
    const jsonFields = [
      'categories', 'tags', 'editeurs', 
      'utilisateurs_inscrits', 'intervenants_non_inscrits', 
      'nouveaux_intervenants', 'details_specifiques', 'medias'
    ];
    
    jsonFields.forEach(field => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        try {
          req.body[field] = JSON.parse(req.body[field]);
        } catch (e) {
          console.error(`Erreur parsing ${field}:`, e);
        }
      }
    });
    
    next();
  };

  // ========================================================================
  // RÈGLES DE VALIDATION
  // ========================================================================

  // ⚡ Validation acceptant string OU JSON pour les champs multilingues
  const createOeuvreValidation = [
    body('titre')
      .custom((value) => {
        if (typeof value === 'string') {
          return value.trim().length >= 1 && value.trim().length <= 255;
        }
        if (typeof value === 'object') {
          return Object.values(value).some(v => v && v.length >= 1);
        }
        return false;
      })
      .withMessage('Le titre est obligatoire (max 255 caractères)'),
    body('id_type_oeuvre')
      .isInt()
      .withMessage('Type d\'œuvre invalide'),
    body('id_langue')
      .isInt()
      .withMessage('Langue invalide'),
    body('annee_creation')
      .optional()
      .isInt({ min: -3000, max: new Date().getFullYear() })
      .withMessage('Année de création invalide'),
    body('description')
      .optional()
      .custom((value) => {
        if (typeof value === 'string') return value.length <= 5000;
        if (typeof value === 'object') return true;
        return true;
      })
      .withMessage('Description trop longue (max 5000 caractères)')
  ];

  const updateOeuvreValidation = [
    body('titre')
      .optional()
      .custom((value) => {
        if (typeof value === 'string') {
          return value.trim().length >= 1 && value.trim().length <= 255;
        }
        if (typeof value === 'object') return true;
        return false;
      })
      .withMessage('Le titre doit contenir entre 1 et 255 caractères'),
    body('description')
      .optional()
      .custom((value) => {
        if (typeof value === 'string') return value.length <= 5000;
        if (typeof value === 'object') return true;
        return true;
      })
      .withMessage('Description trop longue (max 5000 caractères)')
  ];

  const validateOeuvreValidation = [
    body('statut')
      .isIn(['publie', 'rejete'])
      .withMessage('Statut invalide'),
    body('raison_rejet')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Raison de rejet trop longue')
  ];

  // ========================================================================
  // VÉRIFICATION DES MIDDLEWARES D'AUTH
  // ========================================================================

  const safeAuth = {
    authenticate: authMiddleware?.authenticate || ((req, res, next) => {
      console.warn('⚠️ authMiddleware.authenticate non disponible');
      req.user = { id_user: 1 };
      next();
    }),
    
    requireValidatedProfessional: authMiddleware?.requireValidatedProfessional || ((req, res, next) => {
      next();
    }),
    
    requireAdmin: authMiddleware?.requireAdmin || ((req, res, next) => {
      next();
    }),
    
    requireOwnership: authMiddleware?.requireOwnership || (() => (req, res, next) => {
      next();
    })
  };

  // ========================================================================
  // ROUTES PUBLIQUES
  // ========================================================================

  router.get('/', 
    validatePagination,
    (req, res) => oeuvreController.getAllOeuvres(req, res)
  );

  router.get('/recent', 
    (req, res) => {
      req.query.limit = req.query.limit || 6;
      req.query.sort = 'recent';
      return oeuvreController.getAllOeuvres(req, res);
    }
  );

  router.get('/popular',
    (req, res) => {
      req.query.limit = req.query.limit || 6;
      req.query.sort = 'rating';
      return oeuvreController.getAllOeuvres(req, res);
    }
  );

  router.get('/statistics', 
    (req, res) => oeuvreController.getStatistics(req, res)
  );

  router.get('/search', 
    (req, res) => oeuvreController.searchOeuvres(req, res)
  );

  // ========================================================================
  // ⚡ ROUTES DE TRADUCTION (ADMIN)
  // ========================================================================

  // Récupérer toutes les traductions d'une œuvre
  router.get('/:id/translations',
    safeAuth.authenticate,
    safeAuth.requireAdmin,
    validateId('id'),
    (req, res) => oeuvreController.getOeuvreTranslations(req, res)
  );

  // Mettre à jour une traduction spécifique
  router.patch('/:id/translation/:lang',
    safeAuth.authenticate,
    safeAuth.requireAdmin,
    validateId('id'),
    validateLanguage,
    [
      body('titre').optional().isString().isLength({ max: 255 }),
      body('description').optional().isString().isLength({ max: 5000 })
    ],
    handleValidationErrors,
    (req, res) => oeuvreController.updateOeuvreTranslation(req, res)
  );

  // ========================================================================
  // ROUTES AVEC :id (après les routes spécifiques)
  // ========================================================================

  router.get('/:id',
    validateId('id'),
    (req, res) => oeuvreController.getOeuvreById(req, res)
  );

  router.get('/:id/share-links',
    validateId('id'),
    (req, res) => oeuvreController.getShareLinks(req, res)
  );

  router.get('/:id/medias',
    validateId('id'),
    (req, res) => oeuvreController.getMedias(req, res)
  );

  // ========================================================================
  // ROUTES AUTHENTIFIÉES
  // ========================================================================

  router.get('/user/my-works',
    safeAuth.authenticate,
    validatePagination,
    (req, res) => oeuvreController.getMyWorks(req, res)
  );

  router.get('/user/my-statistics',
    safeAuth.authenticate,
    async (req, res) => {
      try {
        const userId = req.user.id_user;
        const sequelize = models.sequelize || Object.values(models)[0]?.sequelize;

        const [totalOeuvres, parStatut] = await Promise.all([
          models.Oeuvre.count({ where: { saisi_par: userId } }),
          models.Oeuvre.findAll({
            where: { saisi_par: userId },
            attributes: [
              'statut',
              [sequelize.fn('COUNT', '*'), 'count']
            ],
            group: ['statut'],
            raw: true
          })
        ]);

        res.json({
          success: true,
          data: {
            total: totalOeuvres,
            parStatut: parStatut.reduce((acc, item) => {
              acc[item.statut] = parseInt(item.count);
              return acc;
            }, {
              brouillon: 0,
              publie: 0,
              rejete: 0
            })
          }
        });
      } catch (error) {
        console.error('Erreur statistiques utilisateur:', error);
        res.status(500).json({ 
          success: false, 
          error: 'Erreur serveur' 
        });
      }
    }
  );

  router.post('/', 
    safeAuth.authenticate,
    safeAuth.requireValidatedProfessional,
    handleMulterUpload('medias', 10),
    parseFormData,
    createOeuvreValidation,
    handleValidationErrors,
    (req, res) => oeuvreController.createOeuvre(req, res)
  );

  router.put('/:id',
    safeAuth.authenticate,
    safeAuth.requireValidatedProfessional,
    safeAuth.requireOwnership('Oeuvre', 'id', 'saisi_par'),
    validateId('id'),
    updateOeuvreValidation,
    handleValidationErrors,
    (req, res) => oeuvreController.updateOeuvre(req, res)
  );

  router.delete('/:id', 
    safeAuth.authenticate,
    safeAuth.requireValidatedProfessional,
    safeAuth.requireOwnership('Oeuvre', 'id', 'saisi_par'),
    validateId('id'),
    (req, res) => oeuvreController.deleteOeuvre(req, res)
  );

  // ========================================================================
  // GESTION DES MÉDIAS
  // ========================================================================

  router.post('/:id/medias/upload',
    safeAuth.authenticate,
    safeAuth.requireValidatedProfessional,
    safeAuth.requireOwnership('Oeuvre', 'id', 'saisi_par'),
    validateId('id'),
    handleMulterUpload('files', 10),
    (req, res) => oeuvreController.uploadMedia(req, res)
  );

  router.put('/:id/medias/reorder',
    safeAuth.authenticate,
    safeAuth.requireValidatedProfessional,
    safeAuth.requireOwnership('Oeuvre', 'id', 'saisi_par'),
    validateId('id'),
    body('mediaIds').isArray().withMessage('mediaIds doit être un tableau'),
    handleValidationErrors,
    (req, res) => oeuvreController.reorderMedias(req, res)
  );

  router.delete('/:id/medias/:mediaId',
    safeAuth.authenticate,
    safeAuth.requireValidatedProfessional,
    safeAuth.requireOwnership('Oeuvre', 'id', 'saisi_par'),
    validateId('id'),
    validateId('mediaId'),
    (req, res) => oeuvreController.deleteMedia(req, res)
  );

  // ========================================================================
  // ROUTES ADMIN
  // ========================================================================

  router.patch('/:id/validate', 
    safeAuth.authenticate,
    safeAuth.requireAdmin,
    validateId('id'),
    validateOeuvreValidation,
    handleValidationErrors,
    (req, res) => oeuvreController.validateOeuvre(req, res)
  );

  router.get('/admin/pending',
    safeAuth.authenticate,
    safeAuth.requireAdmin,
    (req, res) => {
      req.query.statut = 'brouillon';
      return oeuvreController.getAllOeuvres(req, res);
    }
  );

  router.get('/admin/rejected',
    safeAuth.authenticate,
    safeAuth.requireAdmin,
    (req, res) => {
      req.query.statut = 'rejete';
      return oeuvreController.getAllOeuvres(req, res);
    }
  );

  // ========================================================================
  // ROUTES UTILITAIRES
  // ========================================================================

  router.get('/search/intervenants',
    safeAuth.authenticate,
    (req, res) => oeuvreController.searchIntervenants(req, res)
  );

  router.post('/check-email',
    safeAuth.authenticate,
    body('email').isEmail().normalizeEmail(),
    handleValidationErrors,
    (req, res) => oeuvreController.checkEmail(req, res)
  );

  router.get('/test/ping', (req, res) => {
    res.json({
      success: true,
      message: 'Module œuvres i18n opérationnel',
      timestamp: new Date().toISOString()
    });
  });

  console.log('✅ Routes œuvres i18n initialisées');
  console.log('  🌍 Routes traduction: GET /:id/translations, PATCH /:id/translation/:lang');
  
  return router;
};

module.exports = initOeuvreRoutes;
