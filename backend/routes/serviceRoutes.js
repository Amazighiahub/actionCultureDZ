/**
 * Routes v2 pour les services culturels
 * Utilise le pattern Controller → Service → Repository
 */

const express = require('express');
const { param, body } = require('express-validator');
const serviceController = require('../controllers/serviceController');
const { handleValidationErrors, validateId } = require('../middlewares/validationMiddleware');
const asyncHandler = require('../utils/asyncHandler');

const initServiceRoutesV2 = (models, authMiddleware) => {
  const router = express.Router();
  const { authenticate, requireRole } = authMiddleware;

  // ============================================================================
  // ROUTES PUBLIQUES
  // ============================================================================

  router.get('/', asyncHandler((req, res) => serviceController.list(req, res)));
  router.get('/search', asyncHandler((req, res) => serviceController.search(req, res)));
  router.get('/lieu/:lieuId', asyncHandler((req, res) => serviceController.getByLieu(req, res)));

  // ============================================================================
  // ROUTES AUTHENTIFIÉES (specific paths BEFORE :id catch-all)
  // ============================================================================

  router.get('/my/list', authenticate, asyncHandler((req, res) => serviceController.getMyServices(req, res)));

  // ============================================================================
  // ROUTES ADMIN (specific paths BEFORE :id catch-all)
  // ============================================================================

  router.get('/admin/pending', authenticate, requireRole(['Admin', 'Moderateur']), asyncHandler((req, res) => serviceController.getPending(req, res)));
  router.get('/admin/stats', authenticate, requireRole(['Admin']), asyncHandler((req, res) => serviceController.getStats(req, res)));

  // ============================================================================
  // ROUTES AVEC :id (après les routes spécifiques)
  // ============================================================================

  router.get('/:id', validateId(), asyncHandler((req, res) => serviceController.getById(req, res)));
  router.post('/', authenticate,
    [body('nom').notEmpty().withMessage('Le nom du service est requis')],
    handleValidationErrors,
    asyncHandler((req, res) => serviceController.create(req, res)));
  router.put('/:id', authenticate, validateId(), asyncHandler((req, res) => serviceController.update(req, res)));
  router.delete('/:id', authenticate, validateId(), asyncHandler((req, res) => serviceController.delete(req, res)));

  // Admin actions sur :id
  router.post('/:id/validate', authenticate, requireRole(['Admin', 'Moderateur']), validateId(), asyncHandler((req, res) => serviceController.validate(req, res)));
  router.post('/:id/reject', authenticate, requireRole(['Admin', 'Moderateur']), validateId(), asyncHandler((req, res) => serviceController.reject(req, res)));

  return router;
};

module.exports = initServiceRoutesV2;
