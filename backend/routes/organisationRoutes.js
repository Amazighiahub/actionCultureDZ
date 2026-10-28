// routes/organisationRoutes.js
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const container = require('../services/serviceContainer');
const { handleValidationErrors, validateId } = require('../middlewares/validationMiddleware');
const controller = require('../controllers/organisationController');

// Champs de la page publique (création et modification)
const champsVitrine = [
  body('logo_url').optional({ values: 'null' }).isString().isLength({ max: 500 }),
  body('id_wilaya').optional({ values: 'falsy' }).isInt({ min: 1 }),
  body('adresse').optional({ values: 'null' }).isString().isLength({ max: 255 }),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage((_, { req }) => req.t('validation.invalidEmail')),
  body('telephone').optional({ values: 'falsy' }).matches(/^[0-9+().\s-]{6,30}$/).withMessage((_, { req }) => req.t('validation.invalidPhone')),
  body('reseaux').optional({ values: 'null' }).isObject()
];

module.exports = (_models, authMiddleware) => {
  const get = () => container.organisationService;
  const { authenticate, optionalAuth, requireRole } = authMiddleware;
  const moderation = requireRole(['Admin', 'Moderateur']);

  /**
   * GET /api/organisations?categorie=&wilaya=&q=
   * Annuaire public des organisations vérifiées
   */
  router.get('/', (req, res) => controller.annuaire(req, res));

  /**
   * GET /api/organisations/ressemblantes?nom=&exclure=
   * Organisations au nom proche, avant d'en créer une (connecté)
   */
  router.get('/ressemblantes', authenticate, (req, res) => controller.ressemblantes(req, res));

  /**
   * GET /api/organisations/admin/liste
   * Toutes les organisations et leur statut (modération)
   */
  router.get('/admin/liste', authenticate, moderation, (req, res) => controller.listeModeration(req, res));

  /**
   * GET /api/organisations/me
   * Organisations de l'utilisateur connecté
   */
  router.get('/me', authMiddleware.authenticate, async (req, res) => {
    try {
      const organisations = await get().findByUser(req.user.id_user);
      res.json({ success: true, data: organisations });
    } catch (error) {
      res.status(500).json({ success: false, error: req.t ? req.t('common.serverError') : 'Server error' });
    }
  });

  /**
   * GET /api/organisations/types
   * Types d'organisations disponibles (public)
   */
  router.get('/types', async (req, res) => {
    try {
      const types = await get().getTypes();
      res.json({ success: true, data: types });
    } catch (error) {
      res.status(500).json({ success: false, error: req.t ? req.t('common.serverError') : 'Server error' });
    }
  });

  /**
   * POST /api/organisations
   * Créer une organisation (ou lier si doublon de nom)
   */
  router.post('/',
    authMiddleware.authenticate,
    [
      body('nom').notEmpty().withMessage((_, { req }) => req.t('validation.invalidName')),
      body('id_type_organisation').isInt({ min: 1 }).withMessage((_, { req }) => req.t('validation.invalidType')),
      body('description').optional(),
      body('site_web').optional({ values: 'falsy' }).isURL().withMessage((_, { req }) => req.t('validation.invalidWebsite')),
      ...champsVitrine
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const { organisation, created } = await get().create(req.body, req.user.id_user);
        res.status(created ? 201 : 200).json({ success: true, data: organisation });
      } catch (error) {
        const logger = require('../utils/logger');
        logger.error('Erreur création organisation:', error);
        res.status(500).json({ success: false, error: req.t ? req.t('common.serverError') : 'Server error' });
      }
    }
  );

  /**
   * GET /api/organisations/:id/vitrine
   * Page publique : fiche, membres, événements, œuvres publiées
   */
  router.get('/:id/vitrine', optionalAuth, validateId(), (req, res) => controller.vitrine(req, res));

  /**
   * PUT /api/organisations/:id
   * Modifier la page (responsables de l'organisation ou modération)
   */
  router.put('/:id', authenticate, validateId(),
    [
      body('nom').optional().notEmpty(),
      body('id_type_organisation').optional().isInt({ min: 1 }),
      body('site_web').optional({ values: 'falsy' }).isURL().withMessage((_, { req }) => req.t('validation.invalidWebsite')),
      ...champsVitrine
    ],
    handleValidationErrors,
    (req, res) => controller.modifier(req, res));

  /**
   * GET /api/organisations/:id/fusion?doublons=7,9  (résumé)
   * POST /api/organisations/:id/fusion { doublons: [7, 9] }
   * Regrouper des doublons dans cette organisation (modération)
   */
  router.get('/:id/fusion', authenticate, moderation, validateId(), (req, res) => controller.apercuFusion(req, res));
  router.post('/:id/fusion', authenticate, moderation, validateId(),
    [body('doublons').isArray({ min: 1, max: 20 }), body('doublons.*').isInt({ min: 1 }).toInt()],
    handleValidationErrors,
    (req, res) => controller.fusionner(req, res));

  /**
   * PATCH /api/organisations/:id/statut
   * Vérification par l'équipe : publier, ou refuser avec un motif
   */
  router.patch('/:id/statut', authenticate, moderation, validateId(),
    [
      body('statut').isIn(['valide', 'rejete']),
      body('motif').optional().isString().isLength({ max: 1000 })
    ],
    handleValidationErrors,
    (req, res) => controller.changerStatut(req, res));

  /**
   * GET /api/organisations/:id
   * Détail d'une organisation
   */
  router.get('/:id',
    param('id').isInt().withMessage((_, { req }) => req.t('validation.invalidId')),
    handleValidationErrors,
    async (req, res) => {
      try {
        const organisation = await get().findById(parseInt(req.params.id));
        res.json({ success: true, data: organisation });
      } catch (error) {
        if (error.code === 'NOT_FOUND') {
          return res.status(404).json({ success: false, error: req.t ? req.t('common.notFound') : 'Not found' });
        }
        res.status(500).json({ success: false, error: req.t ? req.t('common.serverError') : 'Server error' });
      }
    }
  );

  return router;
};
