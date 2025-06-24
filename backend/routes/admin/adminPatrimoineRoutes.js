// routes/admin/adminPatrimoineRoutes.js - VERSION CORRIGÉE
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');

const initAdminPatrimoineRoutes = (models) => {
  console.log('🚀 Initialisation adminPatrimoineRoutes...');
  
  // Import des middlewares - COPIÉ EXACTEMENT DE adminOeuvresRoutes
  const authMiddleware = require('../../middlewares/authMiddleware')(models);
  const validationMiddleware = require('../../middlewares/validationMiddleware');
  const auditMiddleware = require('../../middlewares/auditMiddleware');
  const { body, query, param } = require('express-validator');

  // Toutes les routes nécessitent l'authentification admin
  router.use(authMiddleware.authenticate);
  router.use(authMiddleware.requireAdmin);

  // ==========================================
  // ROUTES STATIQUES D'ABORD
  // ==========================================

  // GET /api/admin/patrimoine - Liste des sites patrimoniaux
  router.get('/',
    [
      query('page').optional().isInt({ min: 1 }).withMessage('Page invalide'),
      query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite invalide'),
      query('typeLieu').optional().isString().withMessage('Type de lieu invalide'),
      query('wilaya').optional().isInt({ min: 1, max: 58 }).withMessage('Wilaya invalide'),
      query('search').optional().isString().withMessage('Recherche invalide')
    ],
    validationMiddleware.handleValidationErrors,
    async (req, res) => {
      try {
        const { 
          page = 1, 
          limit = 10, 
          typeLieu, 
          wilaya,
          search
        } = req.query;
        
        const offset = (page - 1) * limit;
        
        if (!models.Lieu) {
          return res.json({
            success: true,
            data: {
              items: [],
              pagination: {
                total: 0,
                page: parseInt(page),
                pages: 0,
                limit: parseInt(limit)
              }
            }
          });
        }
        
        // Construire les conditions
        const where = {};
        if (typeLieu) where.typeLieu = typeLieu;
        if (wilaya) where.wilayaId = parseInt(wilaya);
        if (search) {
          where[Op.or] = [
            { nom: { [Op.like]: `%${search}%` } },
            { adresse: { [Op.like]: `%${search}%` } }
          ];
        }
        
        const lieux = await models.Lieu.findAndCountAll({
          where,
          include: [
            {
              model: models.Wilaya,
              attributes: ['id_wilaya', 'nom'],
              required: false
            },
            {
              model: models.DetailLieu,
              attributes: ['id_detailLieu', 'description', 'histoire', 'horaires', 'noteMoyenne'],
              required: false,
              include: [
                {
                  model: models.Service,
                  attributes: ['id', 'nom'],
                  required: false
                }
              ]
            },
            {
              model: models.LieuMedia,
              where: { type: 'image' },
              required: false,
              limit: 1
            }
          ],
          limit: parseInt(limit),
          offset: parseInt(offset),
          order: [['id_lieu', 'DESC']],
          distinct: true
        });
        
        res.json({
          success: true,
          data: {
            items: lieux.rows,
            pagination: {
              total: lieux.count,
              page: parseInt(page),
              pages: Math.ceil(lieux.count / limit),
              limit: parseInt(limit)
            }
          }
        });
      } catch (error) {
        console.error('❌ Erreur liste patrimoine:', error);
        res.status(500).json({
          success: false,
          error: 'Erreur lors de la récupération des sites patrimoniaux',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    }
  );

  // GET /api/admin/patrimoine/types - Liste des types de lieux
  router.get('/types',
    async (req, res) => {
      try {
        if (!models.Lieu) {
          return res.json({
            success: true,
            data: ['Wilaya', 'Daira', 'Commune'] // Valeurs par défaut de l'ENUM
          });
        }
        
        // Récupérer les valeurs de l'ENUM depuis le modèle
        const typeEnum = models.Lieu.rawAttributes.typeLieu.values || ['Wilaya', 'Daira', 'Commune'];
        
        res.json({
          success: true,
          data: typeEnum
        });
      } catch (error) {
        console.error('Erreur liste types:', error);
        res.status(500).json({
          success: false,
          error: 'Erreur lors de la récupération des types'
        });
      }
    }
  );

 
    // GET /api/admin/patrimoine/statistics - Statistiques (pour compatibilité frontend)
  router.get('/statistics',
    async (req, res) => {
      try {
        if (!models.Lieu) {
          return res.json({
            success: true,
            data: {
              total: 0,
              byType: {},
              monuments: 0,
              vestiges: 0
            }
          });
        }
        
        const [total, byType, monuments, vestiges] = await Promise.all([
          models.Lieu.count(),
          models.Lieu.findAll({
            attributes: [
              'typeLieu',
              [models.sequelize.fn('COUNT', '*'), 'count']
            ],
            group: ['typeLieu'],
            raw: true
          }),
          models.Monument ? models.Monument.count() : 0,
          models.Vestige ? models.Vestige.count() : 0
        ]);
        
        res.json({
          success: true,
          data: {
            total,
            byType: byType.reduce((acc, item) => {
              acc[item.typeLieu] = parseInt(item.count);
              return acc;
            }, {}),
            monuments,
            vestiges
          }
        });
      } catch (error) {
        console.error('Erreur stats:', error);
        res.status(500).json({
          success: false,
          error: 'Erreur lors du calcul des statistiques'
        });
      }
    }
  );
  // POST /api/admin/patrimoine - Créer un site
  router.post('/',
    [
      body('nom').trim().notEmpty().withMessage('Nom requis'),
      body('adresse').trim().notEmpty().withMessage('Adresse requise'),
      body('typeLieu').isIn(['Wilaya', 'Daira', 'Commune']).withMessage('Type invalide'),
      body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude invalide'),
      body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude invalide'),
      body('wilayaId').optional().isInt().withMessage('Wilaya invalide')
    ],
    validationMiddleware.handleValidationErrors,
    auditMiddleware.logAction('CREATE_PATRIMOINE'),
    async (req, res) => {
      const t = await models.sequelize.transaction();
      
      try {
        // 1. Créer le lieu
        const lieu = await models.Lieu.create({
          nom: req.body.nom,
          adresse: req.body.adresse,
          typeLieu: req.body.typeLieu,
          latitude: req.body.latitude,
          longitude: req.body.longitude,
          wilayaId: req.body.wilayaId,
          dairaId: req.body.dairaId,
          communeId: req.body.communeId
        }, { transaction: t });
        
        // 2. Créer les détails si fournis
        if (req.body.details) {
          const detailLieu = await models.DetailLieu.create({
            id_lieu: lieu.id_lieu,
            description: req.body.details.description,
            horaires: req.body.details.horaires,
            histoire: req.body.details.histoire,
            noteMoyenne: 0
          }, { transaction: t });
          
          // 3. Créer les services SI détails créés
          if (req.body.services && Array.isArray(req.body.services)) {
            for (const serviceName of req.body.services) {
              await models.Service.create({
                id_detailLieu: detailLieu.id_detailLieu, // PAS id_lieu !
                nom: serviceName
              }, { transaction: t });
            }
          }
          
          // 4. Créer monument OU vestige si fourni
          if (req.body.monument) {
            await models.Monument.create({
              detailLieuId: detailLieu.id_detailLieu,
              nom: req.body.monument.nom,
              description: req.body.monument.description,
              type: req.body.monument.type
            }, { transaction: t });
          } else if (req.body.vestige) {
            await models.Vestige.create({
              detailLieuId: detailLieu.id_detailLieu,
              nom: req.body.vestige.nom,
              description: req.body.vestige.description,
              type: req.body.vestige.type
            }, { transaction: t });
          }
        }
        
        await t.commit();
        
        // Recharger avec toutes les relations
        const lieuComplet = await models.Lieu.findByPk(lieu.id_lieu, {
          include: [
            { model: models.Wilaya },
            { 
              model: models.DetailLieu,
              include: [
                { model: models.Service },
                { model: models.Monument },
                { model: models.Vestige }
              ]
            }
          ]
        });
        
        res.status(201).json({
          success: true,
          message: 'Site patrimonial créé avec succès',
          data: lieuComplet
        });
      } catch (error) {
        await t.rollback();
        console.error('Erreur création:', error);
        res.status(500).json({
          success: false,
          error: 'Erreur lors de la création',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    }
  );

  // ==========================================
  // ROUTES AVEC PARAMÈTRES
  // ==========================================

  // GET /api/admin/patrimoine/:id
  router.get('/:id',
    param('id').isInt({ min: 1 }).withMessage('ID invalide'),
    validationMiddleware.handleValidationErrors,
    async (req, res) => {
      try {
        const lieu = await models.Lieu.findByPk(req.params.id, {
          include: [
            { model: models.Wilaya },
            { model: models.Daira },
            { model: models.Commune },
            { 
              model: models.DetailLieu,
              include: [
                { model: models.Service },
                { model: models.Monument },
                { model: models.Vestige }
              ]
            },
            { model: models.LieuMedia }
          ]
        });
        
        if (!lieu) {
          return res.status(404).json({
            success: false,
            error: 'Site non trouvé'
          });
        }
        
        res.json({
          success: true,
          data: lieu
        });
      } catch (error) {
        console.error('Erreur détail:', error);
        res.status(500).json({
          success: false,
          error: 'Erreur serveur'
        });
      }
    }
  );

  // PUT /api/admin/patrimoine/:id
  router.put('/:id',
    param('id').isInt({ min: 1 }).withMessage('ID invalide'),
    validationMiddleware.handleValidationErrors,
    auditMiddleware.logAction('UPDATE_PATRIMOINE'),
    async (req, res) => {
      const t = await models.sequelize.transaction();
      
      try {
        const lieu = await models.Lieu.findByPk(req.params.id);
        if (!lieu) {
          return res.status(404).json({
            success: false,
            error: 'Site non trouvé'
          });
        }
        
        // Mettre à jour le lieu
        await lieu.update({
          nom: req.body.nom || lieu.nom,
          adresse: req.body.adresse || lieu.adresse,
          typeLieu: req.body.typeLieu || lieu.typeLieu,
          latitude: req.body.latitude || lieu.latitude,
          longitude: req.body.longitude || lieu.longitude,
          wilayaId: req.body.wilayaId || lieu.wilayaId
        }, { transaction: t });
        
        // Mettre à jour les détails si fournis
        if (req.body.details) {
          const [detailLieu] = await models.DetailLieu.findOrCreate({
            where: { id_lieu: lieu.id_lieu },
            defaults: { id_lieu: lieu.id_lieu, noteMoyenne: 0 },
            transaction: t
          });
          
          await detailLieu.update(req.body.details, { transaction: t });
        }
        
        await t.commit();
        
        // Recharger
        await lieu.reload({
          include: [
            { model: models.DetailLieu }
          ]
        });
        
        res.json({
          success: true,
          message: 'Site mis à jour',
          data: lieu
        });
      } catch (error) {
        await t.rollback();
        console.error('Erreur update:', error);
        res.status(500).json({
          success: false,
          error: 'Erreur serveur'
        });
      }
    }
  );

  // DELETE /api/admin/patrimoine/:id
  router.delete('/:id',
    param('id').isInt({ min: 1 }).withMessage('ID invalide'),
    validationMiddleware.handleValidationErrors,
    auditMiddleware.logAction('DELETE_PATRIMOINE'),
    async (req, res) => {
      const t = await models.sequelize.transaction();
      
      try {
        const lieu = await models.Lieu.findByPk(req.params.id, {
          include: [{ model: models.DetailLieu }]
        });
        
        if (!lieu) {
          return res.status(404).json({
            success: false,
            error: 'Site non trouvé'
          });
        }
        
        // Supprimer dans l'ordre (à cause des contraintes)
        if (lieu.DetailLieu) {
          // Services
          await models.Service.destroy({
            where: { id_detailLieu: lieu.DetailLieu.id_detailLieu },
            transaction: t
          });
          
          // Monuments
          await models.Monument.destroy({
            where: { detailLieuId: lieu.DetailLieu.id_detailLieu },
            transaction: t
          });
          
          // Vestiges
          await models.Vestige.destroy({
            where: { detailLieuId: lieu.DetailLieu.id_detailLieu },
            transaction: t
          });
          
          // DetailLieu
          await lieu.DetailLieu.destroy({ transaction: t });
        }
        
        // LieuMedia
        await models.LieuMedia.destroy({
          where: { id_lieu: lieu.id_lieu },
          transaction: t
        });
        
        // Lieu
        await lieu.destroy({ transaction: t });
        
        await t.commit();
        
        res.json({
          success: true,
          message: 'Site supprimé avec succès'
        });
      } catch (error) {
        await t.rollback();
        console.error('Erreur delete:', error);
        res.status(500).json({
          success: false,
          error: 'Erreur serveur'
        });
      }
    }
  );

  console.log('✅ adminPatrimoineRoutes initialisé');
  return router;
};

module.exports = initAdminPatrimoineRoutes;