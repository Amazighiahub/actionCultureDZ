// routes/articleBlockRoutes.js
const express = require('express');
const router = express.Router();
const ArticleBlockController = require('../controllers/articleBlockController');
const { body } = require('express-validator');

const initArticleBlockRoutes = (models, authMiddleware) => {
  const articleBlockController = ArticleBlockController;

  // ========================================================================
  // MIDDLEWARES
  // ========================================================================

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

  // Configuration upload
  let multerConfig;
  try {
    multerConfig = ArticleBlockController.getMulterConfig();
  } catch (e) {
    console.warn('⚠️ Configuration multer par défaut');
    const multer = require('multer');
    multerConfig = multer({ dest: 'uploads/articles/' });
  }

  // Gestionnaire d'upload
  const handleImageUpload = (req, res, next) => {
    const upload = multerConfig.single('image');
    upload(req, res, (err) => {
      if (err) {
        console.error('Erreur upload:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ 
            success: false, 
            error: req.t ? req.t('upload.fileTooLarge') : 'File too large (limit: 10MB)' 
          });
        }
        return res.status(400).json({ 
          success: false, 
          error: req.t ? req.t('common.serverError') : 'Upload error' 
        });
      }
      next();
    });
  };

  // Créer des wrappers sûrs pour l'authentification (fail-closed)
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

  const safeAuth = {
    authenticate: requireMiddleware('auth.authenticate', authMiddleware?.authenticate),
    requireValidatedProfessional: requireMiddleware('auth.requireValidatedProfessional', authMiddleware?.requireValidatedProfessional)
  };

  // ========================================================================
  // RÈGLES DE VALIDATION
  // ========================================================================

  const createBlockValidation = [
    body('id_article')
      .isInt()
      .withMessage((value, { req }) => req.t('validation.invalidId')),
    body('type_block')
      .isIn(['text', 'heading', 'image', 'video', 'citation', 'code', 'list', 'table', 'separator', 'embed'])
      .withMessage((value, { req }) => req.t('validation.invalidType')),
    body('article_type')
      .optional()
      .isIn(['article', 'article_scientifique'])
      .withMessage((value, { req }) => req.t('validation.invalidType')),
    body('contenu')
      .optional()
      .isLength({ max: 10000 })
      .withMessage((value, { req }) => req.t('validation.descriptionTooLong'))
  ];

  const updateBlockValidation = [
    body('type_block')
      .optional()
      .isIn(['text', 'heading', 'image', 'video', 'citation', 'code', 'list', 'table', 'separator', 'embed'])
      .withMessage((value, { req }) => req.t('validation.invalidType')),
    body('contenu')
      .optional()
      .isLength({ max: 10000 })
      .withMessage((value, { req }) => req.t('validation.descriptionTooLong'))
  ];

  const reorderValidation = [
    body('blockIds')
      .isArray()
      .withMessage((value, { req }) => req.t('validation.invalidData')),
    body('blockIds.*')
      .isInt()
      .withMessage((value, { req }) => req.t('validation.invalidId'))
  ];

  const createMultipleValidation = [
    body('id_article')
      .isInt()
      .withMessage((value, { req }) => req.t('validation.invalidId')),
    body('blocks')
      .isArray()
      .withMessage((value, { req }) => req.t('validation.invalidData')),
    body('blocks.*.type_block')
      .isIn(['text', 'heading', 'image', 'video', 'citation', 'code', 'list', 'table', 'separator', 'embed'])
      .withMessage((value, { req }) => req.t('validation.invalidType'))
  ];

  // ========================================================================
  // ROUTES PUBLIQUES
  // ========================================================================

  // Récupérer les templates de blocs
  router.get('/templates',
    (req, res) => articleBlockController.getBlockTemplates(req, res)
  );

  // Récupérer les blocs d'un article
  router.get('/article/:articleId/:articleType?',
    validateId('articleId'),
    (req, res) => articleBlockController.getBlocksByArticle(req, res)
  );

  // ========================================================================
  // ROUTES AUTHENTIFIÉES
  // ========================================================================

  // Créer un bloc
  router.post('/',
    safeAuth.authenticate,
    safeAuth.requireValidatedProfessional,
    createBlockValidation,
    handleValidationErrors,
    (req, res) => articleBlockController.createBlock(req, res)
  );

  // Créer plusieurs blocs (remplacer tout le contenu)
  router.post('/batch',
    safeAuth.authenticate,
    safeAuth.requireValidatedProfessional,
    createMultipleValidation,
    handleValidationErrors,
    (req, res) => articleBlockController.createMultipleBlocks(req, res)
  );

  // Mettre à jour un bloc
  router.put('/:blockId',
    safeAuth.authenticate,
    safeAuth.requireValidatedProfessional,
    validateId('blockId'),
    updateBlockValidation,
    handleValidationErrors,
    (req, res) => articleBlockController.updateBlock(req, res)
  );

  // Supprimer un bloc
  router.delete('/:blockId',
    safeAuth.authenticate,
    safeAuth.requireValidatedProfessional,
    validateId('blockId'),
    (req, res) => articleBlockController.deleteBlock(req, res)
  );

  // Réorganiser les blocs
  router.put('/article/:articleId/reorder',
    safeAuth.authenticate,
    safeAuth.requireValidatedProfessional,
    validateId('articleId'),
    reorderValidation,
    handleValidationErrors,
    (req, res) => articleBlockController.reorderBlocks(req, res)
  );

  // Dupliquer un bloc
  router.post('/:blockId/duplicate',
    safeAuth.authenticate,
    safeAuth.requireValidatedProfessional,
    validateId('blockId'),
    (req, res) => articleBlockController.duplicateBlock(req, res)
  );

  // Upload d'image pour un bloc
  router.post('/article/:articleId/upload-image',
    safeAuth.authenticate,
    safeAuth.requireValidatedProfessional,
    validateId('articleId'),
    handleImageUpload,
    (req, res) => articleBlockController.uploadBlockImage(req, res)
  );

  // ========================================================================
  // ROUTE DE TEST
  // ========================================================================

  router.get('/test/ping', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).end();
    }
    res.json({
      success: true,
      message: 'Module article blocks operational',
      timestamp: new Date().toISOString()
    });
  });

  
  return router;
};

module.exports = initArticleBlockRoutes;