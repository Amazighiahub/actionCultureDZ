// routes/organisationRoutes.js - Routes pour les organisations
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');

module.exports = (models, authMiddleware) => {
  const { Organisation, TypeOrganisation, UserOrganisation } = models;
  const validationMiddleware = require('../middlewares/validationMiddleware');

  // ========================================================================
  // ROUTES PROTÉGÉES (authentification requise)
  // ========================================================================

  /**
   * @route   GET /api/organisations/me
   * @desc    Récupérer les organisations de l'utilisateur connecté
   */
  router.get('/me',
    authMiddleware.authenticate,
    async (req, res) => {
      try {
        const userId = req.user.id_user;

        const userOrgs = await UserOrganisation.findAll({
          where: { id_user: userId, actif: true },
          include: [{
            model: Organisation,
            as: 'Organisation',
            include: [{
              model: TypeOrganisation,
              attributes: ['id_type_organisation', 'nom']
            }]
          }]
        });

        const organisations = userOrgs.map(uo => ({
          ...uo.Organisation.toJSON(),
          role: uo.role
        }));

        res.json({
          success: true,
          data: organisations
        });
      } catch (error) {
        console.error('Erreur récupération organisations utilisateur:', error);
        res.status(500).json({
          success: false,
          error: req.t ? req.t('common.serverError') : 'Server error'
        });
      }
    }
  );

  /**
   * @route   POST /api/organisations
   * @desc    Créer une nouvelle organisation
   */
  router.post('/',
    authMiddleware.authenticate,
    [
      body('nom').notEmpty().withMessage((value, { req }) => req.t('validation.invalidName')),
      body('id_type_organisation').isInt({ min: 1 }).withMessage((value, { req }) => req.t('validation.invalidType')),
      body('description').optional(),
      body('site_web').optional().isURL().withMessage((value, { req }) => req.t('validation.invalidWebsite'))
    ],
    validationMiddleware.handleValidationErrors,
    async (req, res) => {
      try {
        const userId = req.user.id_user;
        const { nom, id_type_organisation, description, site_web } = req.body;

        // Normaliser le nom en objet i18n si c'est une string
        const nomI18n = typeof nom === 'string' ? { fr: nom } : nom;
        const descI18n = typeof description === 'string' ? { fr: description } : (description || {});

        const organisation = await Organisation.create({
          nom: nomI18n,
          id_type_organisation,
          description: descI18n,
          site_web: site_web || null
        });

        // Lier l'utilisateur comme responsable
        await UserOrganisation.create({
          id_user: userId,
          id_organisation: organisation.id_organisation,
          role: 'responsable',
          actif: true
        });

        res.status(201).json({
          success: true,
          data: organisation
        });
      } catch (error) {
        console.error('Erreur création organisation:', error);
        res.status(500).json({
          success: false,
          error: req.t ? req.t('common.serverError') : 'Server error',
          details: error.message
        });
      }
    }
  );

  /**
   * @route   GET /api/organisations/types
   * @desc    Récupérer les types d'organisations disponibles
   */
  router.get('/types',
    async (req, res) => {
      try {
        const types = await TypeOrganisation.findAll({
          order: [['id_type_organisation', 'ASC']]
        });

        res.json({
          success: true,
          data: types
        });
      } catch (error) {
        console.error('Erreur récupération types organisations:', error);
        res.status(500).json({
          success: false,
          error: req.t ? req.t('common.serverError') : 'Server error'
        });
      }
    }
  );

  /**
   * @route   GET /api/organisations/:id
   * @desc    Récupérer une organisation par ID
   */
  router.get('/:id',
    param('id').isInt().withMessage((value, { req }) => req.t('validation.invalidId')),
    validationMiddleware.handleValidationErrors,
    async (req, res) => {
      try {
        const organisation = await Organisation.findByPk(req.params.id, {
          include: [{
            model: TypeOrganisation,
            attributes: ['id_type_organisation', 'nom']
          }]
        });

        if (!organisation) {
          return res.status(404).json({
            success: false,
            error: req.t ? req.t('common.notFound') : 'Not found'
          });
        }

        res.json({
          success: true,
          data: organisation
        });
      } catch (error) {
        console.error('Erreur récupération organisation:', error);
        res.status(500).json({
          success: false,
          error: req.t ? req.t('common.serverError') : 'Server error'
        });
      }
    }
  );


  return router;
};
