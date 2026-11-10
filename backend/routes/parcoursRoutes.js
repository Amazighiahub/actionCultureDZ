/**
 * Routes pour les parcours intelligents
 * Utilise le pattern Controller → Service → Repository
 */

const express = require('express');
const { param, body } = require('express-validator');
const parcoursController = require('../controllers/parcoursController');
const { handleValidationErrors, validateId, validateStringLengths } = require('../middlewares/validationMiddleware');
const { msg } = require('../utils/messageValidation');

const initParcoursRoutes = (models, authMiddleware) => {
  const router = express.Router();
  const { authenticate, requireRole, requireVerifiedEmail, optionalAuth } = authMiddleware;

  // ============================================================================
  // ROUTES PUBLIQUES
  // ============================================================================

  router.get('/', (req, res) => parcoursController.list(req, res));
  router.get('/search', (req, res) => parcoursController.search(req, res));
  router.post('/personnalise',
    [
      body('latitude').isFloat({ min: -90, max: 90 }).withMessage(msg('validation.invalidLatitude')),
      body('longitude').isFloat({ min: -180, max: 180 }).withMessage(msg('validation.invalidLongitude')),
      body('interests').optional().isArray().withMessage(msg('validation.interetsListe')),
      body('duration').optional().isInt({ min: 30, max: 1440 }).withMessage(msg('validation.dureeParcours')),
    ],
    handleValidationErrors,
    (req, res) => parcoursController.personnalise(req, res));
  // optionalAuth : un parcours inactif reste visible par son créateur et la modération
  router.get('/:id', optionalAuth, validateId(), (req, res) => parcoursController.getById(req, res));
  router.get('/:id/map', optionalAuth, validateId(), (req, res) => parcoursController.getMap(req, res));

  // ============================================================================
  // ROUTES AUTHENTIFIÉES
  // ============================================================================

  router.get('/my/list', authenticate, (req, res) => parcoursController.getMyParcours(req, res));
  router.post('/', authenticate, requireVerifiedEmail,
    validateStringLengths,
    [body('nom').notEmpty().withMessage(msg('validation.nomRequis'))],
    handleValidationErrors,
    (req, res) => parcoursController.create(req, res));
  router.put('/:id', authenticate, requireVerifiedEmail,
    validateId(),
    validateStringLengths,
    handleValidationErrors,
    (req, res) => parcoursController.update(req, res));
  router.delete('/:id', authenticate, requireVerifiedEmail,
    validateId(),
    (req, res) => parcoursController.delete(req, res));

  // Gestion des étapes
  router.post('/:id/etapes', authenticate, requireVerifiedEmail,
    validateId(),
    [body('id_lieu').isInt({ min: 1 }).withMessage(msg('validation.lieuInvalide'))],
    handleValidationErrors,
    (req, res) => parcoursController.addEtape(req, res));
  router.delete('/:id/etapes/:etapeId', authenticate, requireVerifiedEmail,
    validateId(),
    [param('etapeId').isInt({ min: 1 }).withMessage(msg('validation.etapeInvalide'))],
    handleValidationErrors,
    (req, res) => parcoursController.removeEtape(req, res));
  router.put('/:id/etapes/reorder', authenticate, requireVerifiedEmail,
    validateId(),
    [body('etapes').isArray().withMessage(msg('validation.etapesListe'))],
    handleValidationErrors,
    (req, res) => parcoursController.reorderEtapes(req, res));

  // ============================================================================
  // ROUTES ADMIN
  // ============================================================================

  router.get('/admin/all', authenticate, requireRole(['Admin', 'Moderateur']), (req, res) => parcoursController.listAll(req, res));
  router.get('/admin/stats', authenticate, requireRole(['Admin']), (req, res) => parcoursController.getStats(req, res));
  router.post('/:id/activate', authenticate, requireRole(['Admin', 'Moderateur']), validateId(), (req, res) => parcoursController.activate(req, res));
  router.post('/:id/deactivate', authenticate, requireRole(['Admin', 'Moderateur']), validateId(), (req, res) => parcoursController.deactivate(req, res));

  return router;
};

module.exports = initParcoursRoutes;
