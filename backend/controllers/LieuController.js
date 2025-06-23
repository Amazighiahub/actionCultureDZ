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
      const include = [
        { 
          model: this.models.Wilaya,
          attributes: ['nom', 'wilaya_name_ascii']
        },
        { 
          model: this.models.Daira,
          attributes: ['nom', 'daira_name_ascii']
        },
        { 
          model: this.models.Commune,
          attributes: ['nom', 'commune_name_ascii']
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

      // Filtres géographiques
      if (wilaya) where.wilayaId = wilaya;
      if (daira) where.dairaId = daira;
      if (commune) where.communeId = commune;
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

      res.json({
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
      console.error('Erreur lors de la récupération des lieux:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la récupération des lieux' 
      });
    }
  }
async searchForSelection(req, res) {
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
      if (search.trim()) {
        where[Op.or] = [
          { nom: { [Op.like]: `%${search}%` } },
          { adresse: { [Op.like]: `%${search}%` } }
        ];
      }

      // Filtre par wilaya si fourni
      if (wilayaId) {
        where.wilayaId = wilayaId;
      }

      // Options d'inclusion de base
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
          attributes: ['id_detailLieu', 'description', 'horaires', 'noteMoyenne'],
          include: [{
            model: Service,
            attributes: ['id', 'nom']
          }]
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
        attributes: ['id_lieu', 'nom', 'adresse']
      });

      if (!lieu) {
        return res.status(404).json({
          success: false,
          message: 'Lieu non trouvé'
        });
      }

      // Récupérer tous les DetailLieux de ce lieu avec leurs services
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
          nom: lieu.nom,
          adresse: lieu.adresse
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

  // Obtenir un lieu complet avec tous ses détails
  async getLieuComplet(req, res) {
    try {
      const { id } = req.params;

      const lieu = await Lieu.findByPk(id, {
        include: [
          { model: Wilaya },
          { model: Daira },
          { model: Commune },
          { 
            model: DetailLieu,
            include: [
              { model: Service }
            ]
          },
          { model: LieuMedia }
        ]
      });

      if (!lieu) {
        return res.status(404).json({
          success: false,
          message: 'Lieu non trouvé'
        });
      }

      res.status(200).json({
        success: true,
        data: lieu
      });

    } catch (error) {
      console.error('Erreur lors de la récupération du lieu:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du lieu',
        error: error.message
      });
    }
  }

  // Recherche avancée avec filtres multiples
  async searchAdvanced(req, res) {
    try {
      const {
        nom,
        wilayaId,
        dairaId,
        communeId,
        typeLieu,
        hasServices,
        noteMoyenneMin,
        latitude,
        longitude,
        radius,
        page = 1,
        limit = 20
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};
      const having = {};

      // Filtres de base
      if (nom) where.nom = { [Op.like]: `%${nom}%` };
      if (wilayaId) where.wilayaId = wilayaId;
      if (dairaId) where.dairaId = dairaId;
      if (communeId) where.communeId = communeId;
      if (typeLieu) where.typeLieu = typeLieu;

      // Construction de la requête
      let query = {
        where,
        include: [
          { model: Wilaya, attributes: ['nom'] },
          { model: Daira, attributes: ['nom'] },
          { model: Commune, attributes: ['nom'] },
          {
            model: DetailLieu,
            attributes: ['id_detailLieu', 'description', 'noteMoyenne'],
            required: hasServices === 'true',
            include: hasServices === 'true' ? [{
              model: Service,
              attributes: ['id', 'nom'],
              required: true
            }] : []
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        distinct: true
      };

      // Filtre par note moyenne
      if (noteMoyenneMin) {
        query.include[3].where = {
          noteMoyenne: { [Op.gte]: parseFloat(noteMoyenneMin) }
        };
      }

      // Recherche par proximité
      if (latitude && longitude && radius) {
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        const rad = parseFloat(radius);

        query.attributes = {
          include: [
            [
              sequelize.literal(`
                (6371 * acos(
                  cos(radians(${lat})) * 
                  cos(radians(latitude)) * 
                  cos(radians(longitude) - radians(${lng})) + 
                  sin(radians(${lat})) * 
                  sin(radians(latitude))
                ))
              `),
              'distance'
            ]
          ]
        };

        having.distance = { [Op.lte]: rad };
        query.having = having;
        query.order = [[sequelize.literal('distance'), 'ASC']];
      } else {
        query.order = [['nom', 'ASC']];
      }

      const lieux = await Lieu.findAndCountAll(query);

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
      console.error('Erreur lors de la recherche avancée:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la recherche',
        error: error.message
      });
    }
  }

  // Suggestions de lieux (pour autocomplete)
  async getSuggestions(req, res) {
    try {
      const { q, limit = 10 } = req.query;

      if (!q || q.length < 2) {
        return res.status(200).json({
          success: true,
          data: []
        });
      }

      const lieux = await Lieu.findAll({
        where: {
          [Op.or]: [
            { nom: { [Op.like]: `${q}%` } },
            { nom: { [Op.like]: `% ${q}%` } },
            { adresse: { [Op.like]: `%${q}%` } }
          ]
        },
        attributes: ['id_lieu', 'nom', 'adresse', 'typeLieu'],
        include: [{
          model: Wilaya,
          attributes: ['nom']
        }],
        limit: parseInt(limit),
        order: [
          [sequelize.literal(`CASE WHEN nom LIKE '${q}%' THEN 0 ELSE 1 END`), 'ASC'],
          ['nom', 'ASC']
        ]
      });

      // Formater pour l'autocomplete
      const suggestions = lieux.map(lieu => ({
        id: lieu.id_lieu,
        label: `${lieu.nom} - ${lieu.adresse}`,
        value: lieu.id_lieu,
        nom: lieu.nom,
        adresse: lieu.adresse,
        typeLieu: lieu.typeLieu,
        wilaya: lieu.Wilaya?.nom
      }));

      res.status(200).json({
        success: true,
        data: suggestions
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des suggestions:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des suggestions',
        error: error.message
      });
    }
  }
  // Récupérer un lieu par ID
  async getLieuById(req, res) {
    try {
      const { id } = req.params;

      const lieu = await this.models.Lieu.findByPk(id, {
        include: [
          { model: this.models.Wilaya },
          { model: this.models.Daira },
          { model: this.models.Commune },
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
          {
            model: this.models.Evenement,
            attributes: ['id_evenement', 'nom_evenement', 'date_debut', 'date_fin', 'description'],
            include: [
              { model: this.models.TypeEvenement, attributes: ['nom_type'] }
            ]
          }
        ]
      });

      if (!lieu) {
        return res.status(404).json({ 
          success: false, 
          error: 'Lieu non trouvé' 
        });
      }

      res.json({
        success: true,
        data: lieu
      });

    } catch (error) {
      console.error('Erreur lors de la récupération du lieu:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la récupération du lieu' 
      });
    }
  }

  // Créer un nouveau lieu
  async createLieu(req, res) {
    const transaction = await this.models.sequelize.transaction();

    try {
      const {
        nom,
        adresse,
        latitude,
        longitude,
        typeLieu,
        wilayaId,
        dairaId,
        communeId,
        localiteId,
        details = {},
        services = [],
        medias = []
      } = req.body;

      // Validation des champs obligatoires
      if (!nom || !adresse || !latitude || !longitude || !typeLieu) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'Les champs nom, adresse, coordonnées et type de lieu sont obligatoires'
        });
      }

      // Créer le lieu
      const lieu = await this.models.Lieu.create({
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

      // Ajouter les détails du lieu
      if (Object.keys(details).length > 0) {
        await this.models.DetailLieu.create({
          id_lieu: lieu.id_lieu,
          description: details.description,
          horaires: details.horaires,
          histoire: details.histoire,
          referencesHistoriques: details.referencesHistoriques
        }, { transaction });
      }

      // Ajouter les services
      if (services.length > 0) {
        for (const service of services) {
          await this.models.Service.create({
            id_lieu: lieu.id_lieu,
            nom: service
          }, { transaction });
        }
      }

      // Ajouter les médias
      if (medias.length > 0) {
        for (const media of medias) {
          await this.models.LieuMedia.create({
            id_lieu: lieu.id_lieu,
            type: media.type,
            url: media.url,
            description: media.description
          }, { transaction });
        }
      }

      await transaction.commit();

      // Récupérer le lieu complet pour la réponse
      const lieuComplet = await this.getLieuComplet(lieu.id_lieu);

      res.status(201).json({
        success: true,
        message: 'Lieu créé avec succès',
        data: lieuComplet
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erreur lors de la création du lieu:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la création du lieu' 
      });
    }
  }
  // Lieux par proximité géographique
  async getLieuxProximite(req, res) {
    try {
      const { latitude, longitude, rayon = 50, limit = 10 } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          error: 'Latitude et longitude requises'
        });
      }

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const radiusKm = parseFloat(rayon);

      // Calcul de la distance avec la formule de Haversine
      const lieux = await this.models.Lieu.findAll({
        attributes: [
          '*',
          [
            this.models.sequelize.literal(`
              (6371 * acos(
                cos(radians(${lat})) * 
                cos(radians(latitude)) * 
                cos(radians(longitude) - radians(${lng})) + 
                sin(radians(${lat})) * 
                sin(radians(latitude))
              ))
            `),
            'distance'
          ]
        ],
        include: [
          { model: this.models.Wilaya, attributes: ['nom'] },
          { model: this.models.DetailLieu, attributes: ['description'] }
        ],
        having: this.models.sequelize.literal(`distance <= ${radiusKm}`),
        order: [this.models.sequelize.literal('distance ASC')],
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: lieux,
        count: lieux.length
      });

    } catch (error) {
      console.error('Erreur lors de la recherche par proximité:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la recherche par proximité' 
      });
    }
  }
  // Statistiques des lieux par wilaya
  async getStatistiquesLieux(req, res) {
    try {
      const stats = await this.models.Lieu.findAll({
        attributes: [
          [this.models.sequelize.fn('COUNT', this.models.sequelize.col('Lieu.id_lieu')), 'total_lieux'],
          [this.models.sequelize.col('Wilaya.nom'), 'wilaya_nom']
        ],
        include: [
          {
            model: this.models.Wilaya,
            attributes: []
          }
        ],
        group: ['Wilaya.id_wilaya', 'Wilaya.nom'],
        order: [[this.models.sequelize.literal('total_lieux'), 'DESC']]
      });

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la récupération des statistiques' 
      });
    }
  }

  // Méthode utilitaire pour récupérer un lieu complet
  async getLieuComplet(id) {
    return await this.models.Lieu.findByPk(id, {
      include: [
        { model: this.models.Wilaya },
        { model: this.models.Daira },
        { model: this.models.Commune },
        { model: this.models.DetailLieu }
      ]
    });
  }
}

module.exports = LieuController;