/**
 * Routes pour l'artisanat
 * Utilise le pattern Controller → Service → Repository
 */

const express = require('express');
const { publicHttpCache } = require('../middlewares/cacheMiddleware');
const { secureDiskUpload, avantEnvoi } = require('../middlewares/uploadSecurity');
const { MEDIA_MIMES, MAX_MEDIA_SIZE } = require('../constants/uploadMimes');
const { param, body } = require('express-validator');
const artisanatController = require('../controllers/artisanatController');
const { handleValidationErrors, validateId, validateStringLengths } = require('../middlewares/validationMiddleware');
const { createContentLimiter, mediasLimiter } = require('../middlewares/rateLimitMiddleware');
const limiteEnvois = [mediasLimiter];
const asyncHandler = require('../utils/asyncHandler');
const { msg } = require('../utils/messageValidation');

const initArtisanatRoutes = (models, authMiddleware) => {
  const router = express.Router();
  const { authenticate, optionalAuth, requireRole, requireVerifiedEmail } = authMiddleware;

  // ============================================================================
  // ROUTES PUBLIQUES
  // ============================================================================

  // Cache HTTP des listes publiques (~3 min)
  const cachePublic = publicHttpCache(180);

  router.get('/', cachePublic, asyncHandler((req, res) => artisanatController.list(req, res)));
  router.get('/search', cachePublic, asyncHandler((req, res) => artisanatController.search(req, res)));
  router.get('/statistics', cachePublic, asyncHandler((req, res) => artisanatController.getStatistics(req, res)));
  router.get('/region/:wilayaId/artisans', asyncHandler((req, res) => artisanatController.getArtisansByRegion(req, res)));

  // ============================================================================
  // ROUTES AUTHENTIFIÉES (specific paths BEFORE :id catch-all)
  // ============================================================================

  router.get('/my/list', authenticate, asyncHandler((req, res) => artisanatController.getMyArtisanats(req, res)));

  // ============================================================================
  // ROUTES ADMIN (specific paths BEFORE :id catch-all)
  // ============================================================================

  router.get('/admin/stats', authenticate, requireRole(['Admin']), asyncHandler((req, res) => artisanatController.getStats(req, res)));

  // ============================================================================
  // ROUTES AVEC :id (après les routes spécifiques)
  // ============================================================================

  // optionalAuth : l'auteur d'un produit non publié peut voir sa propre fiche
  router.get('/:id', optionalAuth, validateId(), asyncHandler((req, res) => artisanatController.getById(req, res)));
  router.post('/', authenticate, requireVerifiedEmail,
    createContentLimiter,
    validateStringLengths,
    [
      body('nom').notEmpty().withMessage(msg('validation.nomRequis')),
      body('id_materiau').isInt({ min: 1 }).withMessage(msg('validation.materiauRequis')),
      body('id_technique').isInt({ min: 1 }).withMessage(msg('validation.techniqueRequise')),
      body('prix_min').optional().isFloat({ min: 0 }).withMessage(msg('validation.prixMinPositif')),
      body('prix_max').optional().isFloat({ min: 0 }).withMessage(msg('validation.prixMaxPositif'))
        .custom((val, { req }) => {
          if (req.body.prix_min && parseFloat(val) < parseFloat(req.body.prix_min)) {
            throw new Error('Le prix maximum doit être supérieur au prix minimum');
          }
          return true;
        }),
    ],
    handleValidationErrors,
    asyncHandler((req, res) => artisanatController.create(req, res)));
  router.put('/:id', authenticate, requireVerifiedEmail,
    validateId(),
    validateStringLengths,
    asyncHandler((req, res) => artisanatController.update(req, res)));
  router.delete('/:id', authenticate, requireVerifiedEmail,
    validateId(),
    asyncHandler((req, res) => artisanatController.delete(req, res)));
  router.post('/:id/medias', authenticate, requireVerifiedEmail,
    validateId(),
    ...limiteEnvois,
    // L'artisan (ou la modération) seulement, vérifié avant de recevoir le fichier
    avantEnvoi((req) => require('../services/serviceContainer').artisanatService.verifierProprietaire(
      parseInt(req.params.id, 10), req.user.id_user, !!req.user.isAdmin)),
    ...secureDiskUpload({ field: 'medias', mimes: MEDIA_MIMES, maxFileSize: MAX_MEDIA_SIZE, maxFiles: 10 }),
    asyncHandler((req, res) => artisanatController.uploadMedias(req, res)));

  return router;
};

module.exports = initArtisanatRoutes;
