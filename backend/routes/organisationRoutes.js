// routes/organisationRoutes.js
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const container = require('../services/serviceContainer');
const { handleValidationErrors } = require('../middlewares/validationMiddleware');

module.exports = (_models, authMiddleware) => {
  const get = () => container.organisationService;

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
      body('site_web').optional().isURL().withMessage((_, { req }) => req.t('validation.invalidWebsite'))
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
