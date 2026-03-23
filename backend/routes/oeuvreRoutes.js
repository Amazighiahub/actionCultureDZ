/**
 * Routes pour les œuvres
 * Utilise le nouveau pattern Controller → Service → Repository
 */

const express = require('express');
const { param, body } = require('express-validator');
const oeuvreController = require('../controllers/oeuvreController');
const { handleValidationErrors, validateId, validatePagination, validateWorkSubmission, validateStringLengths } = require('../middlewares/validationMiddleware');
const { createContentLimiter } = require('../middlewares/rateLimitMiddleware');
const asyncHandler = require('../utils/asyncHandler');

const initOeuvreRoutes = (models, authMiddleware) => {
  const router = express.Router();
  const { authenticate, requireRole, requireVerifiedEmail } = authMiddleware;

  // Cache HTTP pour les listes publiques (données changent toutes les ~3 min)
  const cachePublic = (req, res, next) => {
    res.set('Cache-Control', 'public, max-age=180, stale-while-revalidate=30');
    next();
  };

  // ============================================================================
  // ROUTES PUBLIQUES
  // ============================================================================

  router.get('/', cachePublic, asyncHandler((req, res) => oeuvreController.list(req, res)));
  router.get('/recent', cachePublic, asyncHandler((req, res) => oeuvreController.getRecent(req, res)));
  router.get('/popular', cachePublic, asyncHandler((req, res) => oeuvreController.getPopular(req, res)));
  router.get('/statistics', cachePublic, asyncHandler((req, res) => oeuvreController.getStatistics(req, res)));
  router.get('/search', cachePublic, asyncHandler((req, res) => oeuvreController.search(req, res)));
  router.get('/search/intervenants', cachePublic, asyncHandler((req, res) => oeuvreController.searchIntervenants(req, res)));

  // ============================================================================
  // ROUTES AUTHENTIFIÉES (specific paths BEFORE :id catch-all)
  // ============================================================================

  router.get('/my/list', authenticate, asyncHandler((req, res) => oeuvreController.getMyOeuvres(req, res)));
  router.get('/my/statistics', authenticate, asyncHandler((req, res) => oeuvreController.getMyStatistics(req, res)));

  // ============================================================================
  // ROUTES ADMIN (specific paths BEFORE :id catch-all)
  // ============================================================================

  router.get('/admin/all', authenticate, requireRole(['Admin', 'Moderateur']), asyncHandler((req, res) => oeuvreController.listAll(req, res)));
  router.get('/admin/pending', authenticate, requireRole(['Admin', 'Moderateur']), asyncHandler((req, res) => oeuvreController.getPending(req, res)));
  router.get('/admin/rejected', authenticate, requireRole(['Admin', 'Moderateur']), asyncHandler((req, res) => oeuvreController.getRejected(req, res)));
  router.get('/admin/stats', authenticate, requireRole(['Admin']), asyncHandler((req, res) => oeuvreController.getStats(req, res)));

  // ============================================================================
  // ROUTES AVEC :id (après les routes spécifiques)
  // ============================================================================

  router.get('/:id', validateId(), asyncHandler((req, res) => oeuvreController.getById(req, res)));
  router.get('/:id/similar', validateId(), asyncHandler((req, res) => oeuvreController.getSimilar(req, res)));
  router.get('/:id/medias', validateId(), asyncHandler((req, res) => oeuvreController.getMedias(req, res)));

  router.post('/', authenticate, requireVerifiedEmail,
    createContentLimiter,
    validateStringLengths,
    [body('titre').notEmpty().withMessage('Le titre est requis')],
    handleValidationErrors,
    validateWorkSubmission,
    asyncHandler((req, res) => oeuvreController.create(req, res)));
  router.put('/:id', authenticate, requireVerifiedEmail, validateId(),
    validateStringLengths,
    validateWorkSubmission,
    asyncHandler((req, res) => oeuvreController.update(req, res)));
  router.delete('/:id', authenticate, requireVerifiedEmail, validateId(), asyncHandler((req, res) => oeuvreController.delete(req, res)));
  router.post('/:id/submit', authenticate, requireVerifiedEmail, validateId(), asyncHandler((req, res) => oeuvreController.submit(req, res)));

  // Médias
  router.post('/:id/medias/upload', authenticate, requireVerifiedEmail, validateId(), asyncHandler((req, res) => oeuvreController.uploadMedia(req, res)));
  router.put('/:id/medias/reorder', authenticate, requireVerifiedEmail, validateId(), asyncHandler((req, res) => oeuvreController.reorderMedias(req, res)));
  router.delete('/:id/medias/:mediaId', authenticate, requireVerifiedEmail, validateId(), validateId('mediaId'), asyncHandler((req, res) => oeuvreController.deleteMedia(req, res)));

  // Admin actions sur :id
  router.post('/:id/validate', authenticate, requireRole(['Admin', 'Moderateur']), validateId(), asyncHandler((req, res) => oeuvreController.validate(req, res)));
  router.post('/:id/reject', authenticate, requireRole(['Admin', 'Moderateur']), validateId(), asyncHandler((req, res) => oeuvreController.reject(req, res)));
  router.post('/:id/feature', authenticate, requireRole(['Admin']), validateId(), asyncHandler((req, res) => oeuvreController.setFeatured(req, res)));

  // Traductions (admin i18n)
  router.get('/:id/translations', authenticate, requireRole(['Admin']), asyncHandler((req, res) => oeuvreController.getTranslations(req, res)));
  router.patch('/:id/translation/:lang', authenticate, requireRole(['Admin']), asyncHandler((req, res) => oeuvreController.updateTranslation(req, res)));

  return router;
};

module.exports = initOeuvreRoutes;
