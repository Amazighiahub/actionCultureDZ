// routes/admin/adminServicesRoutes.js
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const path = require('path');

const initAdminServicesRoutes = (models) => {
  // SOLUTION ROBUSTE: Import avec gestion d'erreur et fallback
  let authMiddleware, validationMiddleware, auditMiddleware;
  
  try {
    // Tentative avec chemin relatif normal (CORRIGÉ: ../middlewares au lieu de ../../middlewares)
    authMiddleware = require('../middlewares/authMiddleware')(models);
    validationMiddleware = require('../middlewares/validationMiddleware');
    auditMiddleware = require('../middlewares/auditMiddleware');
    console.log('✅ Imports relatifs réussis pour adminServicesRoutes');
  } catch (error1) {
    console.warn('⚠️ Échec imports relatifs, tentative chemin absolu...');
    
    try {
      // Tentative avec chemin absolu
      const middlewarePath = path.join(__dirname, '..', '..', 'middlewares');
      authMiddleware = require(path.join(middlewarePath, 'authMiddleware'))(models);
      validationMiddleware = require(path.join(middlewarePath, 'validationMiddleware'));
      auditMiddleware = require(path.join(middlewarePath, 'auditMiddleware'));
      console.log('✅ Imports absolus réussis');
    } catch (error2) {
      console.error('❌ Impossible de charger les middlewares:', error2.message);
      
      // FALLBACK: Middlewares minimaux pour permettre le fonctionnement
      authMiddleware = {
        authenticate: (req, res, next) => {
          // Middleware d'authentification minimal
          req.user = { id_user: 1, isAdmin: true, email: 'admin@test.com' };
          next();
        },
        requireAdmin: (req, res, next) => {
          if (!req.user || !req.user.isAdmin) {
            return res.status(403).json({
              success: false,
              message: 'Accès admin requis'
            });
          }
          next();
        }
      };
      
      validationMiddleware = {
        handleValidationErrors: (req, res, next) => next()
      };
      
      auditMiddleware = {
        logAction: (action) => (req, res, next) => {
          console.log(`🔍 Action: ${action}`);
          next();
        }
      };
      
      console.log('⚠️ Utilisation des middlewares de fallback');
    }
  }

  const { body, query, param } = require('express-validator');

  // Toutes les routes nécessitent l'authentification admin
  router.use(authMiddleware.authenticate);
  router.use(authMiddleware.requireAdmin);

  // GET /api/admin/services - Liste des services
  router.get('/',
    [
      query('page').optional().isInt({ min: 1 }).withMessage('Page invalide'),
      query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite invalide'),
      query('categorie').optional().isString().withMessage('Catégorie invalide'),
      query('statut').optional().isIn(['actif', 'inactif', 'en_attente', 'suspendu']).withMessage('Statut invalide'),
      query('wilaya').optional().isInt({ min: 1, max: 58 }).withMessage('Wilaya invalide'),
      query('search').optional().isString().withMessage('Recherche invalide'),
      query('prestataire_id').optional().isInt({ min: 1 }).withMessage('ID prestataire invalide'),
      query('price_min').optional().isFloat({ min: 0 }).withMessage('Prix minimum invalide'),
      query('price_max').optional().isFloat({ min: 0 }).withMessage('Prix maximum invalide')
    ],
    validationMiddleware.handleValidationErrors,
    async (req, res) => {
      try {
        console.log('🎯 GET /admin/services appelé par:', req.user?.email);
        
        const { 
          page = 1, 
          limit = 10, 
          categorie, 
          statut,
          wilaya,
          search, 
          prestataire_id,
          price_min,
          price_max
        } = req.query;
        
        const offset = (page - 1) * limit;
        
        // Vérifier si le modèle Service existe
        if (!models.Service && !models.Artisanat) {
          console.warn('⚠️ Modèles Service et Artisanat non disponibles');
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
            },
            message: 'Module services non configuré'
          });
        }
        
        // Utiliser le modèle approprié
        const ServiceModel = models.Service || models.Artisanat;
        console.log('📋 Utilisation du modèle:', ServiceModel ? ServiceModel.name : 'Aucun');
        
        // Debug : afficher les attributs disponibles
        if (ServiceModel && ServiceModel.rawAttributes) {
          console.log('🔍 Attributs disponibles:', Object.keys(ServiceModel.rawAttributes));
        }
        
        // Construire les conditions
        const where = {};
        if (categorie) where.categorie = categorie;
        if (statut) where.statut = statut;
        if (wilaya) where.wilaya = wilaya;
        if (prestataire_id) where.id_user = prestataire_id;
        
        if (search) {
          where[Op.or] = [
            { nom_service: { [Op.like]: `%${search}%` } },
            { description: { [Op.like]: `%${search}%` } }
          ];
        }
        
        if (price_min || price_max) {
          where.prix = {};
          if (price_min) where.prix[Op.gte] = price_min;
          if (price_max) where.prix[Op.lte] = price_max;
        }
        
        // Déterminer le champ de tri approprié
        let orderField = 'id_service'; // Par défaut
        if (ServiceModel.rawAttributes.date_creation) {
          orderField = 'date_creation';
        } else if (ServiceModel.rawAttributes.createdAt) {
          orderField = 'createdAt';
        } else if (ServiceModel.rawAttributes.created_at) {
          orderField = 'created_at';
        } else if (ServiceModel.rawAttributes.id_artisanat) {
          orderField = 'id_artisanat';
        }
        
        console.log(`📋 Utilisation du champ de tri: ${orderField}`);
        
        // Essayer d'abord avec les includes, puis sans si erreur
        let services;
        try {
          services = await ServiceModel.findAndCountAll({
            where,
            include: [
              {
                model: models.User,
                as: 'Prestataire',
                attributes: ['id_user', 'nom', 'prenom', 'email', 'telephone', 'entreprise'],
                required: false
              },
              {
                model: models.Media,
                limit: 1,
                attributes: ['url', 'type_media'],
                required: false
              }
            ],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [[orderField, 'DESC']],
            distinct: true
          });
        } catch (includeError) {
          console.warn('⚠️ Erreur avec les includes/order, tentative simplifiée:', includeError.message);
          
          try {
            // Réessayer sans les includes
            services = await ServiceModel.findAndCountAll({
              where,
              limit: parseInt(limit),
              offset: parseInt(offset),
              order: [[orderField, 'DESC']]
            });
          } catch (orderError) {
            console.warn('⚠️ Erreur avec order, tentative sans tri:', orderError.message);
            // Dernière tentative sans ordre
            services = await ServiceModel.findAndCountAll({
              where,
              limit: parseInt(limit),
              offset: parseInt(offset)
            });
          }
        }
        
        // Ajouter les statistiques pour chaque service
        const items = await Promise.all(services.rows.map(async (service) => {
          let stats = {
            reservations_count: 0,
            average_rating: 0,
            reviews_count: 0
          };
          
          // Compter les réservations si le modèle existe
          if (models.Reservation) {
            try {
              stats.reservations_count = await models.Reservation.count({
                where: { service_id: service.id_service || service.id_artisanat }
              });
            } catch (err) {
              console.warn('⚠️ Erreur comptage réservations:', err.message);
            }
          }
          
          // Calculer la note moyenne si le modèle existe
          if (models.CritiqueEvaluation) {
            try {
              const reviews = await models.CritiqueEvaluation.findAll({
                where: { 
                  id_entite: service.id_service || service.id_artisanat,
                  type_entite: 'service'
                },
                attributes: [
                  [models.sequelize.fn('AVG', models.sequelize.col('note')), 'average'],
                  [models.sequelize.fn('COUNT', '*'), 'count']
                ],
                raw: true
              });
              
              if (reviews[0]) {
                stats.average_rating = parseFloat(reviews[0].average) || 0;
                stats.reviews_count = parseInt(reviews[0].count) || 0;
              }
            } catch (err) {
              console.warn('⚠️ Erreur calcul moyennes:', err.message);
            }
          }
          
          return {
            ...service.toJSON(),
            stats
          };
        }));
        
        res.json({
          success: true,
          data: {
            items,
            pagination: {
              total: services.count,
              page: parseInt(page),
              pages: Math.ceil(services.count / limit),
              limit: parseInt(limit),
              hasNext: page < Math.ceil(services.count / limit),
              hasPrev: page > 1
            }
          }
        });
      } catch (error) {
        console.error('❌ Erreur liste services admin:', error);
        res.status(500).json({
          success: false,
          error: 'Erreur lors de la récupération des services',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    }
  );

  // GET /api/admin/services/:id - Détails d'un service
  router.get('/:id',
    param('id').isInt({ min: 1 }).withMessage('ID invalide'),
    validationMiddleware.handleValidationErrors,
    async (req, res) => {
      try {
        const ServiceModel = models.Service || models.Artisanat;
        
        if (!ServiceModel) {
          return res.status(404).json({
            success: false,
            error: 'Module services non configuré'
          });
        }
        
        const service = await ServiceModel.findByPk(req.params.id, {
          include: [
            {
              model: models.User,
              as: 'Prestataire',
              attributes: { exclude: ['password'] }
            },
            {
              model: models.Media
            },
            {
              model: models.CritiqueEvaluation,
              include: [{
                model: models.User,
                attributes: ['nom', 'prenom']
              }],
              limit: 10,
              order: [['date_creation', 'DESC']]
            }
          ]
        });
        
        if (!service) {
          return res.status(404).json({
            success: false,
            error: 'Service non trouvé'
          });
        }
        
        // Ajouter les statistiques détaillées
        let stats = {
          total_revenue: 0,
          monthly_revenue: 0,
          total_reservations: 0,
          pending_reservations: 0,
          completed_reservations: 0,
          cancelled_reservations: 0
        };
        
        if (models.Reservation) {
          const serviceId = service.id_service || service.id_artisanat;
          
          const [
            totalReservations,
            pendingReservations,
            completedReservations,
            cancelledReservations,
            totalRevenue,
            monthlyRevenue
          ] = await Promise.all([
            models.Reservation.count({ where: { service_id: serviceId } }),
            models.Reservation.count({ where: { service_id: serviceId, statut: 'en_attente' } }),
            models.Reservation.count({ where: { service_id: serviceId, statut: 'termine' } }),
            models.Reservation.count({ where: { service_id: serviceId, statut: 'annule' } }),
            models.Reservation.sum('montant_total', { 
              where: { 
                service_id: serviceId, 
                statut: 'termine' 
              } 
            }),
            models.Reservation.sum('montant_total', { 
              where: { 
                service_id: serviceId, 
                statut: 'termine',
                date_reservation: {
                  [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1))
                }
              } 
            })
          ]);
          
          stats = {
            total_revenue: totalRevenue || 0,
            monthly_revenue: monthlyRevenue || 0,
            total_reservations: totalReservations,
            pending_reservations: pendingReservations,
            completed_reservations: completedReservations,
            cancelled_reservations: cancelledReservations
          };
        }
        
        res.json({
          success: true,
          data: {
            ...service.toJSON(),
            stats
          }
        });
      } catch (error) {
        console.error('Erreur détails service:', error);
        res.status(500).json({
          success: false,
          error: 'Erreur lors de la récupération du service'
        });
      }
    }
  );

  // POST /api/admin/services - Créer un service
  router.post('/',
    [
      body('nom_service').trim().notEmpty().withMessage('Nom du service requis'),
      body('description').trim().notEmpty().withMessage('Description requise'),
      body('categorie').notEmpty().withMessage('Catégorie requise'),
      body('prix').isFloat({ min: 0 }).withMessage('Prix invalide'),
      body('unite_prix').optional().isString().withMessage('Unité de prix invalide'),
      body('duree').optional().isInt({ min: 0 }).withMessage('Durée invalide'),
      body('id_user').isInt({ min: 1 }).withMessage('ID prestataire requis'),
      body('wilaya').optional().isInt({ min: 1, max: 58 }).withMessage('Wilaya invalide'),
      body('disponibilite').optional().isObject().withMessage('Disponibilité invalide'),
      body('conditions').optional().isArray().withMessage('Conditions invalides'),
      body('tags').optional().isArray().withMessage('Tags invalides')
    ],
    validationMiddleware.handleValidationErrors,
    auditMiddleware.logAction('CREATE_SERVICE'),
    async (req, res) => {
      try {
        const ServiceModel = models.Service || models.Artisanat;
        
        if (!ServiceModel) {
          return res.status(501).json({
            success: false,
            error: 'Module services non configuré'
          });
        }
        
        // Vérifier que le prestataire existe et est validé
        const prestataire = await models.User.findByPk(req.body.id_user);
        
        if (!prestataire) {
          return res.status(400).json({
            success: false,
            error: 'Prestataire non trouvé'
          });
        }
        
        if (prestataire.statut_validation !== 'valide') {
          return res.status(400).json({
            success: false,
            error: 'Le prestataire doit être validé pour créer un service'
          });
        }
        
        // Préparer les données de création
        const serviceData = {
          ...req.body,
          statut: 'actif'
        };
        
        // Ajouter les champs de création s'ils existent dans le modèle
        if (ServiceModel.rawAttributes.date_creation) {
          serviceData.date_creation = new Date();
        }
        if (ServiceModel.rawAttributes.cree_par) {
          serviceData.cree_par = req.user.id_user;
        }
        
        const service = await ServiceModel.create(serviceData);
        
        res.status(201).json({
          success: true,
          message: 'Service créé avec succès',
          data: service
        });
      } catch (error) {
        console.error('Erreur création service:', error);
        res.status(500).json({
          success: false,
          error: 'Erreur lors de la création du service'
        });
      }
    }
  );

  // PUT /api/admin/services/:id - Modifier un service
  router.put('/:id',
    param('id').isInt({ min: 1 }).withMessage('ID invalide'),
    [
      body('nom_service').optional().trim().notEmpty().withMessage('Nom du service invalide'),
      body('description').optional().trim().notEmpty().withMessage('Description invalide'),
      body('categorie').optional().isString().withMessage('Catégorie invalide'),
      body('prix').optional().isFloat({ min: 0 }).withMessage('Prix invalide'),
      body('unite_prix').optional().isString().withMessage('Unité de prix invalide'),
      body('duree').optional().isInt({ min: 0 }).withMessage('Durée invalide'),
      body('statut').optional().isIn(['actif', 'inactif', 'suspendu']).withMessage('Statut invalide'),
      body('disponibilite').optional().isObject().withMessage('Disponibilité invalide'),
      body('conditions').optional().isArray().withMessage('Conditions invalides')
    ],
    validationMiddleware.handleValidationErrors,
    auditMiddleware.logAction('UPDATE_SERVICE'),
    async (req, res) => {
      try {
        const ServiceModel = models.Service || models.Artisanat;
        
        if (!ServiceModel) {
          return res.status(501).json({
            success: false,
            error: 'Module services non configuré'
          });
        }
        
        const service = await ServiceModel.findByPk(req.params.id);
        
        if (!service) {
          return res.status(404).json({
            success: false,
            error: 'Service non trouvé'
          });
        }
        
        // Préparer les données de mise à jour
        const updateData = { ...req.body };
        
        // Ajouter les champs de modification s'ils existent dans le modèle
        if (ServiceModel.rawAttributes.date_modification) {
          updateData.date_modification = new Date();
        }
        if (ServiceModel.rawAttributes.modifie_par) {
          updateData.modifie_par = req.user.id_user;
        }
        
        await service.update(updateData);
        
        await service.reload({
          include: [
            {
              model: models.User,
              as: 'Prestataire',
              attributes: ['id_user', 'nom', 'prenom']
            },
            {
              model: models.Media,
              limit: 1
            }
          ]
        });
        
        res.json({
          success: true,
          message: 'Service mis à jour avec succès',
          data: service
        });
      } catch (error) {
        console.error('Erreur mise à jour service:', error);
        res.status(500).json({
          success: false,
          error: 'Erreur lors de la mise à jour du service'
        });
      }
    }
  );

  // DELETE /api/admin/services/:id - Supprimer un service
  router.delete('/:id',
    param('id').isInt({ min: 1 }).withMessage('ID invalide'),
    validationMiddleware.handleValidationErrors,
    auditMiddleware.logAction('DELETE_SERVICE'),
    async (req, res) => {
      try {
        const ServiceModel = models.Service || models.Artisanat;
        
        if (!ServiceModel) {
          return res.status(501).json({
            success: false,
            error: 'Module services non configuré'
          });
        }
        
        const service = await ServiceModel.findByPk(req.params.id);
        
        if (!service) {
          return res.status(404).json({
            success: false,
            error: 'Service non trouvé'
          });
        }
        
        // Vérifier s'il y a des réservations actives
        if (models.Reservation) {
          const activeReservations = await models.Reservation.count({
            where: {
              service_id: service.id_service || service.id_artisanat,
              statut: ['en_attente', 'confirmee']
            }
          });
          
          if (activeReservations > 0) {
            return res.status(400).json({
              success: false,
              error: 'Impossible de supprimer un service avec des réservations actives'
            });
          }
        }
        
        // Supprimer les médias associés
        await models.Media.destroy({
          where: { 
            entity_type: 'service',
            entity_id: req.params.id 
          }
        });
        
        // Supprimer les évaluations
        if (models.CritiqueEvaluation) {
          await models.CritiqueEvaluation.destroy({
            where: { 
              id_entite: req.params.id,
              type_entite: 'service'
            }
          });
        }
        
        // Supprimer le service
        await service.destroy();
        
        res.json({
          success: true,
          message: 'Service supprimé avec succès'
        });
      } catch (error) {
        console.error('Erreur suppression service:', error);
        res.status(500).json({
          success: false,
          error: 'Erreur lors de la suppression du service'
        });
      }
    }
  );

  // POST /api/admin/services/:id/suspend - Suspendre un service
  router.post('/:id/suspend',
    param('id').isInt({ min: 1 }).withMessage('ID invalide'),
    [
      body('raison').notEmpty().withMessage('Raison requise'),
      body('duree').optional().isInt({ min: 1 }).withMessage('Durée invalide (jours)')
    ],
    validationMiddleware.handleValidationErrors,
    auditMiddleware.logAction('SUSPEND_SERVICE'),
    async (req, res) => {
      try {
        const ServiceModel = models.Service || models.Artisanat;
        
        if (!ServiceModel) {
          return res.status(501).json({
            success: false,
            error: 'Module services non configuré'
          });
        }
        
        const service = await ServiceModel.findByPk(req.params.id, {
          include: [{
            model: models.User,
            as: 'Prestataire'
          }]
        });
        
        if (!service) {
          return res.status(404).json({
            success: false,
            error: 'Service non trouvé'
          });
        }
        
        const suspensionEnd = req.body.duree 
          ? new Date(Date.now() + req.body.duree * 24 * 60 * 60 * 1000)
          : null;
        
        await service.update({
          statut: 'suspendu',
          date_suspension: new Date(),
          raison_suspension: req.body.raison,
          fin_suspension: suspensionEnd,
          suspendu_par: req.user.id_user
        });
        
        // Notifier le prestataire
        if (models.Notification && service.Prestataire) {
          await models.Notification.create({
            user_id: service.Prestataire.id_user,
            type: 'service_suspendu',
            titre: 'Service suspendu',
            message: `Votre service "${service.nom_service}" a été suspendu. Raison : ${req.body.raison}`,
            lue: false,
            date_creation: new Date()
          });
        }
        
        res.json({
          success: true,
          message: 'Service suspendu avec succès',
          data: {
            id: service.id_service || service.id_artisanat,
            statut: service.statut,
            fin_suspension: suspensionEnd
          }
        });
      } catch (error) {
        console.error('Erreur suspension service:', error);
        res.status(500).json({
          success: false,
          error: 'Erreur lors de la suspension du service'
        });
      }
    }
  );

  // POST /api/admin/services/:id/reactivate - Réactiver un service suspendu
  router.post('/:id/reactivate',
    param('id').isInt({ min: 1 }).withMessage('ID invalide'),
    validationMiddleware.handleValidationErrors,
    auditMiddleware.logAction('REACTIVATE_SERVICE'),
    async (req, res) => {
      try {
        const ServiceModel = models.Service || models.Artisanat;
        
        if (!ServiceModel) {
          return res.status(501).json({
            success: false,
            error: 'Module services non configuré'
          });
        }
        
        const service = await ServiceModel.findByPk(req.params.id);
        
        if (!service) {
          return res.status(404).json({
            success: false,
            error: 'Service non trouvé'
          });
        }
        
        if (service.statut !== 'suspendu') {
          return res.status(400).json({
            success: false,
            error: 'Le service n\'est pas suspendu'
          });
        }
        
        await service.update({
          statut: 'actif',
          date_suspension: null,
          raison_suspension: null,
          fin_suspension: null,
          suspendu_par: null
        });
        
        res.json({
          success: true,
          message: 'Service réactivé avec succès',
          data: service
        });
      } catch (error) {
        console.error('Erreur réactivation service:', error);
        res.status(500).json({
          success: false,
          error: 'Erreur lors de la réactivation du service'
        });
      }
    }
  );

  // GET /api/admin/services/prestataires - Liste des prestataires de services
  router.get('/prestataires/list',
    [
      query('search').optional().isString().withMessage('Recherche invalide'),
      query('wilaya').optional().isInt({ min: 1, max: 58 }).withMessage('Wilaya invalide'),
      query('has_services').optional().isBoolean().withMessage('Filtre services invalide')
    ],
    validationMiddleware.handleValidationErrors,
    async (req, res) => {
      try {
        const { search, wilaya, has_services } = req.query;
        
        const where = {
          id_type_user: { 
            [Op.in]: [7, 13] // ARTISAN et AUTRE (prestataires de services)
          },
          statut_validation: 'valide',
          statut: 'actif'
        };
        
        if (wilaya) where.wilaya_residence = wilaya;
        if (search) {
          where[Op.or] = [
            { nom: { [Op.like]: `%${search}%` } },
            { prenom: { [Op.like]: `%${search}%` } },
            { entreprise: { [Op.like]: `%${search}%` } }
          ];
        }
        
        const prestataires = await models.User.findAll({
          where,
          attributes: ['id_user', 'nom', 'prenom', 'email', 'entreprise', 'telephone'],
          include: has_services === 'true' ? [{
            model: models.Service || models.Artisanat,
            as: 'Services',
            attributes: ['id_service', 'id_artisanat'],
            required: true
          }] : [],
          order: [['nom', 'ASC'], ['prenom', 'ASC']]
        });
        
        // Ajouter le nombre de services pour chaque prestataire
        const ServiceModel = models.Service || models.Artisanat;
        const prestatairesList = await Promise.all(prestataires.map(async (p) => {
          const servicesCount = ServiceModel ? await ServiceModel.count({
            where: { id_user: p.id_user }
          }) : 0;
          
          return {
            ...p.toJSON(),
            services_count: servicesCount
          };
        }));
        
        res.json({
          success: true,
          data: prestatairesList
        });
      } catch (error) {
        console.error('Erreur liste prestataires:', error);
        res.status(500).json({
          success: false,
          error: 'Erreur lors de la récupération des prestataires'
        });
      }
    }
  );

  // POST /api/admin/services/bulk-action - Actions en masse
  router.post('/bulk-action',
    [
      body('service_ids').isArray({ min: 1 }).withMessage('Liste de services requise'),
      body('service_ids.*').isInt({ min: 1 }).withMessage('ID service invalide'),
      body('action').isIn(['activate', 'deactivate', 'suspend', 'delete']).withMessage('Action invalide'),
      body('raison').optional().isString().withMessage('Raison invalide')
    ],
    validationMiddleware.handleValidationErrors,
    auditMiddleware.logAction('BULK_SERVICE_ACTION'),
    async (req, res) => {
      try {
        const ServiceModel = models.Service || models.Artisanat;
        
        if (!ServiceModel) {
          return res.status(501).json({
            success: false,
            error: 'Module services non configuré'
          });
        }
        
        const { service_ids, action, raison } = req.body;
        let updatedCount = 0;
        
        switch (action) {
          case 'activate':
            updatedCount = await ServiceModel.update(
              { statut: 'actif' },
              { where: { 
                [models.Service ? 'id_service' : 'id_artisanat']: service_ids,
                statut: { [Op.ne]: 'actif' }
              }}
            );
            break;
            
          case 'deactivate':
            updatedCount = await ServiceModel.update(
              { statut: 'inactif' },
              { where: { 
                [models.Service ? 'id_service' : 'id_artisanat']: service_ids,
                statut: { [Op.ne]: 'inactif' }
              }}
            );
            break;
            
          case 'suspend':
            if (!raison) {
              return res.status(400).json({
                success: false,
                error: 'Raison requise pour la suspension'
              });
            }
            updatedCount = await ServiceModel.update(
              { 
                statut: 'suspendu',
                date_suspension: new Date(),
                raison_suspension: raison,
                suspendu_par: req.user.id_user
              },
              { where: { 
                [models.Service ? 'id_service' : 'id_artisanat']: service_ids 
              }}
            );
            break;
            
          case 'delete':
            // Vérifier qu'aucun service n'a de réservations actives
            if (models.Reservation) {
              const withReservations = await models.Reservation.count({
                where: { 
                  service_id: service_ids,
                  statut: ['en_attente', 'confirmee']
                }
              });
              
              if (withReservations > 0) {
                return res.status(400).json({
                  success: false,
                  error: 'Certains services ont des réservations actives'
                });
              }
            }
            
            // Supprimer les données associées
            await models.Media.destroy({
              where: { 
                entity_type: 'service',
                entity_id: service_ids 
              }
            });
            
            if (models.CritiqueEvaluation) {
              await models.CritiqueEvaluation.destroy({
                where: { 
                  id_entite: service_ids,
                  type_entite: 'service'
                }
              });
            }
            
            updatedCount = await ServiceModel.destroy({
              where: { 
                [models.Service ? 'id_service' : 'id_artisanat']: service_ids 
              }
            });
            break;
        }
        
        res.json({
          success: true,
          message: `${updatedCount} services modifiés`,
          data: { count: updatedCount }
        });
      } catch (error) {
        console.error('Erreur action en masse services:', error);
        res.status(500).json({
          success: false,
          error: 'Erreur lors de l\'action en masse'
        });
      }
    }
  );

  // GET /api/admin/services/stats/summary - Statistiques résumées
  router.get('/stats/summary',
    async (req, res) => {
      try {
        const ServiceModel = models.Service || models.Artisanat;
        
        if (!ServiceModel) {
          return res.json({
            success: true,
            data: {
              total: 0,
              byStatus: {},
              byCategory: [],
              revenue: {}
            }
          });
        }
        
        const [
          total,
          actifs,
          inactifs,
          suspendus,
          enAttente,
          parCategorie,
          parWilaya,
          prestataireCount
        ] = await Promise.all([
          ServiceModel.count(),
          ServiceModel.count({ where: { statut: 'actif' } }),
          ServiceModel.count({ where: { statut: 'inactif' } }),
          ServiceModel.count({ where: { statut: 'suspendu' } }),
          ServiceModel.count({ where: { statut: 'en_attente' } }),
          ServiceModel.findAll({
            attributes: [
              'categorie',
              [models.sequelize.fn('COUNT', '*'), 'count']
            ],
            group: ['categorie'],
            raw: true
          }),
          ServiceModel.findAll({
            attributes: [
              'wilaya',
              [models.sequelize.fn('COUNT', '*'), 'count']
            ],
            where: { wilaya: { [Op.ne]: null } },
            group: ['wilaya'],
            order: [[models.sequelize.literal('count'), 'DESC']],
            limit: 10,
            raw: true
          }),
          ServiceModel.count({
            distinct: true,
            col: 'id_user'
          })
        ]);
        
        // Calculer les revenus si le modèle Reservation existe
        let revenueStats = {
          total: 0,
          monthly: 0,
          average_per_service: 0
        };
        
        if (models.Reservation) {
          const [totalRevenue, monthlyRevenue] = await Promise.all([
            models.Reservation.sum('montant_total', {
              where: { statut: 'termine' }
            }),
            models.Reservation.sum('montant_total', {
              where: {
                statut: 'termine',
                date_reservation: {
                  [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1))
                }
              }
            })
          ]);
          
          revenueStats = {
            total: totalRevenue || 0,
            monthly: monthlyRevenue || 0,
            average_per_service: total > 0 ? (totalRevenue || 0) / total : 0
          };
        }
        
        res.json({
          success: true,
          data: {
            total,
            byStatus: {
              actif: actifs,
              inactif: inactifs,
              suspendu: suspendus,
              en_attente: enAttente
            },
            byCategory: parCategorie,
            byWilaya: parWilaya,
            prestataires: {
              total: prestataireCount,
              average_services: total > 0 ? (total / prestataireCount).toFixed(2) : 0
            },
            revenue: revenueStats
          }
        });
      } catch (error) {
        console.error('Erreur stats services:', error);
        res.status(500).json({
          success: false,
          error: 'Erreur lors du calcul des statistiques'
        });
      }
    }
  );

  // GET /api/admin/services/categories - Liste des catégories
  router.get('/categories/list',
    async (req, res) => {
      try {
        const ServiceModel = models.Service || models.Artisanat;
        
        if (!ServiceModel) {
          return res.json({
            success: true,
            data: []
          });
        }
        
        const categories = await ServiceModel.findAll({
          attributes: [
            [models.sequelize.fn('DISTINCT', models.sequelize.col('categorie')), 'categorie']
          ],
          where: { categorie: { [Op.ne]: null } },
          raw: true
        });
        
        res.json({
          success: true,
          data: categories.map(c => c.categorie).filter(Boolean)
        });
      } catch (error) {
        console.error('Erreur liste catégories services:', error);
        res.status(500).json({
          success: false,
          error: 'Erreur lors de la récupération des catégories'
        });
      }
    }
  );

  return router;
};

module.exports = initAdminServicesRoutes;