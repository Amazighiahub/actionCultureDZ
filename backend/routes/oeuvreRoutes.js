/**
 * Routes v2 pour les œuvres
 * Utilise le nouveau pattern Controller → Service → Repository
 */

const express = require('express');
const oeuvreController = require('../controllers/oeuvreController');

const initOeuvreRoutesV2 = (models, authMiddleware) => {
  const router = express.Router();
  const { authenticate, requireRole } = authMiddleware;

  // ============================================================================
  // ROUTES PUBLIQUES
  // ============================================================================

  router.get('/', (req, res) => oeuvreController.list(req, res));
  router.get('/recent', (req, res) => oeuvreController.getRecent(req, res));
  router.get('/popular', (req, res) => oeuvreController.getPopular(req, res));
  router.get('/statistics', (req, res) => oeuvreController.getStatistics(req, res));
  router.get('/search', (req, res) => oeuvreController.search(req, res));
  router.get('/search/intervenants', (req, res) => oeuvreController.searchIntervenants(req, res));
  router.get('/:id', (req, res) => oeuvreController.getById(req, res));
  router.get('/:id/similar', (req, res) => oeuvreController.getSimilar(req, res));
  router.get('/:id/share-links', (req, res) => oeuvreController.getShareLinks(req, res));
  router.get('/:id/medias', (req, res) => oeuvreController.getMedias(req, res));

  // ============================================================================
  // ROUTES AUTHENTIFIÉES (CRÉATEURS)
  // ============================================================================

  router.get('/my/list', authenticate, (req, res) => oeuvreController.getMyOeuvres(req, res));
  router.get('/my/statistics', authenticate, (req, res) => oeuvreController.getMyStatistics(req, res));
  router.post('/', authenticate, (req, res) => oeuvreController.create(req, res));
  router.put('/:id', authenticate, (req, res) => oeuvreController.update(req, res));
  router.delete('/:id', authenticate, (req, res) => oeuvreController.delete(req, res));
  router.post('/:id/submit', authenticate, (req, res) => oeuvreController.submit(req, res));

  // Médias
  router.post('/:id/medias/upload', authenticate, (req, res) => oeuvreController.uploadMedia(req, res));
  router.put('/:id/medias/reorder', authenticate, (req, res) => oeuvreController.reorderMedias(req, res));
  router.delete('/:id/medias/:mediaId', authenticate, (req, res) => oeuvreController.deleteMedia(req, res));

  // ============================================================================
  // ROUTES ADMIN
  // ============================================================================

  router.get('/admin/all', authenticate, requireRole(['Admin', 'Moderateur']), (req, res) => oeuvreController.listAll(req, res));
  router.get('/admin/pending', authenticate, requireRole(['Admin', 'Moderateur']), (req, res) => oeuvreController.getPending(req, res));
  router.get('/admin/rejected', authenticate, requireRole(['Admin', 'Moderateur']), (req, res) => oeuvreController.getRejected(req, res));
  router.get('/admin/stats', authenticate, requireRole(['Admin']), (req, res) => oeuvreController.getStats(req, res));
  router.post('/:id/validate', authenticate, requireRole(['Admin', 'Moderateur']), (req, res) => oeuvreController.validate(req, res));
  router.post('/:id/reject', authenticate, requireRole(['Admin', 'Moderateur']), (req, res) => oeuvreController.reject(req, res));
  router.post('/:id/feature', authenticate, requireRole(['Admin']), (req, res) => oeuvreController.setFeatured(req, res));

  // Traductions (admin i18n)
  router.get('/:id/translations', authenticate, requireRole(['Admin']), (req, res) => oeuvreController.getTranslations(req, res));
  router.patch('/:id/translation/:lang', authenticate, requireRole(['Admin']), (req, res) => oeuvreController.updateTranslation(req, res));

  return router;
};

module.exports = initOeuvreRoutesV2;
