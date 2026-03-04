/**
 * Routes v2 pour les événements
 * Utilise le pattern Controller → Service → Repository
 */

const express = require('express');
const evenementController = require('../controllers/evenementController');

const initEvenementRoutesV2 = (models, authMiddleware) => {
  const router = express.Router();
  const { authenticate, requireRole } = authMiddleware;

  // ============================================================================
  // ROUTES PUBLIQUES (specific paths BEFORE :id catch-all)
  // ============================================================================

  router.get('/', (req, res) => evenementController.list(req, res));
  router.get('/upcoming', (req, res) => {
    req.query.upcoming = 'true';
    evenementController.list(req, res);
  });
  router.get('/statistics', (req, res) => evenementController.getStats(req, res));
  router.get('/search', (req, res) => evenementController.search(req, res));
  router.get('/wilaya/:wilayaId', (req, res) => evenementController.getByWilaya(req, res));
  router.get('/oeuvre/:oeuvreId', (req, res) => evenementController.getByOeuvre(req, res));

  // ============================================================================
  // ROUTES AUTHENTIFIÉES (specific paths BEFORE :id catch-all)
  // ============================================================================

  router.get('/my/list', authenticate, (req, res) => evenementController.getMyEvenements(req, res));

  // ============================================================================
  // ROUTES AVEC :id
  // ============================================================================

  router.get('/:id/medias', (req, res) => evenementController.getMedias(req, res));
  router.get('/:id/share-data', (req, res) => evenementController.getShareData(req, res));
  router.get('/:id/participants', authenticate, (req, res) => evenementController.getParticipants(req, res));
  router.get('/:id/professionnels/en-attente', authenticate, (req, res) => evenementController.getProfessionnelsEnAttente(req, res));
  router.get('/:id/mes-oeuvres', authenticate, (req, res) => evenementController.getMesOeuvres(req, res));
  router.get('/:id/mon-inscription', authenticate, (req, res) => evenementController.getMyRegistration(req, res));
  router.get('/:id/export', authenticate, (req, res) => evenementController.exportEvent(req, res));
  router.get('/:id', (req, res) => evenementController.getById(req, res));

  router.post('/', authenticate, (req, res) => evenementController.create(req, res));
  router.put('/:id', authenticate, (req, res) => evenementController.update(req, res));
  router.delete('/:id', authenticate, (req, res) => evenementController.delete(req, res));

  // Inscription
  router.post('/:id/register', authenticate, (req, res) => evenementController.register(req, res));
  router.delete('/:id/register', authenticate, (req, res) => evenementController.unregister(req, res));

  // Oeuvres dans un événement
  router.post('/:id/oeuvres', authenticate, (req, res) => evenementController.addOeuvre(req, res));
  router.put('/:id/oeuvres/:oeuvreId', authenticate, (req, res) => evenementController.updateOeuvre(req, res));
  router.put('/:id/oeuvres/reorder', authenticate, (req, res) => evenementController.reorderOeuvres(req, res));
  router.delete('/:id/oeuvres/:oeuvreId', authenticate, (req, res) => evenementController.removeOeuvre(req, res));

  // Participants validation
  router.put('/:id/participants/:userId/validate', authenticate, (req, res) => evenementController.validateParticipation(req, res));

  // Cancel (owner or admin)
  router.post('/:id/cancel', authenticate, (req, res) => evenementController.cancel(req, res));

  // ============================================================================
  // ROUTES ADMIN
  // ============================================================================

  router.get('/admin/all', authenticate, requireRole(['Admin', 'Moderateur']), (req, res) => evenementController.listAll(req, res));
  router.get('/admin/pending', authenticate, requireRole(['Admin', 'Moderateur']), (req, res) => evenementController.getPending(req, res));
  router.get('/admin/stats', authenticate, requireRole(['Admin']), (req, res) => evenementController.getStats(req, res));
  router.post('/:id/publish', authenticate, requireRole(['Admin', 'Moderateur']), (req, res) => evenementController.publish(req, res));

  return router;
};

module.exports = initEvenementRoutesV2;
