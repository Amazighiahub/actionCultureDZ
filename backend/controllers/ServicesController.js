// controllers/servicesController.js
const { 
  Service, 
  DetailLieu, 
  Lieu, 
  LieuMedia, 
  Wilaya, 
  Daira, 
  Commune,
  Localite,
  sequelize 
} = require('../models');
const { Op } = require('sequelize');

class ServicesController {
  // ==================== CRUD DE BASE ====================

  // Créer un service simple (Lieu doit exister)
  async createService(req, res) {
    try {
      const { id_lieu, nom, disponible = true, description } = req.body;

      // Vérifier que le Lieu existe
      const lieu = await Lieu.findByPk(id_lieu);
      if (!lieu) {
        return res.status(404).json({
          success: false,
          message: 'Lieu non trouvé'
        });
      }

      const service = await Service.create({
        id_lieu,
        nom,
        disponible,
        description
      });

      // Récupérer le service avec ses relations
      const serviceComplet = await Service.findByPk(service.id, {
        include: [{
          model: Lieu,
          attributes: ['id_lieu', 'nom', 'adresse', 'latitude', 'longitude'],
          include: [{
            model: DetailLieu,
            attributes: ['description', 'horaires', 'noteMoyenne']
          }]
        }]
      });

      res.status(201).json({
        success: true,
        message: 'Service créé avec succès',
        data: serviceComplet
      });
    } catch (error) {
      console.error('Erreur lors de la création du service:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la création du service',
        error: error.message
      });
    }
  }

  // Obtenir tous les services avec pagination et filtres
  async getAllServices(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10,
        search,
        communeId,
        includeMedias = false,
        sortBy = 'nom',
        order = 'ASC'
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      // Recherche par nom
      if (search) {
        where.nom = { [Op.like]: `%${search}%` };
      }

      // Construction des includes
      const includeOptions = [{
        model: Lieu,
        attributes: ['id_lieu', 'nom', 'adresse', 'typeLieu', 'latitude', 'longitude'],
        where: communeId ? { communeId } : {},
        include: [
          { 
            model: Commune, 
            attributes: ['id_commune', 'nom'],
            include: [{
              model: Daira,
              attributes: ['id_daira', 'nom'],
              include: [{
                model: Wilaya,
                attributes: ['id_wilaya', 'nom']
              }]
            }]
          },
          { 
            model: DetailLieu,
            attributes: ['id_detailLieu', 'description', 'horaires', 'noteMoyenne']
          }
        ]
      }];

      // Inclure les médias si demandé
      if (includeMedias === 'true') {
        includeOptions[0].include.push({
          model: LieuMedia,
          attributes: ['id', 'type', 'url', 'description']
        });
      }

      const services = await Service.findAndCountAll({
        where,
        include: includeOptions,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [[sortBy, order]],
        distinct: true
      });

      res.status(200).json({
        success: true,
        data: {
          services: services.rows,
          pagination: {
            total: services.count,
            page: parseInt(page),
            pages: Math.ceil(services.count / limit),
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des services:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des services',
        error: error.message
      });
    }
  }

  // Obtenir un service par ID
  async getServiceById(req, res) {
    try {
      const { id } = req.params;

      const service = await Service.findByPk(id, {
        include: [{
          model: Lieu,
          include: [
            { 
              model: Commune,
              include: [{
                model: Daira,
                include: [{
                  model: Wilaya
                }]
              }]
            },
            { model: Localite },
            { model: LieuMedia },
            { model: DetailLieu }
          ]
        }]
      });

      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Service non trouvé'
        });
      }

      res.status(200).json({
        success: true,
        data: service
      });
    } catch (error) {
      console.error('Erreur lors de la récupération du service:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du service',
        error: error.message
      });
    }
  }

  // Mettre à jour un service
  async updateService(req, res) {
    try {
      const { id } = req.params;
      const { id_lieu, nom, disponible, description } = req.body;

      const service = await Service.findByPk(id);
      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Service non trouvé'
        });
      }

      // Si id_lieu est fourni, vérifier qu'il existe
      if (id_lieu && id_lieu !== service.id_lieu) {
        const lieu = await Lieu.findByPk(id_lieu);
        if (!lieu) {
          return res.status(404).json({
            success: false,
            message: 'Lieu non trouvé'
          });
        }
      }

      await service.update({
        id_lieu: id_lieu || service.id_lieu,
        nom: nom || service.nom,
        disponible: disponible !== undefined ? disponible : service.disponible,
        description: description || service.description
      });

      const serviceUpdated = await Service.findByPk(id, {
        include: [{
          model: Lieu,
          attributes: ['id_lieu', 'nom', 'adresse'],
          include: [{
            model: DetailLieu,
            attributes: ['description', 'horaires', 'noteMoyenne']
          }]
        }]
      });

      res.status(200).json({
        success: true,
        message: 'Service mis à jour avec succès',
        data: serviceUpdated
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du service:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour du service',
        error: error.message
      });
    }
  }

  // Supprimer un service
  async deleteService(req, res) {
    try {
      const { id } = req.params;

      const service = await Service.findByPk(id);
      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Service non trouvé'
        });
      }

      await service.destroy();

      res.status(200).json({
        success: true,
        message: 'Service supprimé avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la suppression du service:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression du service',
        error: error.message
      });
    }
  }

  // ==================== CRÉATION COMPLÈTE ====================

  // Créer un service complet avec lieu et détails
  async createServiceComplet(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const {
        nomService,
        disponible = true,
        description,
        lieu,
        detailLieu,
        medias = []
      } = req.body;

      let lieuCree = null;

      // 1. Gérer le Lieu
      if (lieu) {
        if (lieu.id_lieu) {
          // Utiliser un lieu existant
          lieuCree = await Lieu.findByPk(lieu.id_lieu, { transaction });
          if (!lieuCree) {
            await transaction.rollback();
            return res.status(404).json({
              success: false,
              message: 'Lieu spécifié non trouvé'
            });
          }
        } else {
          // Créer un nouveau lieu
          const { nom, adresse, latitude, longitude, typeLieu, communeId, localiteId } = lieu;
          
          // Validation
          if (!nom || !adresse || !latitude || !longitude || !typeLieu || !communeId) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              message: 'Données du lieu incomplètes'
            });
          }

          // Validation GPS
          if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              message: 'Coordonnées GPS invalides'
            });
          }

          lieuCree = await Lieu.create({
            nom,
            adresse,
            latitude,
            longitude,
            typeLieu,
            communeId,
            localiteId
          }, { transaction });

          // 2. Créer les médias du lieu si fournis
          if (medias.length > 0) {
            const mediasData = medias.map(media => ({
              id_lieu: lieuCree.id_lieu,
              type: media.type,
              url: media.url,
              description: media.description
            }));
            await LieuMedia.bulkCreate(mediasData, { transaction });
          }

          // 3. Créer le DetailLieu si fourni
          if (detailLieu) {
            await DetailLieu.create({
              id_lieu: lieuCree.id_lieu,
              description: detailLieu.description,
              horaires: detailLieu.horaires,
              histoire: detailLieu.histoire,
              referencesHistoriques: detailLieu.referencesHistoriques,
              noteMoyenne: detailLieu.noteMoyenne || null
            }, { transaction });
          }
        }
      } else {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Les informations du lieu sont requises'
        });
      }

      // 4. Créer le Service
      const serviceCree = await Service.create({
        id_lieu: lieuCree.id_lieu,
        nom: nomService,
        disponible,
        description
      }, { transaction });

      await transaction.commit();

      // 5. Récupérer le service complet avec toutes ses relations
      const serviceComplet = await Service.findByPk(serviceCree.id, {
        include: [{
          model: Lieu,
          include: [
            { 
              model: Commune,
              include: [{
                model: Daira,
                include: [{
                  model: Wilaya
                }]
              }]
            },
            { model: Localite },
            { model: DetailLieu },
            { model: LieuMedia }
          ]
        }]
      });

      res.status(201).json({
        success: true,
        message: 'Service créé avec succès',
        data: serviceComplet
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erreur lors de la création du service complet:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la création du service',
        error: error.message
      });
    }
  }

  // ==================== SERVICES PAR LIEU ====================

  // Obtenir tous les services d'un lieu spécifique
  async getServicesByLieu(req, res) {
    try {
      const { lieuId } = req.params;
      const { includeDetails = false } = req.query;

      // Vérifier que le lieu existe
      const lieu = await Lieu.findByPk(lieuId);
      if (!lieu) {
        return res.status(404).json({
          success: false,
          message: 'Lieu non trouvé'
        });
      }

      const includeOptions = [];
      if (includeDetails === 'true') {
        includeOptions.push({
          model: Lieu,
          include: [{
            model: DetailLieu,
            attributes: ['description', 'horaires', 'noteMoyenne']
          }]
        });
      }

      const services = await Service.findAll({
        where: { id_lieu: lieuId },
        include: includeOptions,
        order: [['nom', 'ASC']]
      });

      res.status(200).json({
        success: true,
        lieu: {
          id: lieu.id_lieu,
          nom: lieu.nom,
          adresse: lieu.adresse
        },
        count: services.length,
        data: services
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des services du lieu:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des services',
        error: error.message
      });
    }
  }

  // Obtenir les services groupés par lieu
  async getServicesGroupedByLieu(req, res) {
    try {
      const { communeId, minServices = 0 } = req.query;

      const whereConditions = {};
      if (communeId) {
        whereConditions.communeId = communeId;
      }

      const lieux = await Lieu.findAll({
        where: whereConditions,
        attributes: [
          'id_lieu',
          'nom',
          'adresse',
          'typeLieu',
          'latitude',
          'longitude'
        ],
        include: [
          {
            model: Service,
            attributes: ['id', 'nom', 'disponible', 'description']
          },
          {
            model: Commune,
            attributes: ['id_commune', 'nom'],
            include: [{
              model: Daira,
              attributes: ['id_daira', 'nom'],
              include: [{
                model: Wilaya,
                attributes: ['id_wilaya', 'nom']
              }]
            }]
          },
          {
            model: DetailLieu,
            attributes: ['noteMoyenne', 'horaires']
          }
        ],
        order: [
          ['nom', 'ASC'],
          [Service, 'nom', 'ASC']
        ]
      });

      // Filtrer les lieux avec un minimum de services
      const lieuxAvecServices = lieux
        .filter(lieu => lieu.Services && lieu.Services.length >= parseInt(minServices))
        .map(lieu => ({
          id: lieu.id_lieu,
          nom: lieu.nom,
          adresse: lieu.adresse,
          typeLieu: lieu.typeLieu,
          coordinates: {
            latitude: lieu.latitude,
            longitude: lieu.longitude
          },
          commune: lieu.Commune ? lieu.Commune.nom : null,
          daira: lieu.Commune?.Daira ? lieu.Commune.Daira.nom : null,
          wilaya: lieu.Commune?.Daira?.Wilaya ? lieu.Commune.Daira.Wilaya.nom : null,
          noteMoyenne: lieu.DetailLieu ? lieu.DetailLieu.noteMoyenne : null,
          horaires: lieu.DetailLieu ? lieu.DetailLieu.horaires : null,
          nombreServices: lieu.Services.length,
          services: lieu.Services.map(s => ({
            id: s.id,
            nom: s.nom,
            disponible: s.disponible,
            description: s.description
          }))
        }));

      // Statistiques
      const stats = {
        totalLieux: lieuxAvecServices.length,
        totalServices: lieuxAvecServices.reduce((sum, l) => sum + l.nombreServices, 0),
        moyenneServicesParLieu: lieuxAvecServices.length > 0 
          ? (lieuxAvecServices.reduce((sum, l) => sum + l.nombreServices, 0) / lieuxAvecServices.length).toFixed(2)
          : 0
      };

      res.status(200).json({
        success: true,
        stats,
        data: lieuxAvecServices
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des services groupés:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des services',
        error: error.message
      });
    }
  }

  // ==================== RECHERCHE DE LIEUX ====================

  // Rechercher des lieux pour la sélection dans le formulaire
  async searchLieuxForSelection(req, res) {
    try {
      const { 
        search = '', 
        page = 1, 
        limit = 20,
        communeId,
        includeServices = false
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      // Recherche textuelle
      if (search) {
        where[Op.or] = [
          { nom: { [Op.like]: `%${search}%` } },
          { adresse: { [Op.like]: `%${search}%` } }
        ];
      }

      // Filtre par commune si fourni
      if (communeId) {
        where.communeId = communeId;
      }

      // Options d'inclusion
      const includeOptions = [
        { 
          model: Commune, 
          attributes: ['id_commune', 'nom'],
          include: [{
            model: Daira,
            attributes: ['id_daira', 'nom'],
            include: [{
              model: Wilaya,
              attributes: ['id_wilaya', 'nom']
            }]
          }]
        },
        {
          model: DetailLieu,
          attributes: ['id_detailLieu', 'description', 'horaires', 'noteMoyenne']
        }
      ];

      // Inclure les services si demandé
      if (includeServices === 'true') {
        includeOptions.push({
          model: Service,
          attributes: ['id', 'nom', 'disponible', 'description']
        });
      }

      const lieux = await Lieu.findAndCountAll({
        where,
        attributes: ['id_lieu', 'nom', 'adresse', 'latitude', 'longitude', 'typeLieu'],
        include: includeOptions,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['nom', 'ASC']],
        distinct: true
      });

      res.status(200).json({
        success: true,
        data: {
          lieux: lieux.rows,
          pagination: {
            total: lieux.count,
            page: parseInt(page),
            pages: Math.ceil(lieux.count / limit),
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Erreur lors de la recherche de lieux:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la recherche de lieux',
        error: error.message
      });
    }
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  // Créer plusieurs services en même temps
  async createMultipleServices(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { services } = req.body;

      if (!Array.isArray(services) || services.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Veuillez fournir un tableau de services'
        });
      }

      // Vérifier que tous les Lieux existent
      const lieuIds = [...new Set(services.map(s => s.id_lieu))];
      const existingLieux = await Lieu.findAll({
        where: { id_lieu: lieuIds },
        transaction
      });

      if (existingLieux.length !== lieuIds.length) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Un ou plusieurs lieux n\'existent pas'
        });
      }

      // Créer tous les services
      const servicesData = services.map(s => ({
        id_lieu: s.id_lieu,
        nom: s.nom,
        disponible: s.disponible !== undefined ? s.disponible : true,
        description: s.description || null
      }));

      const createdServices = await Service.bulkCreate(servicesData, { transaction });

      await transaction.commit();

      res.status(201).json({
        success: true,
        message: `${createdServices.length} services créés avec succès`,
        data: createdServices
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Erreur lors de la création des services:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la création des services',
        error: error.message
      });
    }
  }

  // Basculer la disponibilité d'un service
  async toggleServiceDisponibilite(req, res) {
    try {
      const { id } = req.params;

      const service = await Service.findByPk(id);
      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Service non trouvé'
        });
      }

      await service.update({
        disponible: !service.disponible
      });

      res.status(200).json({
        success: true,
        message: `Service ${service.disponible ? 'activé' : 'désactivé'} avec succès`,
        data: service
      });
    } catch (error) {
      console.error('Erreur lors du changement de disponibilité:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du changement de disponibilité',
        error: error.message
      });
    }
  }

  // Statistiques des services
  async getServicesStats(req, res) {
    try {
      const { communeId, startDate, endDate } = req.query;

      const whereConditions = {};
      const lieuWhereConditions = {};

      if (communeId) {
        lieuWhereConditions.communeId = communeId;
      }

      if (startDate && endDate) {
        whereConditions.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

      // Nombre total de services
      const totalServices = await Service.count({ where: whereConditions });

      // Services disponibles vs indisponibles
      const servicesDisponibles = await Service.count({ 
        where: { ...whereConditions, disponible: true } 
      });
      const servicesIndisponibles = totalServices - servicesDisponibles;

      // Services par type de lieu
      const servicesByTypeLieu = await Service.findAll({
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('Service.id')), 'count'],
          [sequelize.col('Lieu.typeLieu'), 'typeLieu']
        ],
        include: [{
          model: Lieu,
          attributes: [],
          where: lieuWhereConditions
        }],
        where: whereConditions,
        group: ['Lieu.typeLieu'],
        raw: true
      });

      // Top 10 lieux avec le plus de services
      const topLieux = await Lieu.findAll({
        attributes: [
          'id_lieu',
          'nom',
          'adresse',
          [sequelize.fn('COUNT', sequelize.col('Services.id')), 'servicesCount']
        ],
        include: [{
          model: Service,
          attributes: [],
          where: whereConditions
        }],
        where: lieuWhereConditions,
        group: ['Lieu.id_lieu'],
        order: [[sequelize.literal('servicesCount'), 'DESC']],
        limit: 10,
        subQuery: false
      });

      res.status(200).json({
        success: true,
        data: {
          totalServices,
          servicesDisponibles,
          servicesIndisponibles,
          servicesByTypeLieu,
          topLieux
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques',
        error: error.message
      });
    }
  }
}

module.exports = new ServicesController();