/**
 * Routes v2 pour le patrimoine
 * Utilise le pattern Controller → Service → Repository
 */

const express = require('express');
const patrimoineController = require('../controllers/patrimoineController');

const initPatrimoineRoutesV2 = (models, authMiddleware) => {
  const router = express.Router();
  const { authenticate, requireRole } = authMiddleware;

  // ============================================================================
  // ROUTES PUBLIQUES
  // ============================================================================

  router.get('/', (req, res) => patrimoineController.list(req, res));
  router.get('/popular', (req, res) => patrimoineController.popular(req, res));
  router.get('/search', (req, res) => patrimoineController.search(req, res));
  router.get('/types', (req, res) => patrimoineController.getTypes(req, res));
  router.get('/map', (req, res) => patrimoineController.getMap(req, res));
  router.get('/monuments/:type', (req, res) => patrimoineController.getByType(req, res));
  router.get('/vestiges/:type', (req, res) => patrimoineController.getByType(req, res));
  router.get('/:id/galerie', (req, res) => patrimoineController.getGalerie(req, res));
  router.get('/:id/carte-visite', (req, res) => patrimoineController.getCarteVisite(req, res));
  router.get('/:id/qrcode', (req, res) => patrimoineController.getQRCode(req, res));
  router.get('/:id', (req, res) => patrimoineController.getById(req, res));

  // ============================================================================
  // ROUTES AUTHENTIFIÉES
  // ============================================================================

  router.post('/:id/noter', authenticate, (req, res) => patrimoineController.noter(req, res));
  router.post('/:id/favoris', authenticate, (req, res) => patrimoineController.ajouterFavoris(req, res));
  router.delete('/:id/favoris', authenticate, (req, res) => patrimoineController.retirerFavoris(req, res));
  router.post('/:id/medias', authenticate, (req, res) => patrimoineController.uploadMedias(req, res));
  router.delete('/:id/medias/:mediaId', authenticate, (req, res) => patrimoineController.deleteMedia(req, res));
  router.put('/:id/horaires', authenticate, (req, res) => patrimoineController.updateHoraires(req, res));

  // ============================================================================
  // ROUTES ADMIN
  // ============================================================================

  router.get('/admin/stats', authenticate, requireRole(['Admin']), (req, res) => patrimoineController.getStats(req, res));
  router.post('/', authenticate, requireRole(['Admin', 'Moderateur']), (req, res) => patrimoineController.create(req, res));
  router.put('/:id', authenticate, requireRole(['Admin', 'Moderateur']), (req, res) => patrimoineController.update(req, res));
  router.delete('/:id', authenticate, requireRole(['Admin']), (req, res) => patrimoineController.delete(req, res));

  return router;
};

module.exports = initPatrimoineRoutesV2;
