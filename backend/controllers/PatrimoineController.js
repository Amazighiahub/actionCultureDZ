const { Op } = require('sequelize');
const QRCode = require('qrcode');

class PatrimoineController {
  constructor(models) {
    this.models = models;
    // Récupérer l'instance sequelize depuis les modèles
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
  }

  // ========================================================================
  // MÉTHODES DE BASE
  // ========================================================================

  // Sites patrimoniaux populaires
  async getSitesPopulaires(req, res) {
    try {
      const { limit = 6 } = req.query;

      const sites = await this.models.Lieu.findAll({
        include: [
          {
            model: this.models.DetailLieu,
            required: true
          },
          {
            model: this.models.Commune,
            attributes: ['nom'],
            include: [{
              model: this.models.Daira,
              attributes: ['nom'],
              include: [{
                model: this.models.Wilaya,
                attributes: ['nom']
              }]
            }]
          },
          {
            model: this.models.LieuMedia,
            where: { type: 'image' },
            required: false,
            limit: 1
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit)
      });

      // Ajouter les QR codes à chaque site
      const sitesAvecQR = await Promise.all(
        sites.map(async (site) => {
          const siteData = site.toJSON();
          // Aplatir la hiérarchie géographique
          siteData.wilaya = siteData.Commune?.Daira?.Wilaya || null;
          const qrCodeData = this.createQRCodeData(siteData);
          siteData.qrCode = await this.genererQRCode(qrCodeData);
          return siteData;
        })
      );

      res.json({
        success: true,
        data: sitesAvecQR
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des sites populaires:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Statistiques du patrimoine
  async getStatistiquesPatrimoine(req, res) {
    try {
      const totalSites = await this.models.Lieu.count({
        include: [{
          model: this.models.DetailLieu,
          required: true
        }]
      });

      const totalMonuments = await this.models.Monument?.count() || 0;
      const totalVestiges = await this.models.Vestige?.count() || 0;

      // Sites par wilaya (via hiérarchie Commune → Daira → Wilaya)
      const sitesParWilaya = await this.models.Wilaya.findAll({
        attributes: [
          'id_wilaya',
          'nom',
          [this.sequelize.fn('COUNT', 
            this.sequelize.fn('DISTINCT', this.sequelize.col('Dairas.Communes.Lieux.id_lieu'))
          ), 'total']
        ],
        include: [{
          model: this.models.Daira,
          attributes: [],
          include: [{
            model: this.models.Commune,
            attributes: [],
            include: [{
              model: this.models.Lieu,
              attributes: [],
              include: [{
                model: this.models.DetailLieu,
                required: true,
                attributes: []
              }]
            }]
          }]
        }],
        group: ['Wilaya.id_wilaya'],
        order: [[this.sequelize.literal('total'), 'DESC']],
        subQuery: false
      });

      // Sites les plus populaires (simulation)
      const topSites = await this.models.Lieu.findAll({
        include: [
          {
            model: this.models.DetailLieu,
            required: true,
            attributes: ['noteMoyenne']
          },
          {
            model: this.models.Commune,
            attributes: ['nom']
          }
        ],
        order: [
          [this.models.DetailLieu, 'noteMoyenne', 'DESC NULLS LAST']
        ],
        limit: 5
      });

      res.json({
        success: true,
        data: {
          totalSites,
          totalMonuments,
          totalVestiges,
          sitesParWilaya: sitesParWilaya.map(w => ({
            wilaya: w.nom,
            total: parseInt(w.dataValues.total) || 0
          })),
          topSites
        }
      });

    } catch (error) {
      console.error('Erreur lors des statistiques:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // ========================================================================
  // GESTION DES MONUMENTS
  // ========================================================================

  async getAllMonuments(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10,
        type,
        wilaya,
        search
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      if (type) {
        where.type = type;
      }

      if (search) {
        where.nom = { [Op.like]: `%${search}%` };
      }

      // Configuration des includes avec filtrage par wilaya si nécessaire
      const includeDetailLieu = {
        model: this.models.DetailLieu,
        required: true,
        include: [{
          model: this.models.Lieu,
          required: true,
          include: [{
            model: this.models.Commune,
            required: true,
            include: [{
              model: this.models.Daira,
              required: true,
              include: [{
                model: this.models.Wilaya,
                required: true,
                where: wilaya ? { id_wilaya: wilaya } : {}
              }]
            }]
          }]
        }]
      };

      const monuments = await this.models.Monument.findAndCountAll({
        where,
        include: [includeDetailLieu],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']],
        distinct: true
      });

      res.json({
        success: true,
        data: {
          monuments: monuments.rows,
          pagination: {
            total: monuments.count,
            page: parseInt(page),
            pages: Math.ceil(monuments.count / limit)
          }
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des monuments:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  async createMonument(req, res) {
    try {
      const { nom, type, description, id_detail_lieu } = req.body;

      // Vérifier que le DetailLieu existe
      const detailLieu = await this.models.DetailLieu.findByPk(id_detail_lieu);
      if (!detailLieu) {
        return res.status(404).json({
          success: false,
          error: 'DetailLieu non trouvé'
        });
      }

      const monument = await this.models.Monument.create({
        nom,
        type,
        description,
        id_detail_lieu // Utiliser snake_case
      });

      // Récupérer le monument créé avec ses relations
      const monumentComplet = await this.models.Monument.findByPk(monument.id, {
        include: [{
          model: this.models.DetailLieu,
          include: [{
            model: this.models.Lieu,
            include: [{
              model: this.models.Commune,
              include: [{
                model: this.models.Daira,
                include: [{ model: this.models.Wilaya }]
              }]
            }]
          }]
        }]
      });

      res.status(201).json({
        success: true,
        message: 'Monument créé avec succès',
        data: monumentComplet
      });

    } catch (error) {
      console.error('Erreur lors de la création du monument:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  async updateMonument(req, res) {
    try {
      const { id } = req.params;
      const { nom, type, description } = req.body;

      const monument = await this.models.Monument.findByPk(id);
      if (!monument) {
        return res.status(404).json({
          success: false,
          error: 'Monument non trouvé'
        });
      }

      await monument.update({
        nom: nom || monument.nom,
        type: type || monument.type,
        description: description || monument.description
      });

      res.json({
        success: true,
        message: 'Monument mis à jour avec succès',
        data: monument
      });

    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  async deleteMonument(req, res) {
    try {
      const { id } = req.params;

      const monument = await this.models.Monument.findByPk(id);
      if (!monument) {
        return res.status(404).json({
          success: false,
          error: 'Monument non trouvé'
        });
      }

      await monument.destroy();

      res.json({
        success: true,
        message: 'Monument supprimé avec succès'
      });

    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // ========================================================================
  // GESTION DES VESTIGES
  // ========================================================================

  async getAllVestiges(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10,
        type,
        wilaya,
        search
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      if (type) {
        where.type = type;
      }

      if (search) {
        where.nom = { [Op.like]: `%${search}%` };
      }

      // Configuration des includes avec filtrage par wilaya si nécessaire
      const includeDetailLieu = {
        model: this.models.DetailLieu,
        required: true,
        include: [{
          model: this.models.Lieu,
          required: true,
          include: [{
            model: this.models.Commune,
            required: true,
            include: [{
              model: this.models.Daira,
              required: true,
              include: [{
                model: this.models.Wilaya,
                required: true,
                where: wilaya ? { id_wilaya: wilaya } : {}
              }]
            }]
          }]
        }]
      };

      const vestiges = await this.models.Vestige.findAndCountAll({
        where,
        include: [includeDetailLieu],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']],
        distinct: true
      });

      res.json({
        success: true,
        data: {
          vestiges: vestiges.rows,
          pagination: {
            total: vestiges.count,
            page: parseInt(page),
            pages: Math.ceil(vestiges.count / limit)
          }
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des vestiges:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  async createVestige(req, res) {
    try {
      const { nom, type, description, id_detail_lieu } = req.body;

      // Vérifier que le DetailLieu existe
      const detailLieu = await this.models.DetailLieu.findByPk(id_detail_lieu);
      if (!detailLieu) {
        return res.status(404).json({
          success: false,
          error: 'DetailLieu non trouvé'
        });
      }

      const vestige = await this.models.Vestige.create({
        nom,
        type,
        description,
        id_detail_lieu // Utiliser snake_case
      });

      // Récupérer le vestige créé avec ses relations
      const vestigeComplet = await this.models.Vestige.findByPk(vestige.id, {
        include: [{
          model: this.models.DetailLieu,
          include: [{
            model: this.models.Lieu,
            include: [{
              model: this.models.Commune,
              include: [{
                model: this.models.Daira,
                include: [{ model: this.models.Wilaya }]
              }]
            }]
          }]
        }]
      });

      res.status(201).json({
        success: true,
        message: 'Vestige créé avec succès',
        data: vestigeComplet
      });

    } catch (error) {
      console.error('Erreur lors de la création du vestige:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // ========================================================================
  // GESTION COMPLÈTE DU PATRIMOINE
  // ========================================================================

  async createSitePatrimonialComplet(req, res) {
    const transaction = await this.sequelize.transaction();
    
    try {
      const {
        lieu,
        detailsLieu,
        monuments = [],
        vestiges = [],
        services = [],
        medias = []
      } = req.body;

      // 1. Créer le lieu avec validation des coordonnées GPS
      if (!lieu.nom || !lieu.communeId || !lieu.latitude || !lieu.longitude) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'Données du lieu incomplètes'
        });
      }

      // Validation GPS
      if (lieu.latitude < -90 || lieu.latitude > 90) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'Latitude invalide'
        });
      }

      if (lieu.longitude < -180 || lieu.longitude > 180) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'Longitude invalide'
        });
      }

      const nouveauLieu = await this.models.Lieu.create({
        nom: lieu.nom,
        typeLieu: lieu.typeLieu || 'Commune',
        communeId: lieu.communeId,
        localiteId: lieu.localiteId,
        adresse: lieu.adresse,
        latitude: lieu.latitude,
        longitude: lieu.longitude
      }, { transaction });

      // 2. Créer les détails du lieu
      const nouveauxDetails = await this.models.DetailLieu.create({
        id_lieu: nouveauLieu.id_lieu,
        description: detailsLieu.description,
        horaires: detailsLieu.horaires,
        histoire: detailsLieu.histoire,
        referencesHistoriques: detailsLieu.referencesHistoriques,
        noteMoyenne: null
      }, { transaction });

      // 3. Créer les monuments (avec snake_case)
      for (const monument of monuments) {
        await this.models.Monument.create({
          nom: monument.nom,
          type: monument.type,
          description: monument.description,
          id_detail_lieu: nouveauxDetails.id_detailLieu
        }, { transaction });
      }

      // 4. Créer les vestiges (avec snake_case)
      for (const vestige of vestiges) {
        await this.models.Vestige.create({
          nom: vestige.nom,
          type: vestige.type,
          description: vestige.description,
          id_detail_lieu: nouveauxDetails.id_detailLieu
        }, { transaction });
      }

      // 5. Créer les services (liés directement au lieu)
      for (const service of services) {
        await this.models.Service.create({
          nom: service.nom,
          id_lieu: nouveauLieu.id_lieu,
          disponible: service.disponible !== undefined ? service.disponible : true,
          description: service.description
        }, { transaction });
      }

      // 6. Créer les médias
      for (const media of medias) {
        await this.models.LieuMedia.create({
          id_lieu: nouveauLieu.id_lieu,
          type: media.type,
          url: media.url,
          description: media.description
        }, { transaction });
      }

      // 7. Générer et sauvegarder le QR Code
      const qrCodeData = {
        id: nouveauLieu.id_lieu,
        nom: nouveauLieu.nom,
        type: 'patrimoine'
      };

      const qrCodeUrl = await this.genererQRCode(qrCodeData);
      
      await this.models.QrCode.create({
        id_lieu: nouveauLieu.id_lieu,
        code_unique: `PAT-${Date.now()}-${nouveauLieu.id_lieu}`,
        url_destination: `/patrimoine/site/${nouveauLieu.id_lieu}`,
        qr_image_url: qrCodeUrl,
        actif: true
      }, { transaction });

      await transaction.commit();

      // Récupérer le site complet créé
      const siteComplet = await this.models.Lieu.findByPk(nouveauLieu.id_lieu, {
        include: [
          { 
            model: this.models.Commune,
            include: [{
              model: this.models.Daira,
              include: [{ model: this.models.Wilaya }]
            }]
          },
          { 
            model: this.models.DetailLieu,
            include: [
              { model: this.models.Monument },
              { model: this.models.Vestige }
            ]
          },
          { model: this.models.Service },
          { model: this.models.LieuMedia },
          { model: this.models.QrCode }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Site patrimonial créé avec succès',
        data: siteComplet
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erreur lors de la création du site:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la création' 
      });
    }
  }

  // ========================================================================
  // RECHERCHE ET FILTRAGE
  // ========================================================================

  async searchPatrimoine(req, res) {
    try {
      const { 
        q,
        type,
        wilaya,
        includeMonuments = true,
        includeVestiges = true,
        page = 1,
        limit = 20
      } = req.query;

      const offset = (page - 1) * limit;
      const results = {
        lieux: [],
        monuments: [],
        vestiges: []
      };

      // Configuration de la recherche pour les lieux
      const lieuWhere = {};
      if (q) {
        lieuWhere[Op.or] = [
          { nom: { [Op.like]: `%${q}%` } },
          { adresse: { [Op.like]: `%${q}%` } }
        ];
      }

      // Include avec filtrage par wilaya via la hiérarchie
      const lieuInclude = [
        {
          model: this.models.DetailLieu,
          required: true
        },
        {
          model: this.models.Commune,
          required: true,
          include: [{
            model: this.models.Daira,
            required: true,
            include: [{
              model: this.models.Wilaya,
              required: true,
              where: wilaya ? { id_wilaya: wilaya } : {}
            }]
          }]
        }
      ];

      // Rechercher les lieux
      const lieux = await this.models.Lieu.findAll({
        where: lieuWhere,
        include: lieuInclude,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      results.lieux = lieux;

      // Rechercher les monuments si demandé
      if (includeMonuments === 'true') {
        const monumentWhere = q ? { nom: { [Op.like]: `%${q}%` } } : {};
        if (type) monumentWhere.type = type;

        const monuments = await this.models.Monument.findAll({
          where: monumentWhere,
          include: [{
            model: this.models.DetailLieu,
            include: [{
              model: this.models.Lieu,
              include: [{
                model: this.models.Commune,
                include: [{
                  model: this.models.Daira,
                  include: [{
                    model: this.models.Wilaya,
                    where: wilaya ? { id_wilaya: wilaya } : {}
                  }]
                }]
              }]
            }]
          }],
          limit: parseInt(limit)
        });
        results.monuments = monuments;
      }

      // Rechercher les vestiges si demandé
      if (includeVestiges === 'true') {
        const vestigeWhere = q ? { nom: { [Op.like]: `%${q}%` } } : {};
        if (type) vestigeWhere.type = type;

        const vestiges = await this.models.Vestige.findAll({
          where: vestigeWhere,
          include: [{
            model: this.models.DetailLieu,
            include: [{
              model: this.models.Lieu,
              include: [{
                model: this.models.Commune,
                include: [{
                  model: this.models.Daira,
                  include: [{
                    model: this.models.Wilaya,
                    where: wilaya ? { id_wilaya: wilaya } : {}
                  }]
                }]
              }]
            }]
          }],
          limit: parseInt(limit)
        });
        results.vestiges = vestiges;
      }

      res.json({
        success: true,
        data: results,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit)
        }
      });

    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // ========================================================================
  // QR CODES
  // ========================================================================

  async genererQRCode(data) {
    try {
      const qrCodeData = JSON.stringify(data);
      const qrCodeUrl = await QRCode.toDataURL(qrCodeData);
      return qrCodeUrl;
    } catch (error) {
      console.error('Erreur lors de la génération du QR code:', error);
      throw error;
    }
  }

  createQRCodeData(site) {
    return {
      id: site.id_lieu,
      nom: site.nom,
      adresse: site.adresse,
      coordinates: {
        lat: site.latitude,
        lng: site.longitude
      },
      wilaya: site.wilaya?.nom || site.Commune?.Daira?.Wilaya?.nom,
      type: 'patrimoine',
      url: `/patrimoine/site/${site.id_lieu}`
    };
  }

  async scanQRCode(req, res) {
    try {
      const { code_unique, id_user } = req.body;
      const { ip } = req;
      const userAgent = req.headers['user-agent'];

      // Trouver le QR code
      const qrCode = await this.models.QrCode.findOne({
        where: { 
          code_unique,
          actif: true
        }
      });

      if (!qrCode) {
        return res.status(404).json({
          success: false,
          error: 'QR Code invalide ou inactif'
        });
      }

      // Vérifier l'expiration
      if (qrCode.date_expiration && new Date(qrCode.date_expiration) < new Date()) {
        return res.status(410).json({
          success: false,
          error: 'QR Code expiré'
        });
      }

      // Enregistrer le scan
      const scan = await this.models.QrScan.create({
        id_qr_code: qrCode.id_qr_code,
        id_user: id_user || null,
        ip_address: ip,
        user_agent: userAgent,
        device_type: this.detectDeviceType(userAgent),
        date_scan: new Date()
      });

      // Récupérer les informations du lieu
      const lieu = await this.models.Lieu.findByPk(qrCode.id_lieu, {
        include: [
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
            model: this.models.Commune,
            include: [{
              model: this.models.Daira,
              include: [{ model: this.models.Wilaya }]
            }]
          }
        ]
      });

      res.json({
        success: true,
        data: lieu,
        qrCode: {
          url_destination: qrCode.url_destination
        }
      });

    } catch (error) {
      console.error('Erreur lors du scan:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  detectDeviceType(userAgent) {
    if (/mobile/i.test(userAgent)) return 'mobile';
    if (/tablet/i.test(userAgent)) return 'tablet';
    return 'desktop';
  }

  // ========================================================================
  // PARCOURS TOURISTIQUES
  // ========================================================================

  async getParcoursPatrimoniaux(req, res) {
    try {
      const { wilaya, theme, difficulte, page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
      const where = {};

      if (theme) where.theme = theme;
      if (difficulte) where.difficulte = difficulte;

      const parcours = await this.models.Parcours.findAndCountAll({
        where,
        include: [{
          model: this.models.ParcoursLieu,
          include: [{
            model: this.models.Lieu,
            include: [
              { model: this.models.DetailLieu },
              { 
                model: this.models.Commune,
                include: [{
                  model: this.models.Daira,
                  include: [{
                    model: this.models.Wilaya,
                    where: wilaya ? { id_wilaya: wilaya } : {}
                  }]
                }]
              }
            ]
          }]
        }],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          parcours: parcours.rows,
          pagination: {
            total: parcours.count,
            page: parseInt(page),
            pages: Math.ceil(parcours.count / limit)
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
}

module.exports = PatrimoineController;