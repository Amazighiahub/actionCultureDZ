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

  // Créer un service simple (DetailLieu doit exister)
  async createService(req, res) {
    try {
      const { id_detailLieu, nom } = req.body;

      // Vérifier que le DetailLieu existe
      const detailLieu = await DetailLieu.findByPk(id_detailLieu);
      if (!detailLieu) {
        return res.status(404).json({
          success: false,
          message: 'DetailLieu non trouvé'
        });
      }

      const service = await Service.create({
        id_detailLieu,
        nom
      });

      // Récupérer le service avec ses relations
      const serviceComplet = await Service.findByPk(service.id, {
        include: [{
          model: DetailLieu,
          attributes: ['description', 'horaires', 'noteMoyenne']
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
        wilayaId,
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
        model: DetailLieu,
        attributes: ['id_detailLieu', 'description', 'horaires', 'noteMoyenne'],
        include: [{
          model: Lieu,
          attributes: ['id_lieu', 'nom', 'adresse', 'typeLieu', 'latitude', 'longitude'],
          where: wilayaId ? { wilayaId } : {},
          include: [
            { model: Wilaya, attributes: ['id_wilaya', 'nom'] },
            { model: Daira, attributes: ['id_daira', 'nom'] },
            { model: Commune, attributes: ['id_commune', 'nom'] }
          ]
        }]
      }];

      // Inclure les médias si demandé
      if (includeMedias === 'true') {
        includeOptions[0].include[0].include.push({
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
          model: DetailLieu,
          include: [{
            model: Lieu,
            include: [
              { model: Wilaya },
              { model: Daira },
              { model: Commune },
              { model: Localite },
              { model: LieuMedia }
            ]
          }]
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
      const { id_detailLieu, nom } = req.body;

      const service = await Service.findByPk(id);
      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Service non trouvé'
        });
      }

      // Si id_detailLieu est fourni, vérifier qu'il existe
      if (id_detailLieu && id_detailLieu !== service.id_detailLieu) {
        const detailLieu = await DetailLieu.findByPk(id_detailLieu);
        if (!detailLieu) {
          return res.status(404).json({
            success: false,
            message: 'DetailLieu non trouvé'
          });
        }
      }

      await service.update({
        id_detailLieu: id_detailLieu || service.id_detailLieu,
        nom: nom || service.nom
      });

      const serviceUpdated = await Service.findByPk(id, {
        include: [{
          model: DetailLieu,
          attributes: ['description', 'horaires', 'noteMoyenne']
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
        lieu,
        detailLieu,
        medias = []
      } = req.body;

      let lieuCree = null;
      let detailLieuCree = null;

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
          const { nom, adresse, latitude, longitude, typeLieu, wilayaId, dairaId, communeId, localiteId } = lieu;
          
          // Validation
          if (!nom || !adresse || !latitude || !longitude || !typeLieu) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              message: 'Les champs nom, adresse, latitude, longitude et typeLieu sont obligatoires pour créer un lieu'
            });
          }

          // Vérifier les références géographiques
          if (wilayaId) {
            const wilaya = await Wilaya.findByPk(wilayaId, { transaction });
            if (!wilaya) {
              await transaction.rollback();
              return res.status(404).json({
                success: false,
                message: 'Wilaya non trouvée'
              });
            }
          }

          lieuCree = await Lieu.create({
            nom,
            adresse,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            typeLieu,
            wilayaId,
            dairaId,
            communeId,
            localiteId
          }, { transaction });
        }
      }

      // 2. Gérer le DetailLieu
      if (detailLieu) {
        if (detailLieu.id_detailLieu) {
          // Utiliser un DetailLieu existant
          detailLieuCree = await DetailLieu.findByPk(detailLieu.id_detailLieu, { transaction });
          if (!detailLieuCree) {
            await transaction.rollback();
            return res.status(404).json({
              success: false,
              message: 'DetailLieu spécifié non trouvé'
            });
          }
        } else if (lieuCree) {
          // Créer un nouveau DetailLieu
          const { description, horaires, histoire, referencesHistoriques, noteMoyenne } = detailLieu;
          
          detailLieuCree = await DetailLieu.create({
            id_lieu: lieuCree.id_lieu,
            description,
            horaires,
            histoire,
            referencesHistoriques,
            noteMoyenne: noteMoyenne ? parseFloat(noteMoyenne) : null
          }, { transaction });
        } else {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: 'Un lieu doit être spécifié pour créer un DetailLieu'
          });
        }
      }

      // 3. Créer les médias associés au lieu
      if (lieuCree && medias.length > 0) {
        for (const media of medias) {
          const { type, url, description } = media;
          
          if (!type || !url) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              message: 'Type et URL sont obligatoires pour chaque média'
            });
          }

          await LieuMedia.create({
            id_lieu: lieuCree.id_lieu,
            type,
            url,
            description
          }, { transaction });
        }
      }

      // 4. Créer le service
      if (!detailLieuCree) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Un DetailLieu est requis pour créer un service'
        });
      }

      const service = await Service.create({
        id_detailLieu: detailLieuCree.id_detailLieu,
        nom: nomService
      }, { transaction });

      // Commit de la transaction
      await transaction.commit();

      // Récupérer le service complet avec toutes les relations
      const serviceComplet = await Service.findByPk(service.id, {
        include: [{
          model: DetailLieu,
          include: [{
            model: Lieu,
            include: [
              { model: Wilaya },
              { model: Daira },
              { model: Commune },
              { model: Localite },
              { model: LieuMedia }
            ]
          }]
        }]
      });

      res.status(201).json({
        success: true,
        message: 'Service créé avec succès avec toutes ses dépendances',
        data: serviceComplet
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erreur lors de la création complète du service:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la création complète du service',
        error: error.message
      });
    }
  }

  // ==================== RECHERCHE PAR LIEU ====================

  // Obtenir les services par DetailLieu
  async getServicesByDetailLieu(req, res) {
    try {
      const { detailLieuId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const services = await Service.findAndCountAll({
        where: { id_detailLieu: detailLieuId },
        include: [{
          model: DetailLieu,
          attributes: ['description', 'horaires', 'noteMoyenne']
        }],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['nom', 'ASC']]
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

  // Obtenir les services par Lieu
  async getServicesByLieu(req, res) {
    try {
      const { lieuId } = req.params;
      const { 
        page = 1, 
        limit = 10,
        includeMedias = false
      } = req.query;

      const offset = (page - 1) * limit;

      // Vérifier que le lieu existe
      const lieu = await Lieu.findByPk(lieuId);
      if (!lieu) {
        return res.status(404).json({
          success: false,
          message: 'Lieu non trouvé'
        });
      }

      // Construire les options d'inclusion
      const includeOptions = [{
        model: DetailLieu,
        required: true,
        where: { id_lieu: lieuId },
        attributes: ['id_detailLieu', 'description', 'horaires', 'noteMoyenne'],
        include: [{
          model: Lieu,
          attributes: ['id_lieu', 'nom', 'adresse', 'latitude', 'longitude', 'typeLieu'],
          include: [
            { model: Wilaya, attributes: ['id_wilaya', 'nom'] },
            { model: Daira, attributes: ['id_daira', 'nom'] },
            { model: Commune, attributes: ['id_commune', 'nom'] }
          ]
        }]
      }];

      // Ajouter les médias si demandé
      if (includeMedias === 'true') {
        includeOptions[0].include[0].include.push({
          model: LieuMedia,
          attributes: ['id', 'type', 'url', 'description']
        });
      }

      const services = await Service.findAndCountAll({
        include: includeOptions,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['nom', 'ASC']],
        distinct: true
      });

      res.status(200).json({
        success: true,
        data: {
          services: services.rows,
          lieu: {
            id: lieu.id_lieu,
            nom: lieu.nom,
            adresse: lieu.adresse
          },
          pagination: {
            total: services.count,
            page: parseInt(page),
            pages: Math.ceil(services.count / limit),
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des services par lieu:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des services',
        error: error.message
      });
    }
  }

  // ==================== RECHERCHE PAR PROXIMITÉ ====================

  // Rechercher des services par proximité géographique
  async getServicesByProximity(req, res) {
    try {
      const { 
        latitude, 
        longitude, 
        radius = 5,
        limit = 20,
        type
      } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude et longitude sont requises'
        });
      }

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const radiusKm = parseFloat(radius);

      // Construire la condition WHERE pour le type si fourni
      const whereCondition = type ? { nom: { [Op.like]: `%${type}%` } } : {};

      // Requête avec calcul de distance Haversine
      const services = await Service.findAll({
        where: whereCondition,
        include: [{
          model: DetailLieu,
          required: true,
          attributes: ['id_detailLieu', 'description', 'horaires', 'noteMoyenne'],
          include: [{
            model: Lieu,
            required: true,
            attributes: [
              'id_lieu', 
              'nom', 
              'adresse', 
              'latitude', 
              'longitude',
              'typeLieu',
              [
                sequelize.literal(`
                  (6371 * acos(
                    cos(radians(${lat})) * 
                    cos(radians(\`DetailLieu->Lieu\`.\`latitude\`)) * 
                    cos(radians(\`DetailLieu->Lieu\`.\`longitude\`) - radians(${lng})) + 
                    sin(radians(${lat})) * 
                    sin(radians(\`DetailLieu->Lieu\`.\`latitude\`))
                  ))
                `),
                'distance'
              ]
            ],
            include: [
              { model: Wilaya, attributes: ['nom'] },
              { model: LieuMedia, attributes: ['type', 'url'] }
            ]
          }]
        }],
        having: sequelize.literal(`distance <= ${radiusKm}`),
        order: [[sequelize.literal('distance'), 'ASC']],
        limit: parseInt(limit),
        subQuery: false
      });

      // Formater les résultats
      const formattedServices = services.map(service => ({
        id: service.id,
        nom: service.nom,
        lieu: {
          id: service.DetailLieu.Lieu.id_lieu,
          nom: service.DetailLieu.Lieu.nom,
          adresse: service.DetailLieu.Lieu.adresse,
          latitude: service.DetailLieu.Lieu.latitude,
          longitude: service.DetailLieu.Lieu.longitude,
          distance: parseFloat(service.DetailLieu.Lieu.dataValues.distance).toFixed(2),
          wilaya: service.DetailLieu.Lieu.Wilaya?.nom
        },
        details: {
          description: service.DetailLieu.description,
          horaires: service.DetailLieu.horaires,
          noteMoyenne: service.DetailLieu.noteMoyenne
        },
        medias: service.DetailLieu.Lieu.LieuMedia
      }));

      res.status(200).json({
        success: true,
        count: formattedServices.length,
        searchCenter: { latitude: lat, longitude: lng },
        radius: radiusKm,
        data: formattedServices
      });

    } catch (error) {
      console.error('Erreur lors de la recherche par proximité:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la recherche des services',
        error: error.message
      });
    }
  }

  // ==================== SERVICES GROUPÉS ====================

  // Obtenir les services groupés par lieu dans une zone
  async getServicesGroupedByLieu(req, res) {
    try {
      const { wilayaId, dairaId, communeId, limit = 50 } = req.query;

      // Construire les conditions WHERE pour filtrer par zone
      const lieuWhereConditions = {};
      if (wilayaId) lieuWhereConditions.wilayaId = wilayaId;
      if (dairaId) lieuWhereConditions.dairaId = dairaId;
      if (communeId) lieuWhereConditions.communeId = communeId;

      // Récupérer tous les lieux avec leurs services
      const lieux = await Lieu.findAll({
        where: lieuWhereConditions,
        attributes: ['id_lieu', 'nom', 'adresse', 'latitude', 'longitude', 'typeLieu'],
        include: [
          { model: Wilaya, attributes: ['nom'] },
          { model: Daira, attributes: ['nom'] },
          { model: Commune, attributes: ['nom'] },
          {
            model: DetailLieu,
            attributes: ['id_detailLieu', 'description', 'horaires', 'noteMoyenne'],
            include: [{
              model: Service,
              attributes: ['id', 'nom']
            }]
          },
          {
            model: LieuMedia,
            attributes: ['type', 'url'],
            limit: 1
          }
        ],
        limit: parseInt(limit)
      });

      // Filtrer et formater les lieux qui ont des services
      const lieuxAvecServices = lieux
        .filter(lieu => lieu.DetailLieu && lieu.DetailLieu.Services && lieu.DetailLieu.Services.length > 0)
        .map(lieu => ({
          lieu: {
            id: lieu.id_lieu,
            nom: lieu.nom,
            adresse: lieu.adresse,
            coordinates: {
              latitude: lieu.latitude,
              longitude: lieu.longitude
            },
            type: lieu.typeLieu,
            localisation: {
              wilaya: lieu.Wilaya?.nom,
              daira: lieu.Daira?.nom,
              commune: lieu.Commune?.nom
            },
            image: lieu.LieuMedia?.[0]?.url || null
          },
          details: {
            description: lieu.DetailLieu.description,
            horaires: lieu.DetailLieu.horaires,
            noteMoyenne: lieu.DetailLieu.noteMoyenne
          },
          services: lieu.DetailLieu.Services.map(service => ({
            id: service.id,
            nom: service.nom
          })),
          nombreServices: lieu.DetailLieu.Services.length
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
        wilayaId,
        includeDetailLieux = false
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

      // Filtre par wilaya si fourni
      if (wilayaId) {
        where.wilayaId = wilayaId;
      }

      // Options d'inclusion
      const includeOptions = [
        { 
          model: Wilaya, 
          attributes: ['id_wilaya', 'nom'] 
        },
        { 
          model: Daira, 
          attributes: ['id_daira', 'nom'] 
        },
        { 
          model: Commune, 
          attributes: ['id_commune', 'nom'] 
        }
      ];

      // Inclure les DetailLieux si demandé
      if (includeDetailLieux === 'true') {
        includeOptions.push({
          model: DetailLieu,
          attributes: ['id_detailLieu', 'description', 'horaires', 'noteMoyenne']
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

  // Obtenir les DetailLieux d'un lieu spécifique
  async getDetailLieuxByLieu(req, res) {
    try {
      const { lieuId } = req.params;

      // Vérifier que le lieu existe
      const lieu = await Lieu.findByPk(lieuId, {
        attributes: ['id_lieu', 'nom']
      });

      if (!lieu) {
        return res.status(404).json({
          success: false,
          message: 'Lieu non trouvé'
        });
      }

      // Récupérer tous les DetailLieux de ce lieu
      const detailLieux = await DetailLieu.findAll({
        where: { id_lieu: lieuId },
        attributes: ['id_detailLieu', 'description', 'horaires', 'histoire', 'noteMoyenne'],
        include: [{
          model: Service,
          attributes: ['id', 'nom']
        }]
      });

      res.status(200).json({
        success: true,
        lieu: {
          id: lieu.id_lieu,
          nom: lieu.nom
        },
        count: detailLieux.length,
        data: detailLieux
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des DetailLieux:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des DetailLieux',
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

      // Vérifier que tous les DetailLieu existent
      const detailLieuIds = [...new Set(services.map(s => s.id_detailLieu))];
      const existingDetailLieux = await DetailLieu.findAll({
        where: { id_detailLieu: detailLieuIds },
        transaction
      });

      if (existingDetailLieux.length !== detailLieuIds.length) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Un ou plusieurs DetailLieu n\'existent pas'
        });
      }

      // Créer tous les services
      const createdServices = await Service.bulkCreate(services, { transaction });

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

  // Statistiques des services
  async getServicesStats(req, res) {
    try {
      const { wilayaId, startDate, endDate } = req.query;

      const whereConditions = {};
      const lieuWhereConditions = {};

      if (wilayaId) {
        lieuWhereConditions.wilayaId = wilayaId;
      }

      if (startDate && endDate) {
        whereConditions.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

      // Nombre total de services
      const totalServices = await Service.count({ where: whereConditions });

      // Services par type de lieu
      const servicesByTypeLieu = await Service.findAll({
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('Service.id')), 'count'],
          [sequelize.col('DetailLieu.Lieu.typeLieu'), 'typeLieu']
        ],
        include: [{
          model: DetailLieu,
          attributes: [],
          include: [{
            model: Lieu,
            attributes: [],
            where: lieuWhereConditions
          }]
        }],
        where: whereConditions,
        group: ['DetailLieu.Lieu.typeLieu'],
        raw: true
      });

      // Top 10 lieux avec le plus de services
      const topLieux = await Lieu.findAll({
        attributes: [
          'id_lieu',
          'nom',
          'adresse',
          [sequelize.fn('COUNT', sequelize.col('DetailLieu.Services.id')), 'servicesCount']
        ],
        include: [{
          model: DetailLieu,
          attributes: [],
          include: [{
            model: Service,
            attributes: [],
            where: whereConditions
          }]
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