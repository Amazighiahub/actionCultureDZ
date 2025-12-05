const { Op } = require('sequelize');

class LieuController {
  constructor(models) {
    this.models = models;
  }

  // Récupérer tous les lieux
  async getAllLieux(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        wilaya,
        daira,
        commune,
        type_lieu,
        search,
        with_events = false
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};
      
      // Configuration des includes avec filtrage hiérarchique
      const include = [
        { 
          model: this.models.Commune,
          attributes: ['id_commune', 'nom', 'commune_name_ascii'],
          required: true,
          where: commune ? { id_commune: commune } : {},
          include: [
            {
              model: this.models.Daira,
              attributes: ['id_daira', 'nom', 'daira_name_ascii'],
              required: true,
              where: daira ? { id_daira: daira } : {},
              include: [
                {
                  model: this.models.Wilaya,
                  attributes: ['id_wilaya', 'nom', 'wilaya_name_ascii'],
                  required: true,
                  where: wilaya ? { id_wilaya: wilaya } : {}
                }
              ]
            }
          ]
        },
        { 
          model: this.models.Localite,
          attributes: ['id_localite', 'nom', 'localite_name_ascii'],
          required: false
        },
        { 
          model: this.models.DetailLieu,
          include: [
            { model: this.models.Monument },
            { model: this.models.Vestige }
          ]
        },
        { model: this.models.Service },
        { model: this.models.LieuMedia }
      ];

      // Filtres sur le lieu
      if (type_lieu) where.typeLieu = type_lieu;

      // Recherche textuelle
      if (search) {
        where[Op.or] = [
          { nom: { [Op.like]: `%${search}%` } },
          { adresse: { [Op.like]: `%${search}%` } }
        ];
      }

      // Inclure les événements si demandé
      if (with_events === 'true') {
        include.push({
          model: this.models.Evenement,
          attributes: ['nom_evenement', 'date_debut', 'date_fin'],
          where: { date_fin: { [Op.gte]: new Date() } },
          required: false
        });
      }

      const lieux = await this.models.Lieu.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        include,
        order: [['nom', 'ASC']],
        distinct: true
      });

      // Formater les données pour inclure la hiérarchie géographique
      const lieuxFormates = lieux.rows.map(lieu => {
        const lieuData = lieu.toJSON();
        // Aplatir la hiérarchie géographique pour faciliter l'accès
        lieuData.wilaya = lieuData.Commune?.Daira?.Wilaya || null;
        lieuData.daira = lieuData.Commune?.Daira || null;
        lieuData.commune = lieuData.Commune || null;
        return lieuData;
      });

      res.json({
        success: true,
        data: {
          lieux: lieuxFormates,
          pagination: {
            total: lieux.count,
            page: parseInt(page),
            pages: Math.ceil(lieux.count / limit),
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des lieux:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la récupération des lieux' 
      });
    }
  }

  // Récupérer les lieux d'une wilaya spécifique
  async getLieuxByWilaya(req, res) {
    try {
      const { wilayaId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      // Vérifier que la wilaya existe
      const wilaya = await this.models.Wilaya.findByPk(wilayaId);
      if (!wilaya) {
        return res.status(404).json({
          success: false,
          error: 'Wilaya non trouvée'
        });
      }

      // Récupérer les lieux via la hiérarchie Commune → Daira → Wilaya
      const lieux = await this.models.Lieu.findAndCountAll({
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [
          {
            model: this.models.Commune,
            required: true,
            include: [
              {
                model: this.models.Daira,
                required: true,
                where: { wilayaId: wilayaId },
                include: [
                  {
                    model: this.models.Wilaya,
                    attributes: ['id_wilaya', 'nom']
                  }
                ]
              }
            ]
          },
          { model: this.models.DetailLieu },
          { model: this.models.Service },
          { model: this.models.LieuMedia }
        ],
        order: [['nom', 'ASC']],
        distinct: true
      });

      res.json({
        success: true,
        data: {
          wilaya: wilaya,
          lieux: lieux.rows,
          pagination: {
            total: lieux.count,
            page: parseInt(page),
            pages: Math.ceil(lieux.count / limit)
          }
        }
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Créer un nouveau lieu
  async createLieu(req, res) {
    try {
      const {
        nom,
        typeLieu,
        communeId,
        localiteId,
        adresse,
        latitude,
        longitude,
        details
      } = req.body;

      // Validation des données requises
      if (!nom || !typeLieu || !communeId || !adresse || !latitude || !longitude) {
        return res.status(400).json({
          success: false,
          error: 'Données manquantes. Les champs nom, typeLieu, communeId, adresse, latitude et longitude sont requis.'
        });
      }

      // Validation des coordonnées GPS
      if (latitude < -90 || latitude > 90) {
        return res.status(400).json({
          success: false,
          error: 'Latitude invalide. Doit être entre -90 et 90.'
        });
      }

      if (longitude < -180 || longitude > 180) {
        return res.status(400).json({
          success: false,
          error: 'Longitude invalide. Doit être entre -180 et 180.'
        });
      }

      // Vérifier que la commune existe
      const commune = await this.models.Commune.findByPk(communeId);
      if (!commune) {
        return res.status(404).json({
          success: false,
          error: 'Commune non trouvée'
        });
      }

      // Vérifier la localité si fournie
      if (localiteId) {
        const localite = await this.models.Localite.findByPk(localiteId);
        if (!localite || localite.id_commune !== communeId) {
          return res.status(400).json({
            success: false,
            error: 'Localité invalide ou n\'appartient pas à la commune spécifiée'
          });
        }
      }

      // Créer le lieu
      const lieu = await this.models.Lieu.create({
        nom,
        typeLieu,
        communeId,
        localiteId,
        adresse,
        latitude,
        longitude
      });

      // Créer les détails si fournis
      if (details) {
        await this.models.DetailLieu.create({
          id_lieu: lieu.id_lieu,
          description: details.description,
          horaires: details.horaires,
          histoire: details.histoire,
          referencesHistoriques: details.referencesHistoriques
        });
      }

      // Récupérer le lieu créé avec toutes ses relations
      const lieuComplet = await this.models.Lieu.findByPk(lieu.id_lieu, {
        include: [
          { 
            model: this.models.Commune,
            include: [{
              model: this.models.Daira,
              include: [{ model: this.models.Wilaya }]
            }]
          },
          { model: this.models.Localite },
          { model: this.models.DetailLieu }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Lieu créé avec succès',
        data: lieuComplet
      });

    } catch (error) {
      console.error('Erreur lors de la création du lieu:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la création du lieu' 
      });
    }
  }

  // Mettre à jour un lieu
  async updateLieu(req, res) {
    try {
      const { id } = req.params;
      const {
        nom,
        typeLieu,
        communeId,
        localiteId,
        adresse,
        latitude,
        longitude
      } = req.body;

      // Trouver le lieu
      const lieu = await this.models.Lieu.findByPk(id);
      if (!lieu) {
        return res.status(404).json({
          success: false,
          error: 'Lieu non trouvé'
        });
      }

      // Validation des coordonnées GPS si fournies
      if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
        return res.status(400).json({
          success: false,
          error: 'Latitude invalide. Doit être entre -90 et 90.'
        });
      }

      if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
        return res.status(400).json({
          success: false,
          error: 'Longitude invalide. Doit être entre -180 et 180.'
        });
      }

      // Vérifier la commune si changée
      if (communeId && communeId !== lieu.communeId) {
        const commune = await this.models.Commune.findByPk(communeId);
        if (!commune) {
          return res.status(404).json({
            success: false,
            error: 'Commune non trouvée'
          });
        }
      }

      // Vérifier la localité si fournie
      if (localiteId) {
        const localite = await this.models.Localite.findByPk(localiteId);
        const targetCommuneId = communeId || lieu.communeId;
        if (!localite || localite.id_commune !== targetCommuneId) {
          return res.status(400).json({
            success: false,
            error: 'Localité invalide ou n\'appartient pas à la commune'
          });
        }
      }

      // Mettre à jour le lieu
      await lieu.update({
        nom: nom || lieu.nom,
        typeLieu: typeLieu || lieu.typeLieu,
        communeId: communeId || lieu.communeId,
        localiteId: localiteId !== undefined ? localiteId : lieu.localiteId,
        adresse: adresse || lieu.adresse,
        latitude: latitude !== undefined ? latitude : lieu.latitude,
        longitude: longitude !== undefined ? longitude : lieu.longitude
      });

      // Récupérer le lieu mis à jour avec ses relations
      const lieuMisAJour = await this.models.Lieu.findByPk(id, {
        include: [
          { 
            model: this.models.Commune,
            include: [{
              model: this.models.Daira,
              include: [{ model: this.models.Wilaya }]
            }]
          },
          { model: this.models.Localite },
          { model: this.models.DetailLieu },
          { model: this.models.Service },
          { model: this.models.LieuMedia }
        ]
      });

      res.json({
        success: true,
        message: 'Lieu mis à jour avec succès',
        data: lieuMisAJour
      });

    } catch (error) {
      console.error('Erreur lors de la mise à jour du lieu:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la mise à jour du lieu' 
      });
    }
  }

  // Supprimer un lieu
  async deleteLieu(req, res) {
    try {
      const { id } = req.params;

      const lieu = await this.models.Lieu.findByPk(id);
      if (!lieu) {
        return res.status(404).json({
          success: false,
          error: 'Lieu non trouvé'
        });
      }

      // Supprimer le lieu (les relations cascade seront gérées par la BD)
      await lieu.destroy();

      res.json({
        success: true,
        message: 'Lieu supprimé avec succès'
      });

    } catch (error) {
      console.error('Erreur lors de la suppression du lieu:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la suppression du lieu' 
      });
    }
  }

  // Rechercher des lieux
  async searchLieux(req, res) {
    try {
      const { 
        q,
        type,
        commune,
        daira,
        wilaya,
        radius,
        lat,
        lng,
        page = 1,
        limit = 20
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      // Recherche textuelle
      if (q) {
        where[Op.or] = [
          { nom: { [Op.like]: `%${q}%` } },
          { adresse: { [Op.like]: `%${q}%` } }
        ];
      }

      // Filtre par type
      if (type) {
        where.typeLieu = type;
      }

      // Configuration des includes avec filtrage hiérarchique
      const include = [
        {
          model: this.models.Commune,
          required: true,
          where: commune ? { id_commune: commune } : {},
          include: [
            {
              model: this.models.Daira,
              required: true,
              where: daira ? { id_daira: daira } : {},
              include: [
                {
                  model: this.models.Wilaya,
                  required: true,
                  where: wilaya ? { id_wilaya: wilaya } : {}
                }
              ]
            }
          ]
        },
        { model: this.models.DetailLieu },
        { model: this.models.Service },
        { model: this.models.LieuMedia }
      ];

      // Si recherche par proximité
      let lieux;
      if (radius && lat && lng) {
        // Calcul de distance avec Haversine formula
        const distance = this.models.sequelize.literal(
          `6371 * acos(
            cos(radians(${lat})) * cos(radians(latitude)) * 
            cos(radians(longitude) - radians(${lng})) + 
            sin(radians(${lat})) * sin(radians(latitude))
          )`
        );

        lieux = await this.models.Lieu.findAndCountAll({
          where: {
            ...where,
            [Op.and]: this.models.sequelize.literal(
              `${distance} <= ${radius}`
            )
          },
          attributes: {
            include: [[distance, 'distance']]
          },
          include,
          order: [[this.models.sequelize.literal('distance'), 'ASC']],
          limit: parseInt(limit),
          offset: parseInt(offset),
          distinct: true
        });
      } else {
        lieux = await this.models.Lieu.findAndCountAll({
          where,
          include,
          order: [['nom', 'ASC']],
          limit: parseInt(limit),
          offset: parseInt(offset),
          distinct: true
        });
      }

      res.json({
        success: true,
        data: {
          lieux: lieux.rows,
          pagination: {
            total: lieux.count,
            page: parseInt(page),
            pages: Math.ceil(lieux.count / limit)
          }
        }
      });

    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la recherche' 
      });
    }
  }

  // Obtenir un lieu par ID avec toutes ses relations
  async getLieuById(req, res) {
    try {
      const { id } = req.params;

      const lieu = await this.models.Lieu.findByPk(id, {
        include: [
          { 
            model: this.models.Commune,
            include: [{
              model: this.models.Daira,
              include: [{ model: this.models.Wilaya }]
            }]
          },
          { model: this.models.Localite },
          { 
            model: this.models.DetailLieu,
            include: [
              { model: this.models.Monument },
              { model: this.models.Vestige }
            ]
          },
          { model: this.models.Service },
          { model: this.models.LieuMedia },
          { model: this.models.QrCode },
          {
            model: this.models.Evenement,
            where: { date_fin: { [Op.gte]: new Date() } },
            required: false
          }
        ]
      });

      if (!lieu) {
        return res.status(404).json({
          success: false,
          error: 'Lieu non trouvé'
        });
      }

      // Formater la réponse avec hiérarchie géographique aplatie
      const lieuData = lieu.toJSON();
      lieuData.wilaya = lieuData.Commune?.Daira?.Wilaya || null;
      lieuData.daira = lieuData.Commune?.Daira || null;

      res.json({
        success: true,
        data: lieuData
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Statistiques des lieux
  async getStatistiques(req, res) {
    try {
      // Total des lieux
      const totalLieux = await this.models.Lieu.count();

      // Lieux par type
      const lieuxParType = await this.models.Lieu.findAll({
        attributes: [
          'typeLieu',
          [this.models.sequelize.fn('COUNT', '*'), 'count']
        ],
        group: ['typeLieu']
      });

      // Lieux avec détails
      const lieuxAvecDetails = await this.models.Lieu.count({
        include: [{
          model: this.models.DetailLieu,
          required: true
        }]
      });

      // Lieux avec services
      const lieuxAvecServices = await this.models.Lieu.count({
        include: [{
          model: this.models.Service,
          required: true
        }],
        distinct: true
      });

      // Top wilayas par nombre de lieux (via hiérarchie)
      const topWilayas = await this.models.Wilaya.findAll({
        attributes: [
          'id_wilaya',
          'nom',
          [this.models.sequelize.fn('COUNT', 
            this.models.sequelize.fn('DISTINCT', this.models.sequelize.col('Dairas.Communes.Lieux.id_lieu'))
          ), 'nombreLieux']
        ],
        include: [{
          model: this.models.Daira,
          attributes: [],
          include: [{
            model: this.models.Commune,
            attributes: [],
            include: [{
              model: this.models.Lieu,
              attributes: []
            }]
          }]
        }],
        group: ['Wilaya.id_wilaya'],
        order: [[this.models.sequelize.literal('nombreLieux'), 'DESC']],
        limit: 10,
        subQuery: false
      });

      res.json({
        success: true,
        data: {
          totalLieux,
          lieuxParType,
          lieuxAvecDetails,
          lieuxAvecServices,
          topWilayas
        }
      });

    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors du calcul des statistiques' 
      });
    }
  }

  // Helper : Obtenir la wilaya d'une commune
  async getWilayaFromCommune(communeId) {
    const commune = await this.models.Commune.findByPk(communeId, {
      include: [{
        model: this.models.Daira,
        include: [{ model: this.models.Wilaya }]
      }]
    });
    return commune?.Daira?.Wilaya || null;
  }

  // Helper : Obtenir la daira d'une commune
  async getDairaFromCommune(communeId) {
    const commune = await this.models.Commune.findByPk(communeId, {
      include: [{ model: this.models.Daira }]
    });
    return commune?.Daira || null;
  }
}

module.exports = LieuController;