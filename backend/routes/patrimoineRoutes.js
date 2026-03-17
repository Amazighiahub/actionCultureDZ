/**
 * Routes v2 pour le patrimoine
 * Utilise le pattern Controller → Service → Repository
 */

const express = require('express');
const { param, body } = require('express-validator');
const patrimoineController = require('../controllers/patrimoineController');
const { handleValidationErrors, validateId, validateStringLengths, validateGPS } = require('../middlewares/validationMiddleware');
const { createContentLimiter } = require('../middlewares/rateLimitMiddleware');
const asyncHandler = require('../utils/asyncHandler');

const initPatrimoineRoutesV2 = (models, authMiddleware) => {
  const router = express.Router();
  const { authenticate, requireRole, requireValidatedProfessional } = authMiddleware;

  // ============================================================================
  // ROUTES PUBLIQUES
  // ============================================================================

  // Routes mobile (AVANT /:id pour éviter que "mobile" soit pris comme id)
  router.get('/mobile/nearby', asyncHandler((req, res) => patrimoineController.getMobileNearby(req, res)));
  router.post('/mobile/qr-scan', asyncHandler((req, res) => patrimoineController.scanQRCode(req, res)));
  router.get('/mobile/offline/:wilayaId', asyncHandler((req, res) => patrimoineController.getMobileOffline(req, res)));

  router.get('/', asyncHandler((req, res) => patrimoineController.list(req, res)));
  router.get('/popular', asyncHandler((req, res) => patrimoineController.popular(req, res)));
  router.get('/search', asyncHandler((req, res) => patrimoineController.search(req, res)));
  router.get('/types', asyncHandler((req, res) => patrimoineController.getTypes(req, res)));
  router.get('/map', asyncHandler((req, res) => patrimoineController.getMap(req, res)));
  router.get('/monuments/:type', asyncHandler((req, res) => patrimoineController.getByType(req, res)));
  router.get('/vestiges/:type', asyncHandler((req, res) => patrimoineController.getByType(req, res)));
  router.get('/:id/galerie', validateId(), asyncHandler((req, res) => patrimoineController.getGalerie(req, res)));
  router.get('/:id/carte-visite', validateId(), asyncHandler((req, res) => patrimoineController.getCarteVisite(req, res)));
  router.get('/:id/qrcode', validateId(), asyncHandler((req, res) => patrimoineController.getQRCode(req, res)));
  router.get('/:id', validateId(), asyncHandler((req, res) => patrimoineController.getById(req, res)));

  // ============================================================================
  // ROUTES AUTHENTIFIÉES
  // ============================================================================

  router.post('/:id/noter', authenticate, validateId(),
    [body('note').isInt({ min: 1, max: 5 }).withMessage('La note doit être entre 1 et 5')],
    handleValidationErrors,
    asyncHandler((req, res) => patrimoineController.noter(req, res)));
  router.post('/:id/favoris', authenticate, validateId(), asyncHandler((req, res) => patrimoineController.ajouterFavoris(req, res)));
  router.delete('/:id/favoris', authenticate, validateId(), asyncHandler((req, res) => patrimoineController.retirerFavoris(req, res)));
  router.post('/:id/medias', authenticate, requireValidatedProfessional, validateId(), asyncHandler((req, res) => patrimoineController.uploadMedias(req, res)));
  router.delete('/:id/medias/:mediaId', authenticate, requireValidatedProfessional, validateId(), validateId('mediaId'), asyncHandler((req, res) => patrimoineController.deleteMedia(req, res)));
  router.put('/:id/horaires', authenticate, requireValidatedProfessional, validateId(), asyncHandler((req, res) => patrimoineController.updateHoraires(req, res)));

  // ============================================================================
  // ROUTES ADMIN
  // ============================================================================

  router.get('/admin/stats', authenticate, requireRole(['Admin']), asyncHandler((req, res) => patrimoineController.getStats(req, res)));
  router.post('/', authenticate, requireRole(['Admin', 'Moderateur']),
    createContentLimiter,
    validateStringLengths,
    validateGPS,
    [body('nom').notEmpty().withMessage('Le nom est requis')],
    handleValidationErrors,
    asyncHandler((req, res) => patrimoineController.create(req, res)));
  router.put('/:id', authenticate, requireRole(['Admin', 'Moderateur']), validateId(),
    validateStringLengths,
    validateGPS,
    asyncHandler((req, res) => patrimoineController.update(req, res)));
  router.delete('/:id', authenticate, requireRole(['Admin']), validateId(), asyncHandler((req, res) => patrimoineController.delete(req, res)));

  return router;
};

module.exports = initPatrimoineRoutesV2;
