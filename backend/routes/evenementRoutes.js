/**
 * Routes v2 pour les événements
 * Utilise le pattern Controller → Service → Repository
 */

const express = require('express');
const { param, body } = require('express-validator');
const evenementController = require('../controllers/evenementController');
const { handleValidationErrors, validateId, validatePagination } = require('../middlewares/validationMiddleware');
const asyncHandler = require('../utils/asyncHandler');

const initEvenementRoutesV2 = (models, authMiddleware) => {
  const router = express.Router();
  const { authenticate, requireRole } = authMiddleware;

  // Cache HTTP pour les listes publiques (données changent toutes les ~2 min)
  const cachePublic = (req, res, next) => {
    res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=30');
    next();
  };

  // ============================================================================
  // ROUTES PUBLIQUES (specific paths BEFORE :id catch-all)
  // ============================================================================

  router.get('/', cachePublic, asyncHandler((req, res) => evenementController.list(req, res)));
  router.get('/upcoming', cachePublic, asyncHandler((req, res) => {
    req.query.upcoming = 'true';
    evenementController.list(req, res);
  }));
  router.get('/statistics', cachePublic, asyncHandler((req, res) => evenementController.getStats(req, res)));
  router.get('/search', cachePublic, asyncHandler((req, res) => evenementController.search(req, res)));
  router.get('/wilaya/:wilayaId', cachePublic, asyncHandler((req, res) => evenementController.getByWilaya(req, res)));
  router.get('/oeuvre/:oeuvreId', cachePublic, asyncHandler((req, res) => evenementController.getByOeuvre(req, res)));

  // ============================================================================
  // ROUTES AUTHENTIFIÉES (specific paths BEFORE :id catch-all)
  // ============================================================================

  router.get('/my/list', authenticate, asyncHandler((req, res) => evenementController.getMyEvenements(req, res)));

  // ============================================================================
  // ROUTES ADMIN (specific paths BEFORE :id catch-all)
  // ============================================================================

  router.get('/admin/all', authenticate, requireRole(['Admin', 'Moderateur']), asyncHandler((req, res) => evenementController.listAll(req, res)));
  router.get('/admin/pending', authenticate, requireRole(['Admin', 'Moderateur']), asyncHandler((req, res) => evenementController.getPending(req, res)));
  router.get('/admin/stats', authenticate, requireRole(['Admin']), asyncHandler((req, res) => evenementController.getStats(req, res)));

  // ============================================================================
  // ROUTES AVEC :id
  // ============================================================================

  router.get('/:id/medias', asyncHandler((req, res) => evenementController.getMedias(req, res)));
  router.get('/:id/share-data', asyncHandler((req, res) => evenementController.getShareData(req, res)));
  router.get('/:id/participants', authenticate, asyncHandler((req, res) => evenementController.getParticipants(req, res)));
  router.get('/:id/professionnels/en-attente', authenticate, asyncHandler((req, res) => evenementController.getProfessionnelsEnAttente(req, res)));
  router.get('/:id/mes-oeuvres', authenticate, asyncHandler((req, res) => evenementController.getMesOeuvres(req, res)));
  router.get('/:id/mon-inscription', authenticate, asyncHandler((req, res) => evenementController.getMyRegistration(req, res)));
  router.get('/:id/export', authenticate, asyncHandler((req, res) => evenementController.exportEvent(req, res)));
  router.get('/:id', validateId(), asyncHandler((req, res) => evenementController.getById(req, res)));

  router.post('/', authenticate,
    [body('nom_evenement').optional(), body('nom').optional()],
    handleValidationErrors,
    asyncHandler((req, res) => evenementController.create(req, res)));
  router.put('/:id', authenticate, validateId(), asyncHandler((req, res) => evenementController.update(req, res)));
  router.delete('/:id', authenticate, validateId(), asyncHandler((req, res) => evenementController.delete(req, res)));

  // Inscription
  router.post('/:id/register', authenticate, validateId(), asyncHandler((req, res) => evenementController.register(req, res)));
  router.delete('/:id/register', authenticate, validateId(), asyncHandler((req, res) => evenementController.unregister(req, res)));

  // Oeuvres dans un événement
  router.post('/:id/oeuvres', authenticate, validateId(), asyncHandler((req, res) => evenementController.addOeuvre(req, res)));
  router.put('/:id/oeuvres/:oeuvreId', authenticate, validateId(), validateId('oeuvreId'), asyncHandler((req, res) => evenementController.updateOeuvre(req, res)));
  router.put('/:id/oeuvres/reorder', authenticate, validateId(), asyncHandler((req, res) => evenementController.reorderOeuvres(req, res)));
  router.delete('/:id/oeuvres/:oeuvreId', authenticate, validateId(), validateId('oeuvreId'), asyncHandler((req, res) => evenementController.removeOeuvre(req, res)));

  // Participants validation
  router.put('/:id/participants/:userId/validate', authenticate, validateId(), validateId('userId'), asyncHandler((req, res) => evenementController.validateParticipation(req, res)));

  // Cancel (owner or admin)
  router.post('/:id/cancel', authenticate, validateId(), asyncHandler((req, res) => evenementController.cancel(req, res)));

  // Publish (admin)
  router.post('/:id/publish', authenticate, requireRole(['Admin', 'Moderateur']), validateId(), asyncHandler((req, res) => evenementController.publish(req, res)));

  return router;
};

module.exports = initEvenementRoutesV2;
