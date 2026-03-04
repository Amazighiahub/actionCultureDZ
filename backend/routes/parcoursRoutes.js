/**
 * Routes v2 pour les parcours intelligents
 * Utilise le pattern Controller → Service → Repository
 */

const express = require('express');
const parcoursController = require('../controllers/parcoursController');

const initParcoursRoutesV2 = (models, authMiddleware) => {
  const router = express.Router();
  const { authenticate, requireRole } = authMiddleware;

  // ============================================================================
  // ROUTES PUBLIQUES
  // ============================================================================

  router.get('/', (req, res) => parcoursController.list(req, res));
  router.get('/search', (req, res) => parcoursController.search(req, res));
  router.post('/personnalise', (req, res) => parcoursController.personnalise(req, res));
  router.get('/:id', (req, res) => parcoursController.getById(req, res));
  router.get('/:id/map', (req, res) => parcoursController.getMap(req, res));

  // ============================================================================
  // ROUTES AUTHENTIFIÉES
  // ============================================================================

  router.get('/my/list', authenticate, (req, res) => parcoursController.getMyParcours(req, res));
  router.post('/', authenticate, (req, res) => parcoursController.create(req, res));
  router.put('/:id', authenticate, (req, res) => parcoursController.update(req, res));
  router.delete('/:id', authenticate, (req, res) => parcoursController.delete(req, res));

  // Gestion des étapes
  router.post('/:id/etapes', authenticate, (req, res) => parcoursController.addEtape(req, res));
  router.delete('/:id/etapes/:etapeId', authenticate, (req, res) => parcoursController.removeEtape(req, res));
  router.put('/:id/etapes/reorder', authenticate, (req, res) => parcoursController.reorderEtapes(req, res));

  // ============================================================================
  // ROUTES ADMIN
  // ============================================================================

  router.get('/admin/all', authenticate, requireRole(['Admin', 'Moderateur']), (req, res) => parcoursController.listAll(req, res));
  router.get('/admin/stats', authenticate, requireRole(['Admin']), (req, res) => parcoursController.getStats(req, res));
  router.post('/:id/activate', authenticate, requireRole(['Admin', 'Moderateur']), (req, res) => parcoursController.activate(req, res));
  router.post('/:id/deactivate', authenticate, requireRole(['Admin', 'Moderateur']), (req, res) => parcoursController.deactivate(req, res));

  return router;
};

module.exports = initParcoursRoutesV2;
