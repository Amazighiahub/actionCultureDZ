// routes/trackingRoutes.js
const express = require('express');
const router = express.Router();
const VueController = require('../controllers/vueController');
const { viewLimiter } = require('../middlewares/rateLimitMiddleware');

// Factory function qui reçoit les modèles et middlewares
const initTrackingRoutes = (models, authMiddleware) => {
  // ========================================================================
  // INITIALISATION DU CONTRÔLEUR
  // ========================================================================
  const vueController = VueController;

  const { 
    authenticate, 
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
    viewLimiter,
    (req, res) => vueController.trackView(req, res)
  );

  // Enregistrer une vue pour une entité spécifique
  router.post('/:type/:id/view',
    optionalAuth,
    viewLimiter,
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
        const { periode = '7j' } = req.query;
        // Borné à 50 (sans borne, ?limit=100000 regroupait toute la table des vues)
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
        const Op = models.Sequelize.Op;
        
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
          limit
        });

        // Enrichir (contenus publiés seulement) avec les données des entités
        const entityIds = popular.map(p => p.dataValues.id_entite);
        let entities = [];

        switch (type) {
          case 'oeuvre':
            entities = await models.Oeuvre.findAll({
              where: { id_oeuvre: entityIds, statut: 'publie' },
              attributes: ['id_oeuvre', 'titre']
            });
            break;
          case 'evenement':
            entities = await models.Evenement.findAll({
              where: { id_evenement: entityIds, statut: { [Op.notIn]: ['brouillon', 'en_attente'] } },
              attributes: ['id_evenement', 'nom_evenement', 'date_debut', 'image_url']
            });
            break;
          case 'lieu':
            entities = await models.Lieu.findAll({
              where: { id_lieu: entityIds, statut: 'publie' },
              attributes: ['id_lieu', 'nom']
            });
            break;
          case 'artisanat':
            entities = await models.Artisanat.findAll({
              where: { id_artisanat: entityIds },
              attributes: ['id_artisanat', 'id_oeuvre'],
              include: [{ model: models.Oeuvre, attributes: [], where: { statut: 'publie' }, required: true }]
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
        }).filter(r => r.entity);

        res.json({
          success: true,
          data: results,
          params: { type, limit, periode }
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

  // (Routes d'admin /analytics/* et /export retirées : jamais appelées par le site, et cassées —
  // elles lisaient les colonnes « source » et « username », qui n'existent pas.)

  return router;
};

module.exports = initTrackingRoutes;