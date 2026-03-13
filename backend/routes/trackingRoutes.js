// routes/trackingRoutes.js
const express = require('express');
const router = express.Router();
const VueController = require('../controllers/vueController');

// Factory function qui reçoit les modèles et middlewares
const initTrackingRoutes = (models, authMiddleware) => {
  // ========================================================================
  // INITIALISATION DU CONTRÔLEUR
  // ========================================================================
  const vueController = new VueController();

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
        message: req.t ? req.t('validation.invalidEntityType') : 'Invalid entity type'
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
          message: req.t ? req.t('common.notFound') : `${type} not found`
        });
      }

      req.entity = entity;
      next();
    } catch (error) {
      console.error(req.t ? req.t('error.checkingEntity') : 'Error checking entity:', error);
      res.status(500).json({
        success: false,
        message: req.t ? req.t('common.serverError') : 'Server error'
      });
    }
  };

  // ========================================================================
  // ROUTES PUBLIQUES - VISITEURS
  // ========================================================================

  // Enregistrer une vue (authentification optionnelle)
  router.post('/view',
    optionalAuth,
    (req, res) => vueController.trackView(req, res)
  );

  // Enregistrer une vue pour une entité spécifique
  router.post('/:type/:id/view',
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
  router.put('/view/:id',
    optionalAuth,
    (req, res) => vueController.updateViewDuration(req, res)
  );

  // Obtenir les statistiques publiques d'une entité
  router.get('/stats/:type/:id',
    validateEntityType,
    (req, res) => vueController.getViewStats(req, res)
  );

  // Obtenir le nombre de vues pour une entité
  router.get('/:type/:id/count',
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
          message: req.t ? req.t('common.serverError') : 'Server error'
        });
      }
    }
  );

  // Obtenir les entités les plus vues (top populaire)
  router.get('/popular/:type',
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
          message: req.t ? req.t('common.serverError') : 'Server error'
        });
      }
    }
  );

  // ========================================================================
  // ROUTES PROTÉGÉES - UTILISATEURS AUTHENTIFIÉS
  // ========================================================================

  // Obtenir l'historique de mes vues
  router.get('/mes-vues',
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
          message: req.t ? req.t('common.serverError') : 'Server error'
        });
      }
    }
  );

  // Supprimer mon historique de vues
  router.delete('/mes-vues',
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
          message: req.t ? req.t('vue.historyDeleted', { count: deleted }) : `${deleted} view(s) deleted`
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: req.t ? req.t('common.serverError') : 'Server error'
        });
      }
    }
  );

  // ========================================================================
  // ROUTES ADMIN - ANALYTICS
  // ========================================================================

  // Dashboard analytics global
  router.get('/analytics/dashboard',
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

        const dateWhere = { date_vue: { [models.Sequelize.Op.gte]: dateDebut } };
        const seq = models.Vue.sequelize;
        const countFn = seq.fn('COUNT', '*');
        const dateFn = seq.fn('DATE', seq.col('date_vue'));

        const [totalViews, uniqueVisitors, viewsByType, viewsEvolution, topSources] = await Promise.all([
          models.Vue.count({ where: dateWhere }),
          models.Vue.findOne({
            attributes: [[seq.fn('COUNT', seq.literal('DISTINCT COALESCE(id_user, session_id)')), 'count']],
            where: dateWhere
          }),
          models.Vue.findAll({
            attributes: ['type_entite', [countFn, 'count']],
            where: dateWhere, group: ['type_entite']
          }),
          models.Vue.findAll({
            attributes: [[dateFn, 'date'], [countFn, 'views']],
            where: dateWhere,
            group: [dateFn], order: [[dateFn, 'ASC']]
          }),
          models.Vue.findAll({
            attributes: ['source', [countFn, 'count']],
            where: { ...dateWhere, source: { [models.Sequelize.Op.ne]: null } },
            group: ['source'], order: [[seq.literal('count'), 'DESC']], limit: 10
          })
        ]);

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
          message: req.t ? req.t('common.serverError') : 'Server error'
        });
      }
    }
  );

  // Analytics détaillées pour une entité
  router.get('/analytics/:type/:id',
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
          message: req.t ? req.t('common.serverError') : 'Server error'
        });
      }
    }
  );

  // Export des données de tracking
  router.get('/export',
    authenticate,
    requireAdmin,
    async (req, res) => {
      try {
        const { format = 'json', type, dateDebut, dateFin, limit: rawLimit = 1000 } = req.query;
        const limit = Math.min(parseInt(rawLimit) || 1000, 10000);
        
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
          message: req.t ? req.t('common.serverError') : 'Server error'
        });
      }
    }
  );

  return router;
};

module.exports = initTrackingRoutes;