/**
 * Routes pour l'artisanat
 * Utilise le pattern Controller → Service → Repository
 */

const express = require('express');
const { param, body } = require('express-validator');
const artisanatController = require('../controllers/artisanatController');
const { handleValidationErrors, validateId, validateStringLengths } = require('../middlewares/validationMiddleware');
const { createContentLimiter } = require('../middlewares/rateLimitMiddleware');
const uploadService = require('../services/uploadService');
const asyncHandler = require('../utils/asyncHandler');

const initArtisanatRoutes = (models, authMiddleware) => {
  const router = express.Router();
  const { authenticate, requireRole, requireVerifiedEmail } = authMiddleware;

  // ============================================================================
  // ROUTES PUBLIQUES
  // ============================================================================

  router.get('/', asyncHandler((req, res) => artisanatController.list(req, res)));
  router.get('/search', asyncHandler((req, res) => artisanatController.search(req, res)));
  router.get('/statistics', asyncHandler((req, res) => artisanatController.getStatistics(req, res)));
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

  router.get('/:id', validateId(), asyncHandler((req, res) => artisanatController.getById(req, res)));
  router.post('/', authenticate, requireVerifiedEmail,
    createContentLimiter,
    validateStringLengths,
    [
      body('nom').notEmpty().withMessage('Le nom est requis'),
      body('id_materiau').isInt({ min: 1 }).withMessage('Le matériau est requis'),
      body('id_technique').isInt({ min: 1 }).withMessage('La technique est requise'),
      body('prix_min').optional().isFloat({ min: 0 }).withMessage('Le prix minimum doit être positif'),
      body('prix_max').optional().isFloat({ min: 0 }).withMessage('Le prix maximum doit être positif')
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
    createContentLimiter,
    uploadService.uploadMedia().array('medias', 10),
    asyncHandler((req, res) => artisanatController.uploadMedias(req, res)));

  return router;
};

module.exports = initArtisanatRoutes;
