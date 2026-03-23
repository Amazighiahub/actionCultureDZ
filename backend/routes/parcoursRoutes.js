/**
 * Routes pour les parcours intelligents
 * Utilise le pattern Controller → Service → Repository
 */

const express = require('express');
const { param, body } = require('express-validator');
const parcoursController = require('../controllers/parcoursController');
const { handleValidationErrors, validateId, validateStringLengths } = require('../middlewares/validationMiddleware');

const initParcoursRoutes = (models, authMiddleware) => {
  const router = express.Router();
  const { authenticate, requireRole, requireVerifiedEmail } = authMiddleware;

  // ============================================================================
  // ROUTES PUBLIQUES
  // ============================================================================

  router.get('/', (req, res) => parcoursController.list(req, res));
  router.get('/search', (req, res) => parcoursController.search(req, res));
  router.post('/personnalise', (req, res) => parcoursController.personnalise(req, res));
  router.get('/:id', validateId(), (req, res) => parcoursController.getById(req, res));
  router.get('/:id/map', validateId(), (req, res) => parcoursController.getMap(req, res));

  // ============================================================================
  // ROUTES AUTHENTIFIÉES
  // ============================================================================

  router.get('/my/list', authenticate, (req, res) => parcoursController.getMyParcours(req, res));
  router.post('/', authenticate, requireVerifiedEmail,
    validateStringLengths,
    [body('nom').notEmpty().withMessage('Le nom est requis')],
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
    [body('id_lieu').isInt({ min: 1 }).withMessage('id_lieu invalide')],
    handleValidationErrors,
    (req, res) => parcoursController.addEtape(req, res));
  router.delete('/:id/etapes/:etapeId', authenticate, requireVerifiedEmail,
    validateId(),
    [param('etapeId').isInt({ min: 1 }).withMessage('etapeId invalide')],
    handleValidationErrors,
    (req, res) => parcoursController.removeEtape(req, res));
  router.put('/:id/etapes/reorder', authenticate, requireVerifiedEmail,
    validateId(),
    [body('etapes').isArray().withMessage('etapes doit être un tableau')],
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
