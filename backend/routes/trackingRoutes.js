// routes/trackingRoutes.js
const express = require('express');
const router = express.Router();
const VueController = require('../controllers/VueController');

// Factory function qui reçoit les modèles et middlewares
const initTrackingRoutes = (models, authMiddleware) => {
  // ========================================================================
  // INITIALISATION DU CONTRÔLEUR - CORRECTION ICI
  // ========================================================================
  const vueController = new VueController(models);

  const { 
    authenticate, 
    requireAdmin,
    optionalAuth
  } = authMiddleware;

  // Middleware pour valider le type d'entité
  const validateEntityType = (req, res, next) => {
    const validTypes = ['oeuvre', 'evenement', 'lieu', 'artisanat', 'article'];
    const { type } = req.params;
    
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type d\'entité invalide'
      });
    }
    
    next();
  };

  // Middleware pour vérifier l'existence de l'entité
  const checkEntityExists = async (req, res, next) => {
    try {
      const { type, id } = req.params;
      let entity;

      switch (type) {
        case 'oeuvre':
          entity = await models.Oeuvre.findByPk(id);
          break;
        case 'evenement':
          entity = await models.Evenement.findByPk(id);
          break;
        case 'lieu':
          entity = await models.Lieu.findByPk(id);
          break;
        case 'artisanat':
          entity = await models.Artisanat.findByPk(id);
          break;
        case 'article':
          entity = await models.Article.findByPk(id);
          break;
      }

      if (!entity) {
        return res.status(404).json({
          success: false,
          message: `${type} non trouvé(e)`
        });
      }

      req.entity = entity;
      next();
    } catch (error) {
      console.error('Erreur vérification entité:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la vérification de l\'entité'
      });
    }
  };

  // ========================================================================
  // ROUTES PUBLIQUES - VISITEURS
  // ========================================================================

  // Enregistrer une vue (authentification optionnelle)
  router.post('/tracking/view',
    optionalAuth,
    (req, res) => vueController.trackView(req, res)
  );

  // Enregistrer une vue pour une entité spécifique
  router.post('/tracking/:type/:id/view',
    optionalAuth,
    validateEntityType,
    checkEntityExists,
    async (req, res) => {
      req.body.type_entite = req.params.type;
      req.body.id_entite = req.params.id;
      return vueController.trackView(req, res);
    }
  );

  // Mettre à jour la durée d'une vue
  router.put('/tracking/view/:id',
    optionalAuth,
    (req, res) => vueController.updateViewDuration(req, res)
  );

  // Obtenir les statistiques publiques d'une entité
  router.get('/tracking/stats/:type/:id',
    validateEntityType,
    (req, res) => vueController.getViewStats(req, res)
  );

  // Obtenir le nombre de vues pour une entité
  router.get('/tracking/:type/:id/count',
    validateEntityType,
    async (req, res) => {
      try {
        const { type, id } = req.params;
        
        const count = await models.Vue.count({
          where: {
            type_entite: type,
            id_entite: parseInt(id)
          }
        });

        res.json({
          success: true,
          data: {
            type,
            id: parseInt(id),
            views: count
          }
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Erreur lors du comptage des vues'
        });
      }
    }
  );

  // Obtenir les entités les plus vues (top populaire)
  router.get('/tracking/popular/:type',
    validateEntityType,
    async (req, res) => {
      try {
        const { type } = req.params;
        const { limit = 10, periode = '7j' } = req.query;
        
        // Calculer la date de début
        const dateDebut = new Date();
        switch (periode) {
          case '24h':
            dateDebut.setHours(dateDebut.getHours() - 24);
            break;
          case '7j':
            dateDebut.setDate(dateDebut.getDate() - 7);
            break;
          case '30j':
            dateDebut.setDate(dateDebut.getDate() - 30);
            break;
          case 'all':
            dateDebut.setFullYear(2000); // Date très ancienne
            break;
        }

        const popular = await models.Vue.findAll({
          attributes: [
            'id_entite',
            [models.Vue.sequelize.fn('COUNT', '*'), 'views'],
            [models.Vue.sequelize.fn('COUNT', models.Vue.sequelize.literal('DISTINCT id_user')), 'unique_viewers']
          ],
          where: {
            type_entite: type,
            date_vue: { [models.Sequelize.Op.gte]: dateDebut }
          },
          group: ['id_entite'],
          order: [[models.Vue.sequelize.literal('views'), 'DESC']],
          limit: parseInt(limit)
        });

        // Enrichir avec les données des entités
        const entityIds = popular.map(p => p.dataValues.id_entite);
        let entities = [];

        switch (type) {
          case 'oeuvre':
            entities = await models.Oeuvre.findAll({
              where: { id_oeuvre: entityIds },
              attributes: ['id_oeuvre', 'titre', 'image_principale']
            });
            break;
          case 'evenement':
            entities = await models.Evenement.findAll({
              where: { id_evenement: entityIds },
              attributes: ['id_evenement', 'titre', 'date_debut', 'image']
            });
            break;
          case 'lieu':
            entities = await models.Lieu.findAll({
              where: { id_lieu: entityIds },
              attributes: ['id_lieu', 'nom_lieu', 'type_lieu']
            });
            break;
          case 'artisanat':
            entities = await models.Artisanat.findAll({
              where: { id_artisanat: entityIds },
              attributes: ['id_artisanat', 'nom', 'image_principale']
            });
            break;
        }

        // Combiner les données - Correction des noms de champs
        const results = popular.map(p => {
          const entity = entities.find(e => {
            switch (type) {
              case 'oeuvre': return e.id_oeuvre === p.dataValues.id_entite;
              case 'evenement': return e.id_evenement === p.dataValues.id_entite;
              case 'lieu': return e.id_lieu === p.dataValues.id_entite;
              case 'artisanat': return e.id_artisanat === p.dataValues.id_entite;
            }
          });
          return {
            ...p.dataValues,
            entity
          };
        });

        res.json({
          success: true,
          data: results,
          params: { type, limit: parseInt(limit), periode }
        });
      } catch (error) {
        console.error('Erreur récupération populaires:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération des éléments populaires'
        });
      }
    }
  );

  // ========================================================================
  // ROUTES PROTÉGÉES - UTILISATEURS AUTHENTIFIÉS
  // ========================================================================

  // Obtenir l'historique de mes vues
  router.get('/tracking/mes-vues',
    authenticate,
    async (req, res) => {
      try {
        const { page = 1, limit = 20, type } = req.query;
        
        const where = { id_user: req.user.id_user };
        if (type) where.type_entite = type;

        const { count, rows } = await models.Vue.findAndCountAll({
          where,
          order: [['date_vue', 'DESC']],
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
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération de l\'historique'
        });
      }
    }
  );

  // Supprimer mon historique de vues
  router.delete('/tracking/mes-vues',
    authenticate,
    async (req, res) => {
      try {
        const { type, dateDebut, dateFin } = req.body;
        
        const where = { id_user: req.user.id_user };
        if (type) where.type_entite = type;
        if (dateDebut || dateFin) {
          where.date_vue = {};
          if (dateDebut) where.date_vue[models.Sequelize.Op.gte] = new Date(dateDebut);
          if (dateFin) where.date_vue[models.Sequelize.Op.lte] = new Date(dateFin);
        }

        const deleted = await models.Vue.destroy({ where });

        res.json({
          success: true,
          message: `${deleted} vue(s) supprimée(s) de votre historique`
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la suppression de l\'historique'
        });
      }
    }
  );

  // ========================================================================
  // ROUTES ADMIN - ANALYTICS
  // ========================================================================

  // Dashboard analytics global
  router.get('/tracking/analytics/dashboard',
    authenticate,
    requireAdmin,
    async (req, res) => {
      try {
        const { periode = '7j' } = req.query;
        
        // Calculer la date de début
        const dateDebut = new Date();
        switch (periode) {
          case '24h':
            dateDebut.setHours(dateDebut.getHours() - 24);
            break;
          case '7j':
            dateDebut.setDate(dateDebut.getDate() - 7);
            break;
          case '30j':
            dateDebut.setDate(dateDebut.getDate() - 30);
            break;
          case '90j':
            dateDebut.setDate(dateDebut.getDate() - 90);
            break;
        }

        // Total des vues
        const totalViews = await models.Vue.count({
          where: {
            date_vue: { [models.Sequelize.Op.gte]: dateDebut }
          }
        });

        // Visiteurs uniques - Correction: compter les sessions uniques
        const uniqueVisitors = await models.Vue.findOne({
          attributes: [
            [models.Vue.sequelize.fn('COUNT', models.Vue.sequelize.literal('DISTINCT COALESCE(id_user, session_id)')), 'count']
          ],
          where: {
            date_vue: { [models.Sequelize.Op.gte]: dateDebut }
          }
        });

        // Vues par type
        const viewsByType = await models.Vue.findAll({
          attributes: [
            'type_entite',
            [models.Vue.sequelize.fn('COUNT', '*'), 'count']
          ],
          where: {
            date_vue: { [models.Sequelize.Op.gte]: dateDebut }
          },
          group: ['type_entite']
        });

        // Évolution temporelle
        const viewsEvolution = await models.Vue.findAll({
          attributes: [
            [models.Vue.sequelize.fn('DATE', models.Vue.sequelize.col('date_vue')), 'date'],
            [models.Vue.sequelize.fn('COUNT', '*'), 'views']
          ],
          where: {
            date_vue: { [models.Sequelize.Op.gte]: dateDebut }
          },
          group: [models.Vue.sequelize.fn('DATE', models.Vue.sequelize.col('date_vue'))],
          order: [[models.Vue.sequelize.fn('DATE', models.Vue.sequelize.col('date_vue')), 'ASC']]
        });

        // Top sources
        const topSources = await models.Vue.findAll({
          attributes: [
            'source',
            [models.Vue.sequelize.fn('COUNT', '*'), 'count']
          ],
          where: {
            date_vue: { [models.Sequelize.Op.gte]: dateDebut },
            source: { [models.Sequelize.Op.ne]: null }
          },
          group: ['source'],
          order: [[models.Vue.sequelize.literal('count'), 'DESC']],
          limit: 10
        });

        res.json({
          success: true,
          data: {
            periode,
            totalViews,
            uniqueVisitors: uniqueVisitors?.dataValues?.count || 0,
            averageViewsPerVisitor: uniqueVisitors?.dataValues?.count > 0 ? 
              (totalViews / uniqueVisitors.dataValues.count).toFixed(2) : 0,
            viewsByType,
            viewsEvolution,
            topSources
          }
        });
      } catch (error) {
        console.error('Erreur analytics:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la génération des analytics'
        });
      }
    }
  );

  // Analytics détaillées pour une entité
  router.get('/tracking/analytics/:type/:id',
    authenticate,
    requireAdmin,
    validateEntityType,
    async (req, res) => {
      try {
        const { type, id } = req.params;
        const { periode = '30j' } = req.query;
        
        // Calculer la date de début
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
          case 'all':
            dateDebut.setFullYear(2000);
            break;
        }

        const where = {
          type_entite: type,
          id_entite: parseInt(id),
          date_vue: { [models.Sequelize.Op.gte]: dateDebut }
        };

        // Statistiques générales
        const totalViews = await models.Vue.count({ where });
        const uniqueViewers = await models.Vue.findOne({
          attributes: [
            [models.Vue.sequelize.fn('COUNT', models.Vue.sequelize.literal('DISTINCT COALESCE(id_user, session_id)')), 'count']
          ],
          where
        });

        // Durée moyenne de vue
        const avgDuration = await models.Vue.findOne({
          attributes: [
            [models.Vue.sequelize.fn('AVG', models.Vue.sequelize.col('duree_secondes')), 'avg']
          ],
          where: {
            ...where,
            duree_secondes: { [models.Sequelize.Op.ne]: null }
          }
        });

        // Sources de trafic
        const sources = await models.Vue.findAll({
          attributes: [
            'source',
            [models.Vue.sequelize.fn('COUNT', '*'), 'count']
          ],
          where,
          group: ['source'],
          order: [[models.Vue.sequelize.literal('count'), 'DESC']]
        });

        // Évolution temporelle
        const evolution = await models.Vue.findAll({
          attributes: [
            [models.Vue.sequelize.fn('DATE', models.Vue.sequelize.col('date_vue')), 'date'],
            [models.Vue.sequelize.fn('COUNT', '*'), 'views'],
            [models.Vue.sequelize.fn('COUNT', models.Vue.sequelize.literal('DISTINCT COALESCE(id_user, session_id)')), 'unique_viewers']
          ],
          where,
          group: [models.Vue.sequelize.fn('DATE', models.Vue.sequelize.col('date_vue'))],
          order: [[models.Vue.sequelize.fn('DATE', models.Vue.sequelize.col('date_vue')), 'ASC']]
        });

        // Heures de pointe
        const peakHours = await models.Vue.findAll({
          attributes: [
            [models.Vue.sequelize.fn('HOUR', models.Vue.sequelize.col('date_vue')), 'hour'],
            [models.Vue.sequelize.fn('COUNT', '*'), 'count']
          ],
          where,
          group: [models.Vue.sequelize.fn('HOUR', models.Vue.sequelize.col('date_vue'))],
          order: [[models.Vue.sequelize.fn('HOUR', models.Vue.sequelize.col('date_vue')), 'ASC']]
        });

        res.json({
          success: true,
          data: {
            entity: { type, id: parseInt(id) },
            periode,
            metrics: {
              totalViews,
              uniqueViewers: uniqueViewers?.dataValues?.count || 0,
              averageDuration: avgDuration?.dataValues?.avg || 0,
              bounceRate: totalViews > 0 ? 
                ((await models.Vue.count({ where: { ...where, duree_secondes: { [models.Sequelize.Op.lt]: 10 } } }) / totalViews) * 100).toFixed(2) : 0
            },
            sources,
            evolution,
            peakHours
          }
        });
      } catch (error) {
        console.error('Erreur analytics entité:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la génération des analytics'
        });
      }
    }
  );

  // Export des données de tracking
  router.get('/tracking/export',
    authenticate,
    requireAdmin,
    async (req, res) => {
      try {
        const { format = 'json', type, dateDebut, dateFin, limit = 1000 } = req.query;
        
        const where = {};
        if (type) where.type_entite = type;
        if (dateDebut || dateFin) {
          where.date_vue = {};
          if (dateDebut) where.date_vue[models.Sequelize.Op.gte] = new Date(dateDebut);
          if (dateFin) where.date_vue[models.Sequelize.Op.lte] = new Date(dateFin);
        }

        const vues = await models.Vue.findAll({
          where,
          include: [
            { 
              model: models.User, 
              attributes: ['username', 'email'],
              required: false
            }
          ],
          order: [['date_vue', 'DESC']],
          limit: parseInt(limit)
        });

        res.json({
          success: true,
          count: vues.length,
          format,
          data: vues
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

module.exports = initTrackingRoutes;