// routes/admin/adminOeuvresRoutes.js
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');

const initAdminOeuvresRoutes = (models) => {
  // CORRECTION: Utiliser le bon chemin relatif (../middlewares/ au lieu de ../../middlewares/)
  const authMiddleware = require('../../middlewares/authMiddleware')(models);
  const validationMiddleware = require('../../middlewares/validationMiddleware');
  const auditMiddleware = require('../../middlewares/auditMiddleware');
  const { body, query, param } = require('express-validator');

  // Toutes les routes nécessitent l'authentification admin
  router.use(authMiddleware.authenticate);
  router.use(authMiddleware.requireAdmin);

  // GET /api/admin/oeuvres - Liste des œuvres avec pagination et filtres
  router.get('/',
    [
      query('page').optional().isInt({ min: 1 }).withMessage('Page invalide'),
      query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite invalide'),
      query('statut').optional().isIn(['en_attente', 'publie', 'rejete', 'archive']).withMessage('Statut invalide'),
      query('type_oeuvre').optional().isString().withMessage('Type œuvre invalide'),
      query('search').optional().isString().withMessage('Recherche invalide'),
      query('startDate').optional().isISO8601().withMessage('Date début invalide'),
      query('endDate').optional().isISO8601().withMessage('Date fin invalide')
    ],
    validationMiddleware.handleValidationErrors,
    async (req, res) => {
      try {
        const { 
          page = 1, 
          limit = 10, 
          statut, 
          type_oeuvre, 
          search, 
          startDate, 
          endDate 
        } = req.query;
        
        const offset = (page - 1) * limit;
        
        // Construire les conditions
        const where = {};
        if (statut) where.statut = statut;
        if (type_oeuvre) where.type_oeuvre = type_oeuvre;
        if (search) {
          where[Op.or] = [
            { titre: { [Op.like]: `%${search}%` } },
            { description: { [Op.like]: `%${search}%` } }
          ];
        }
        if (startDate && endDate) {
          where.date_creation = {
            [Op.between]: [new Date(startDate), new Date(endDate)]
          };
        }
        
        const oeuvres = await models.Oeuvre.findAndCountAll({
          where,
          include: [
            {
              model: models.User,
              as: 'Saiseur',
              attributes: ['id_user', 'nom', 'prenom', 'email']
            },
            {
              model: models.User,
              as: 'Validateur',
              attributes: ['id_user', 'nom', 'prenom']
            },
            {
              model: models.Media,
              limit: 1,
              attributes: ['url', 'type_media']
            }
          ],
          limit: parseInt(limit),
          offset: parseInt(offset),
          order: [['date_creation', 'DESC']],
          distinct: true
        });
        
        res.json({
          success: true,
          data: {
            items: oeuvres.rows,
            pagination: {
              total: oeuvres.count,
              page: parseInt(page),
              pages: Math.ceil(oeuvres.count / limit),
              limit: parseInt(limit),
              hasNext: page < Math.ceil(oeuvres.count / limit),
              hasPrev: page > 1
            }
          }
        });
      } catch (error) {
        console.error('Erreur liste œuvres admin:', error);
        res.status(500).json({
          success: false,
          error: 'Erreur lors de la récupération des œuvres'
        });
      }
    }
  );

  // GET /api/admin/oeuvres/:id - Détails d'une œuvre
  router.get('/:id',
    param('id').isInt({ min: 1 }).withMessage('ID invalide'),
    validationMiddleware.handleValidationErrors,
    async (req, res) => {
      try {
        const oeuvre = await models.Oeuvre.findByPk(req.params.id, {
          include: [
            {
              model: models.User,
              as: 'Saiseur',
              attributes: { exclude: ['password'] }
            },
            {
              model: models.User,
              as: 'Validateur',
              attributes: ['id_user', 'nom', 'prenom']
            },
            {
              model: models.Media
            },
            {
              model: models.Commentaire,
              include: [{
                model: models.User,
                attributes: ['nom', 'prenom']
              }],
              limit: 10,
              order: [['date_creation', 'DESC']]
            }
          ]
        });
        
        if (!oeuvre) {
          return res.status(404).json({
            success: false,
            error: 'Œuvre non trouvée'
          });
        }
        
        res.json({
          success: true,
          data: oeuvre
        });
      } catch (error) {
        console.error('Erreur détails œuvre:', error);
        res.status(500).json({
          success: false,
          error: 'Erreur lors de la récupération de l\'œuvre'
        });
      }
    }
  );

  // PUT /api/admin/oeuvres/:id - Modifier une œuvre
  router.put('/:id',
    param('id').isInt({ min: 1 }).withMessage('ID invalide'),
    [
      body('titre').optional().trim().notEmpty().withMessage('Titre invalide'),
      body('description').optional().trim().notEmpty().withMessage('Description invalide'),
      body('type_oeuvre').optional().isString().withMessage('Type œuvre invalide'),
      body('statut').optional().isIn(['en_attente', 'publie', 'rejete', 'archive']).withMessage('Statut invalide'),
      body('tags').optional().isArray().withMessage('Tags invalides'),
      body('metadata').optional().isObject().withMessage('Metadata invalide')
    ],
    validationMiddleware.handleValidationErrors,
    auditMiddleware.logAction('UPDATE_OEUVRE'),
    async (req, res) => {
      try {
        const oeuvre = await models.Oeuvre.findByPk(req.params.id);
        
        if (!oeuvre) {
          return res.status(404).json({
            success: false,
            error: 'Œuvre non trouvée'
          });
        }
        
        await oeuvre.update(req.body);
        
        await oeuvre.reload({
          include: [
            {
              model: models.User,
              as: 'Saiseur',
              attributes: ['id_user', 'nom', 'prenom']
            },
            {
              model: models.Media
            }
          ]
        });
        
        res.json({
          success: true,
          message: 'Œuvre mise à jour avec succès',
          data: oeuvre
        });
      } catch (error) {
        console.error('Erreur mise à jour œuvre:', error);
        res.status(500).json({
          success: false,
          error: 'Erreur lors de la mise à jour de l\'œuvre'
        });
      }
    }
  );

  // DELETE /api/admin/oeuvres/:id - Supprimer une œuvre
  router.delete('/:id',
    param('id').isInt({ min: 1 }).withMessage('ID invalide'),
    validationMiddleware.handleValidationErrors,
    auditMiddleware.logAction('DELETE_OEUVRE'),
    async (req, res) => {
      try {
        const oeuvre = await models.Oeuvre.findByPk(req.params.id);
        
        if (!oeuvre) {
          return res.status(404).json({
            success: false,
            error: 'Œuvre non trouvée'
          });
        }
        
        // Supprimer les médias associés
        await models.Media.destroy({
          where: { id_oeuvre: req.params.id }
        });
        
        // Supprimer les commentaires associés
        await models.Commentaire.destroy({
          where: { 
            id_entite: req.params.id,
            type_entite: 'oeuvre'
          }
        });
        
        // Supprimer l'œuvre
        await oeuvre.destroy();
        
        res.json({
          success: true,
          message: 'Œuvre supprimée avec succès'
        });
      } catch (error) {
        console.error('Erreur suppression œuvre:', error);
        res.status(500).json({
          success: false,
          error: 'Erreur lors de la suppression de l\'œuvre'
        });
      }
    }
  );
// POST /api/admin/oeuvres - Créer une nouvelle œuvre
router.post('/',
  [
    body('titre').trim().notEmpty().withMessage('Titre requis'),
    body('description').trim().notEmpty().withMessage('Description requise'),
    body('type_oeuvre').trim().notEmpty().withMessage('Type œuvre requis'),
    body('statut').optional().isIn(['en_attente', 'publie', 'rejete', 'archive']).withMessage('Statut invalide'),
    body('tags').optional().isArray().withMessage('Tags invalides'),
    body('metadata').optional().isObject().withMessage('Metadata invalide'),
    body('saisi_par').optional().isInt({ min: 1 }).withMessage('ID utilisateur invalide')
  ],
  validationMiddleware.handleValidationErrors,
  auditMiddleware.logAction('CREATE_OEUVRE'),
  async (req, res) => {
    try {
      // Créer l'œuvre avec l'ID de l'admin comme saisisseur par défaut
      const oeuvreData = {
        ...req.body,
        saisi_par: req.body.saisi_par || req.user.id_user,
        statut: req.body.statut || 'en_attente',
        date_creation: new Date()
      };
      
      const oeuvre = await models.Oeuvre.create(oeuvreData);
      
      // Recharger avec les associations
      await oeuvre.reload({
        include: [
          {
            model: models.User,
            as: 'Saiseur',
            attributes: ['id_user', 'nom', 'prenom', 'email']
          }
        ]
      });
      
      res.status(201).json({
        success: true,
        message: 'Œuvre créée avec succès',
        data: oeuvre
      });
    } catch (error) {
      console.error('Erreur création œuvre:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la création de l\'œuvre',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);
  // POST /api/admin/oeuvres/:id/validate - Valider/Rejeter une œuvre
  router.post('/:id/validate',
    param('id').isInt({ min: 1 }).withMessage('ID invalide'),
    [
      body('valide').isBoolean().withMessage('Valeur de validation invalide'),
      body('raison_rejet').optional().isString().withMessage('Raison invalide')
    ],
    validationMiddleware.handleValidationErrors,
    auditMiddleware.logAction('VALIDATE_OEUVRE'),
    async (req, res) => {
      try {
        const oeuvre = await models.Oeuvre.findByPk(req.params.id);
        
        if (!oeuvre) {
          return res.status(404).json({
            success: false,
            error: 'Œuvre non trouvée'
          });
        }
        
        const updateData = {
          statut: req.body.valide ? 'publie' : 'rejete',
          date_validation: new Date(),
          validateur_id: req.user.id_user
        };
        
        if (!req.body.valide && req.body.raison_rejet) {
          updateData.raison_rejet = req.body.raison_rejet;
        }
        
        await oeuvre.update(updateData);
        
        res.json({
          success: true,
          message: req.body.valide ? 'Œuvre validée' : 'Œuvre rejetée',
          data: oeuvre
        });
      } catch (error) {
        console.error('Erreur validation œuvre:', error);
        res.status(500).json({
          success: false,
          error: 'Erreur lors de la validation de l\'œuvre'
        });
      }
    }
  );

  // POST /api/admin/oeuvres/bulk-action - Actions en masse
  router.post('/bulk-action',
    [
      body('oeuvre_ids').isArray({ min: 1 }).withMessage('Liste d\'œuvres requise'),
      body('oeuvre_ids.*').isInt({ min: 1 }).withMessage('ID œuvre invalide'),
      body('action').isIn(['publish', 'archive', 'delete']).withMessage('Action invalide')
    ],
    validationMiddleware.handleValidationErrors,
    auditMiddleware.logAction('BULK_OEUVRE_ACTION'),
    async (req, res) => {
      try {
        const { oeuvre_ids, action } = req.body;
        let updatedCount = 0;
        
        switch (action) {
          case 'publish':
            updatedCount = await models.Oeuvre.update(
              { statut: 'publie' },
              { where: { id_oeuvre: oeuvre_ids } }
            );
            break;
            
          case 'archive':
            updatedCount = await models.Oeuvre.update(
              { statut: 'archive' },
              { where: { id_oeuvre: oeuvre_ids } }
            );
            break;
            
          case 'delete':
            // Supprimer les médias et commentaires d'abord
            await models.Media.destroy({
              where: { id_oeuvre: oeuvre_ids }
            });
            await models.Commentaire.destroy({
              where: { 
                id_entite: oeuvre_ids,
                type_entite: 'oeuvre'
              }
            });
            updatedCount = await models.Oeuvre.destroy({
              where: { id_oeuvre: oeuvre_ids }
            });
            break;
        }
        
        res.json({
          success: true,
          message: `${updatedCount} œuvres modifiées`,
          data: { count: updatedCount }
        });
      } catch (error) {
        console.error('Erreur action en masse:', error);
        res.status(500).json({
          success: false,
          error: 'Erreur lors de l\'action en masse'
        });
      }
    }
  );

  // GET /api/admin/oeuvres/stats/summary - Statistiques résumées
  router.get('/stats/summary',
    async (req, res) => {
      try {
        const [
          total,
          enAttente,
          publiees,
          rejetees,
          archivees,
          parType
        ] = await Promise.all([
          models.Oeuvre.count(),
          models.Oeuvre.count({ where: { statut: 'en_attente' } }),
          models.Oeuvre.count({ where: { statut: 'publie' } }),
          models.Oeuvre.count({ where: { statut: 'rejete' } }),
          models.Oeuvre.count({ where: { statut: 'archive' } }),
          models.Oeuvre.findAll({
            attributes: [
              'type_oeuvre',
              [models.sequelize.fn('COUNT', '*'), 'count']
            ],
            group: ['type_oeuvre'],
            raw: true
          })
        ]);
        
        res.json({
          success: true,
          data: {
            total,
            byStatus: {
              en_attente: enAttente,
              publie: publiees,
              rejete: rejetees,
              archive: archivees
            },
            byType: parType
          }
        });
      } catch (error) {
        console.error('Erreur stats œuvres:', error);
        res.status(500).json({
          success: false,
          error: 'Erreur lors du calcul des statistiques'
        });
      }
    }
  );

  return router;
};
module.exports = initAdminOeuvresRoutes;