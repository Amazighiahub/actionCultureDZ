/**
 * Routes v2 pour les services culturels
 * Utilise le pattern Controller → Service → Repository
 */

const express = require('express');
const serviceController = require('../controllers/serviceController');

const initServiceRoutesV2 = (models, authMiddleware) => {
  const router = express.Router();
  const { authenticate, requireRole } = authMiddleware;

  // ============================================================================
  // ROUTES PUBLIQUES
  // ============================================================================

  router.get('/', (req, res) => serviceController.list(req, res));
  router.get('/search', (req, res) => serviceController.search(req, res));
  router.get('/lieu/:lieuId', (req, res) => serviceController.getByLieu(req, res));
  router.get('/:id', (req, res) => serviceController.getById(req, res));

  // ============================================================================
  // ROUTES AUTHENTIFIÉES
  // ============================================================================

  router.get('/my/list', authenticate, (req, res) => serviceController.getMyServices(req, res));
  router.post('/', authenticate, (req, res) => serviceController.create(req, res));
  router.put('/:id', authenticate, (req, res) => serviceController.update(req, res));
  router.delete('/:id', authenticate, (req, res) => serviceController.delete(req, res));

  // ============================================================================
  // ROUTES ADMIN
  // ============================================================================

  router.get('/admin/pending', authenticate, requireRole(['Admin', 'Moderateur']), (req, res) => serviceController.getPending(req, res));
  router.get('/admin/stats', authenticate, requireRole(['Admin']), (req, res) => serviceController.getStats(req, res));
  router.post('/:id/validate', authenticate, requireRole(['Admin', 'Moderateur']), (req, res) => serviceController.validate(req, res));
  router.post('/:id/reject', authenticate, requireRole(['Admin', 'Moderateur']), (req, res) => serviceController.reject(req, res));

  return router;
};

module.exports = initServiceRoutesV2;
