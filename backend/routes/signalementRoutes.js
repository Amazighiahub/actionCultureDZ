// routes/signalementRoutes.js - Version simplifiée sans upload
const express = require('express');
const router = express.Router();
const signalementController = require('../controllers/SignalementController');

// Factory function qui reçoit les modèles et middlewares
const initSignalementRoutes = (models, authMiddleware) => {
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
        attributes: ['id', 'createdBy']
      });

      if (!signalement) {
        return res.status(404).json({
          success: false,
          message: 'Signalement non trouvé'
        });
      }

      // Admin peut tout faire
      if (req.user.isAdmin) {
        return next();
      }

      // Vérifier si l'utilisateur est le créateur
      if (signalement.createdBy !== req.user.id_user) {
        return res.status(403).json({
          success: false,
          message: 'Vous n\'êtes pas autorisé à modifier ce signalement'
        });
      }

      next();
    } catch (error) {
      console.error('Erreur vérification propriété:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la vérification des permissions'
      });
    }
  };

  // ========================================================================
  // ROUTES PUBLIQUES - VISITEURS
  // ========================================================================

  // Obtenir les statistiques publiques des signalements (anonymisées)
  router.get('/signalements/stats/public', async (req, res) => {
    try {
      const stats = await models.Signalement.findAll({
        attributes: [
          'motif',
          [models.Signalement.sequelize.fn('COUNT', '*'), 'count']
        ],
        where: { statut: 'traite' }, // Seulement les signalements traités
        group: ['motif']
      });

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques'
      });
    }
  });

  // ========================================================================
  // ROUTES PROTÉGÉES - UTILISATEURS AUTHENTIFIÉS
  // ========================================================================

  // Créer un signalement (sans upload de screenshot)
  router.post('/signalements',
    authenticate,
    signalementController.create
  );

  // Obtenir mes signalements
  router.get('/signalements/mes-signalements',
    authenticate,
    signalementController.getMesSignalements
  );

  // Obtenir un signalement spécifique (si créateur)
  router.get('/signalements/:id',
    authenticate,
    checkSignalementOwnership,
    async (req, res) => {
      try {
        const signalement = await models.Signalement.findByPk(req.params.id, {
          include: [
            { model: models.User, as: 'reporter', attributes: ['username', 'email'] },
            { model: models.User, as: 'moderateur', attributes: ['username'] }
          ]
        });

        res.json({
          success: true,
          data: signalement
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération du signalement'
        });
      }
    }
  );

  // Annuler un signalement (si créateur et en attente)
  router.delete('/signalements/:id',
    authenticate,
    checkSignalementOwnership,
    async (req, res) => {
      try {
        const signalement = await models.Signalement.findByPk(req.params.id);
        
        if (signalement.statut !== 'en_attente') {
          return res.status(400).json({
            success: false,
            message: 'Seuls les signalements en attente peuvent être annulés'
          });
        }

        await signalement.destroy();

        res.json({
          success: true,
          message: 'Signalement annulé avec succès'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Erreur lors de l\'annulation du signalement'
        });
      }
    }
  );

  // ========================================================================
  // ROUTES ADMIN - MODÉRATION
  // ========================================================================

  // Obtenir la file de modération
  router.get('/signalements/moderation/queue',
    authenticate,
    requireAdmin,
    signalementController.getModerationQueue
  );

  // Traiter un signalement
  router.put('/signalements/:id/traiter',
    authenticate,
    requireAdmin,
    signalementController.traiterSignalement
  );

  // Obtenir tous les signalements avec filtres
  router.get('/signalements',
    authenticate,
    requireAdmin,
    async (req, res) => {
      try {
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
            { model: models.User, as: 'reporter', attributes: ['username', 'email'] },
            { model: models.User, as: 'moderateur', attributes: ['username'] }
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
      } catch (error) {
        console.error('Erreur récupération signalements:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération des signalements'
        });
      }
    }
  );

  // Statistiques détaillées pour admin
  router.get('/signalements/stats/detailed',
    authenticate,
    requireAdmin,
    async (req, res) => {
      try {
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

        // Stats par motif
        const byMotif = await models.Signalement.findAll({
          attributes: [
            'motif',
            [models.Signalement.sequelize.fn('COUNT', '*'), 'count']
          ],
          where: {
            createdAt: { [models.Sequelize.Op.gte]: dateDebut }
          },
          group: ['motif']
        });

        // Stats par statut
        const byStatus = await models.Signalement.findAll({
          attributes: [
            'statut',
            [models.Signalement.sequelize.fn('COUNT', '*'), 'count']
          ],
          where: {
            createdAt: { [models.Sequelize.Op.gte]: dateDebut }
          },
          group: ['statut']
        });

        // Stats par type d'entité
        const byType = await models.Signalement.findAll({
          attributes: [
            'type_entite',
            [models.Signalement.sequelize.fn('COUNT', '*'), 'count']
          ],
          where: {
            createdAt: { [models.Sequelize.Op.gte]: dateDebut }
          },
          group: ['type_entite']
        });

        // Temps moyen de traitement
        const tempsTraitement = await models.Signalement.findOne({
          attributes: [
            [models.Signalement.sequelize.fn('AVG', 
              models.Signalement.sequelize.literal('TIMESTAMPDIFF(HOUR, createdAt, date_traitement)')
            ), 'avgHours']
          ],
          where: {
            statut: 'traite',
            createdAt: { [models.Sequelize.Op.gte]: dateDebut }
          }
        });

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
      } catch (error) {
        console.error('Erreur statistiques:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors du calcul des statistiques'
        });
      }
    }
  );

  // Export des signalements
  router.get('/signalements/export',
    authenticate,
    requireAdmin,
    async (req, res) => {
      try {
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
            { model: models.User, as: 'reporter', attributes: ['username', 'email'] },
            { model: models.User, as: 'moderateur', attributes: ['username'] }
          ],
          order: [['createdAt', 'DESC']]
        });

        res.json({
          success: true,
          count: signalements.length,
          format,
          data: signalements
        });
      } catch (error) {
        console.error('Erreur export:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de l\'export'
        });
      }
    }
  );

  return router;
};

module.exports = initSignalementRoutes;