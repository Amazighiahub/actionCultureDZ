/**
 * Routes v2 pour l'artisanat
 * Utilise le pattern Controller → Service → Repository
 */

const express = require('express');
const artisanatController = require('../controllers/artisanatController');

const initArtisanatRoutesV2 = (models, authMiddleware) => {
  const router = express.Router();
  const { authenticate, requireRole } = authMiddleware;

  // ============================================================================
  // ROUTES PUBLIQUES
  // ============================================================================

  router.get('/', (req, res) => artisanatController.list(req, res));
  router.get('/search', (req, res) => artisanatController.search(req, res));
  router.get('/statistics', (req, res) => artisanatController.getStatistics(req, res));
  router.get('/region/:wilayaId/artisans', (req, res) => artisanatController.getArtisansByRegion(req, res));
  router.get('/:id', (req, res) => artisanatController.getById(req, res));

  // ============================================================================
  // ROUTES AUTHENTIFIÉES
  // ============================================================================

  router.get('/my/list', authenticate, (req, res) => artisanatController.getMyArtisanats(req, res));
  router.post('/', authenticate, (req, res) => artisanatController.create(req, res));
  router.put('/:id', authenticate, (req, res) => artisanatController.update(req, res));
  router.delete('/:id', authenticate, (req, res) => artisanatController.delete(req, res));
  router.post('/:id/medias', authenticate, (req, res) => artisanatController.uploadMedias(req, res));

  // ============================================================================
  // ROUTES ADMIN
  // ============================================================================

  router.get('/admin/stats', authenticate, requireRole(['Admin']), (req, res) => artisanatController.getStats(req, res));

  return router;
};

module.exports = initArtisanatRoutesV2;
