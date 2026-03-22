// routes/signalementRoutes.js - Version simplifiée sans upload
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const SignalementController = require('../controllers/signalementController');
const { handleValidationErrors, validateStringLengths } = require('../middlewares/validationMiddleware');
const { createContentLimiter } = require('../middlewares/rateLimitMiddleware');
const asyncHandler = require('../utils/asyncHandler');

// Factory function qui reçoit les modèles et middlewares
const initSignalementRoutes = (models, authMiddleware) => {
  const controller = SignalementController;
  const {
    authenticate,
    requireAdmin,
    isAuthenticated
  } = authMiddleware;

  // Middleware pour vérifier la propriété d'un signalement
  const checkSignalementOwnership = async (req, res, next) => {
    try {
      const { id } = req.params;
      const signalement = await models.Signalement.findByPk(id, {
        attributes: ['id_signalement', 'id_user_signalant']
      });

      if (!signalement) {
        return res.status(404).json({
          success: false,
          message: req.t ? req.t('admin.reportNotFound') : 'Report not found'
        });
      }

      // Admin peut tout faire
      if (req.user.isAdmin) {
        return next();
      }

      // Vérifier si l'utilisateur est le créateur
      if (signalement.id_user_signalant !== req.user.id_user) {
        return res.status(403).json({
          success: false,
          message: req.t ? req.t('auth.forbidden') : 'Forbidden'
        });
      }

      next();
    } catch (error) {
      console.error(req.t ? req.t('common.errorCheckingProperty') : 'Error checking property:', error);
      res.status(500).json({
        success: false,
        message: req.t ? req.t('common.serverError') : 'Server error'
      });
    }
  };

  // ========================================================================
  // ROUTES PUBLIQUES - VISITEURS
  // ========================================================================

  // Obtenir les statistiques publiques des signalements (anonymisées)
  router.get('/stats/public', asyncHandler(async (req, res) => {
    const stats = await models.Signalement.findAll({
      attributes: [
        'motif',
        [models.Signalement.sequelize.fn('COUNT', '*'), 'count']
      ],
      where: { statut: 'traite' },
      group: ['motif']
    });

    res.json({
      success: true,
      data: stats
    });
  }));

  // Alias compat frontend
  router.get('/stats', asyncHandler(async (req, res) => {
    const stats = await models.Signalement.findAll({
      attributes: [
        'motif',
        [models.Signalement.sequelize.fn('COUNT', '*'), 'count']
      ],
      where: { statut: 'traite' },
      group: ['motif']
    });

    res.json({
      success: true,
      data: stats
    });
  }));

  // ========================================================================
  // ROUTES PROTÉGÉES - UTILISATEURS AUTHENTIFIÉS
  // ========================================================================

  // Créer un signalement (sans upload de screenshot)
  router.post('/',
    authenticate,
    createContentLimiter,
    validateStringLengths,
    [
      body('motif').notEmpty().withMessage('Le motif est requis'),
      body('description').optional().isLength({ max: 5000 }).withMessage('Description trop longue (max 5000)'),
      body('type_entite').notEmpty().withMessage('Le type d\'entité est requis'),
      body('id_entite').isInt({ min: 1 }).withMessage('ID entité invalide'),
    ],
    handleValidationErrors,
    controller.create.bind(controller)
  );

  // Obtenir mes signalements
  router.get('/mes-signalements',
    authenticate,
    controller.getMesSignalements.bind(controller)
  );

  // Obtenir un signalement spécifique (si créateur)
  router.get('/:id(\\d+)',
    authenticate,
    checkSignalementOwnership,
    asyncHandler(async (req, res) => {
      const signalement = await models.Signalement.findByPk(req.params.id, {
        include: [
          { model: models.User, as: 'Signalant', attributes: ['id_user', 'nom', 'prenom', 'email'] },
          { model: models.User, as: 'Moderateur', attributes: ['id_user', 'nom', 'prenom', 'email'] }
        ]
      });

      res.json({
        success: true,
        data: signalement
      });
    })
  );

  // Annuler un signalement (si créateur et en attente)
  router.delete('/:id(\\d+)',
    authenticate,
    checkSignalementOwnership,
    asyncHandler(async (req, res) => {
      const signalement = await models.Signalement.findByPk(req.params.id);

      if (signalement.statut !== 'en_attente') {
        return res.status(400).json({
          success: false,
          message: req.t ? req.t('admin.onlyPendingCanCancel') : 'Only pending reports can be cancelled'
        });
      }

      await signalement.destroy();

      res.json({
        success: true,
        message: req.t ? req.t('admin.reportCancelled') : 'Report cancelled'
      });
    })
  );

  // ========================================================================
  // ROUTES ADMIN - MODÉRATION
  // ========================================================================

  // Obtenir la file de modération
  router.get('/moderation/queue',
    authenticate,
    requireAdmin,
    controller.getModerationQueue.bind(controller)
  );

  router.get('/moderation',
    authenticate,
    requireAdmin,
    controller.getModerationQueue.bind(controller)
  );

  // Traiter un signalement
  router.put('/:id/traiter',
    authenticate,
    requireAdmin,
    validateStringLengths,
    controller.traiterSignalement.bind(controller)
  );

  // Obtenir tous les signalements avec filtres
  router.get('/',
    authenticate,
    requireAdmin,
    asyncHandler(async (req, res) => {
      const { statut, motif, dateDebut, dateFin, page = 1, limit = 20 } = req.query;

      const where = {};
      if (statut) where.statut = statut;
      if (motif) where.motif = motif;
      if (dateDebut || dateFin) {
        where.createdAt = {};
        if (dateDebut) where.createdAt[models.Sequelize.Op.gte] = new Date(dateDebut);
        if (dateFin) where.createdAt[models.Sequelize.Op.lte] = new Date(dateFin);
      }

      const { count, rows } = await models.Signalement.findAndCountAll({
        where,
        include: [
          { model: models.User, as: 'Signalant', attributes: ['id_user', 'nom', 'prenom', 'email'] },
          { model: models.User, as: 'Moderateur', attributes: ['id_user', 'nom', 'prenom', 'email'] }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      });

      res.json({
        success: true,
        data: rows,
        pagination: {
          total: count,
          pages: Math.ceil(count / limit),
          currentPage: parseInt(page),
          perPage: parseInt(limit)
        }
      });
    })
  );

  // Statistiques détaillées pour admin
  router.get('/stats/detailed',
    authenticate,
    requireAdmin,
    asyncHandler(async (req, res) => {
      const { periode = '30j' } = req.query;

      // Calculer la date de début selon la période
      const dateDebut = new Date();
      switch (periode) {
        case '7j':
          dateDebut.setDate(dateDebut.getDate() - 7);
          break;
        case '30j':
          dateDebut.setDate(dateDebut.getDate() - 30);
          break;
        case '90j':
          dateDebut.setDate(dateDebut.getDate() - 90);
          break;
        case 'annee':
          dateDebut.setFullYear(dateDebut.getFullYear() - 1);
          break;
      }

      const dateWhere = { createdAt: { [models.Sequelize.Op.gte]: dateDebut } };
      const countFn = models.Signalement.sequelize.fn('COUNT', '*');

      const [byMotif, byStatus, byType, tempsTraitement] = await Promise.all([
        models.Signalement.findAll({
          attributes: ['motif', [countFn, 'count']],
          where: dateWhere, group: ['motif']
        }),
        models.Signalement.findAll({
          attributes: ['statut', [countFn, 'count']],
          where: dateWhere, group: ['statut']
        }),
        models.Signalement.findAll({
          attributes: ['type_entite', [countFn, 'count']],
          where: dateWhere, group: ['type_entite']
        }),
        models.Signalement.findOne({
          attributes: [[models.Signalement.sequelize.fn('AVG',
            models.Signalement.sequelize.literal('TIMESTAMPDIFF(HOUR, createdAt, date_traitement)')
          ), 'avgHours']],
          where: { statut: 'traite', ...dateWhere }
        })
      ]);

      res.json({
        success: true,
        data: {
          periode,
          byMotif,
          byStatus,
          byType,
          tempsTraitementMoyen: tempsTraitement?.dataValues?.avgHours || 0,
          total: byMotif.reduce((sum, item) => sum + parseInt(item.dataValues.count), 0)
        }
      });
    })
  );

  // Export des signalements
  router.get('/export',
    authenticate,
    requireAdmin,
    asyncHandler(async (req, res) => {
      const { format = 'json', statut, dateDebut, dateFin } = req.query;

      const where = {};
      if (statut) where.statut = statut;
      if (dateDebut || dateFin) {
        where.createdAt = {};
        if (dateDebut) where.createdAt[models.Sequelize.Op.gte] = new Date(dateDebut);
        if (dateFin) where.createdAt[models.Sequelize.Op.lte] = new Date(dateFin);
      }

      const signalements = await models.Signalement.findAll({
        where,
        include: [
          { model: models.User, as: 'Signalant', attributes: ['id_user', 'nom', 'prenom', 'email'] },
          { model: models.User, as: 'Moderateur', attributes: ['id_user', 'nom', 'prenom', 'email'] }
        ],
        order: [['createdAt', 'DESC']],
        limit: Math.min(parseInt(req.query.limit) || 5000, 10000)
      });

      res.json({
        success: true,
        count: signalements.length,
        format,
        data: signalements
      });
    })
  );

  return router;
};

module.exports = initSignalementRoutes;