// controllers/PatrimoineController.js - VERSION i18n
const { Op } = require('sequelize');
const QRCode = require('qrcode');

// ⚡ Import du helper i18n
const { translate, translateDeep, createMultiLang, mergeTranslations } = require('../helpers/i18n');

// ✅ OPTIMISATION: Import de l'utilitaire de recherche multilingue centralisé
const { buildMultiLangSearch } = require('../utils/MultiLangSearchBuilder');

class PatrimoineController {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
  }

  // ⚡ Recherche multilingue - utilise l'utilitaire centralisé
  buildMultiLangSearchLocal(field, search) {
    return buildMultiLangSearch(this.sequelize, field, search);
  }

  // Sites patrimoniaux populaires
  async getSitesPopulaires(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { limit = 6, typePatrimoine } = req.query;

      // Construire le filtre
      const where = {};
      if (typePatrimoine) {
        where.typePatrimoine = typePatrimoine;
      }

      // Requête - Lieu avec DetailLieu (optionnel), LieuMedia, Services, QRCode
      const sites = await this.models.Lieu.findAll({
        where,
        include: [
          {
            model: this.models.DetailLieu,
            required: false,  // Optionnel - afficher même sans détails
            include: [
              { model: this.models.Monument, required: false },
              { model: this.models.Vestige, required: false }
            ]
          },
          { model: this.models.LieuMedia, required: false },
          { model: this.models.Service, required: false },
          { model: this.models.QRCode, required: false },
          { model: this.models.Programme, required: false }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit)
      });

      // Pour chaque site, récupérer les infos de localisation séparément
      const sitesFormates = await Promise.all(sites.map(async (site) => {
        const siteData = site.toJSON();

        // Récupérer la commune avec Daira et Wilaya
        if (siteData.communeId && this.models.Commune) {
          try {
            const commune = await this.models.Commune.findByPk(siteData.communeId, {
              include: [{
                model: this.models.Daira,
                include: [{ model: this.models.Wilaya }]
              }]
            });
            if (commune) {
              const communeData = commune.toJSON();
              siteData.commune = communeData;
              siteData.daira = communeData.Daira;
              siteData.wilaya = communeData.Daira?.Wilaya;
              siteData.wilaya_id = communeData.Daira?.Wilaya?.id_wilaya;
            }
          } catch (e) {
            // Ignorer les erreurs de récupération de localisation
          }
        }

        // Normaliser les champs
        siteData.medias = siteData.LieuMedias || siteData.LieuMedia || [];
        siteData.services = siteData.Services || [];
        siteData.qrcodes = siteData.QRCodes || [];
        siteData.programmes = siteData.Programmes || [];
        siteData.monuments = siteData.DetailLieu?.Monuments || [];
        siteData.vestiges = siteData.DetailLieu?.Vestiges || [];

        return siteData;
      }));

      res.json({
        success: true,
        data: translateDeep(sitesFormates, lang),
        count: sitesFormates.length,
        lang
      });

    } catch (error) {
      console.error('Erreur getSitesPopulaires:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur', details: error.message });
    }
  }

  // Statistiques du patrimoine
  async getStatistiquesPatrimoine(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡

      const totalSites = await this.models.Lieu.count({
        include: [{ model: this.models.DetailLieu, required: true }]
      });

      const totalMonuments = await this.models.Monument?.count() || 0;
      const totalVestiges = await this.models.Vestige?.count() || 0;

      // ⚡ Statistiques par type de patrimoine
      const sitesParType = await this.models.Lieu.findAll({
        attributes: [
          'typePatrimoine',
          [this.sequelize.fn('COUNT', this.sequelize.col('id_lieu')), 'total']
        ],
        group: ['typePatrimoine'],
        raw: true
      });

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
              include: [{ model: this.models.DetailLieu, required: true, attributes: [] }]
            }]
          }]
        }],
        group: ['Wilaya.id_wilaya'],
        order: [[this.sequelize.literal('total'), 'DESC']],
        subQuery: false
      });

      res.json({
        success: true,
        data: {
          totalSites,
          totalMonuments,
          totalVestiges,
          sitesParType: sitesParType.map(s => ({
            type: s.typePatrimoine,
            total: parseInt(s.total) || 0
          })),
          sitesParWilaya: translateDeep(sitesParWilaya, lang).map(w => ({
            wilaya: w.nom,
            total: parseInt(w.dataValues?.total) || 0
          }))
        },
        lang
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // ⚡ Obtenir les types de patrimoine disponibles
  async getTypesPatrimoine(req, res) {
    try {
      const lang = req.lang || 'fr';

      // Labels traduits pour chaque type
      const typeLabels = {
        ville_village: { fr: 'Ville / Village', ar: 'مدينة / قرية', en: 'City / Village' },
        monument: { fr: 'Monument', ar: 'نصب تذكاري', en: 'Monument' },
        musee: { fr: 'Musée', ar: 'متحف', en: 'Museum' },
        site_archeologique: { fr: 'Site archéologique', ar: 'موقع أثري', en: 'Archaeological Site' },
        site_naturel: { fr: 'Site naturel', ar: 'موقع طبيعي', en: 'Natural Site' },
        edifice_religieux: { fr: 'Édifice religieux', ar: 'مبنى ديني', en: 'Religious Building' },
        palais_forteresse: { fr: 'Palais / Forteresse', ar: 'قصر / حصن', en: 'Palace / Fortress' },
        autre: { fr: 'Autre', ar: 'أخرى', en: 'Other' }
      };

      // Compter les sites par type
      const counts = await this.models.Lieu.findAll({
        attributes: [
          'typePatrimoine',
          [this.sequelize.fn('COUNT', this.sequelize.col('id_lieu')), 'count']
        ],
        group: ['typePatrimoine'],
        raw: true
      });

      const countMap = {};
      counts.forEach(c => {
        countMap[c.typePatrimoine] = parseInt(c.count) || 0;
      });

      // Construire la réponse avec labels et comptages
      const types = Object.entries(typeLabels).map(([key, labels]) => ({
        value: key,
        label: labels[lang] || labels.fr,
        count: countMap[key] || 0
      }));

      res.json({
        success: true,
        data: types,
        lang
      });

    } catch (error) {
      console.error('Erreur getTypesPatrimoine:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Rechercher des sites patrimoniaux
  async searchSitesPatrimoniaux(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const {
        q,
        wilaya,
        type,           // typeLieu (Wilaya, Daira, Commune)
        typePatrimoine, // Type de patrimoine (ville_village, monument, musee, etc.)
        page = 1,
        limit = 20
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      // ⚡ Recherche multilingue
      if (q) {
        where[Op.or] = [
          ...this.buildMultiLangSearchLocal('nom', q),
          ...this.buildMultiLangSearchLocal('adresse', q)
        ];
      }

      if (type) {
        where.typeLieu = type;
      }

      // ⚡ Filtre par type de patrimoine
      if (typePatrimoine) {
        where.typePatrimoine = typePatrimoine;
      }

      const include = [
        { model: this.models.DetailLieu, required: true },
        {
          model: this.models.Commune,
          include: [{
            model: this.models.Daira,
            include: [{
              model: this.models.Wilaya,
              where: wilaya ? { id_wilaya: wilaya } : {}
            }]
          }]
        },
        { model: this.models.LieuMedia, limit: 1, required: false }
      ];

      const sites = await this.models.Lieu.findAndCountAll({
        where,
        include,
        limit: parseInt(limit),
        offset,
        distinct: true
      });

      // ⚡ Traduire
      res.json({
        success: true,
        data: {
          sites: translateDeep(sites.rows, lang),
          pagination: {
            total: sites.count,
            page: parseInt(page),
            pages: Math.ceil(sites.count / limit)
          }
        },
        lang
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Récupérer un site par ID
  async getSiteById(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { id } = req.params;

      const site = await this.models.Lieu.findByPk(id, {
        include: [
          {
            model: this.models.DetailLieu,
            include: [
              { model: this.models.Monument },
              { model: this.models.Vestige }
            ]
          },
          {
            model: this.models.Commune,
            include: [{
              model: this.models.Daira,
              include: [{ model: this.models.Wilaya }]
            }]
          },
          { model: this.models.LieuMedia },
          { model: this.models.Service }
        ]
      });

      if (!site) {
        return res.status(404).json({ success: false, error: 'Site non trouvé' });
      }

      const siteData = site.toJSON();
      siteData.qrCode = await this.genererQRCode(this.createQRCodeData(siteData));

      // ⚡ Traduire
      res.json({
        success: true,
        data: translateDeep(siteData, lang),
        lang
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // ========================================================================
  // MONUMENTS
  // ========================================================================

  async getMonuments(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { page = 1, limit = 20, wilaya, search } = req.query;
      const offset = (page - 1) * limit;

      const where = {};
      if (search) {
        where[Op.or] = [
          ...this.buildMultiLangSearchLocal('nom', search),
          ...this.buildMultiLangSearchLocal('description', search)
        ];
      }

      const monuments = await this.models.Monument.findAndCountAll({
        where,
        include: [
          {
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
          }
        ],
        limit: parseInt(limit),
        offset,
        distinct: true
      });

      // ⚡ Traduire
      res.json({
        success: true,
        data: {
          monuments: translateDeep(monuments.rows, lang),
          pagination: {
            total: monuments.count,
            page: parseInt(page),
            pages: Math.ceil(monuments.count / limit)
          }
        },
        lang
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  async getMonumentById(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { id } = req.params;

      const monument = await this.models.Monument.findByPk(id, {
        include: [
          {
            model: this.models.DetailLieu,
            include: [{
              model: this.models.Lieu,
              include: [
                { model: this.models.Commune },
                { model: this.models.LieuMedia },
                { model: this.models.Service }
              ]
            }]
          }
        ]
      });

      if (!monument) {
        return res.status(404).json({ success: false, error: 'Monument non trouvé' });
      }

      // ⚡ Traduire
      res.json({
        success: true,
        data: translateDeep(monument, lang),
        lang
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // ========================================================================
  // VESTIGES
  // ========================================================================

  async getVestiges(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { page = 1, limit = 20, wilaya, search } = req.query;
      const offset = (page - 1) * limit;

      const where = {};
      if (search) {
        where[Op.or] = [
          ...this.buildMultiLangSearchLocal('nom', search),
          ...this.buildMultiLangSearchLocal('description', search)
        ];
      }

      const vestiges = await this.models.Vestige.findAndCountAll({
        where,
        include: [
          {
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
          }
        ],
        limit: parseInt(limit),
        offset,
        distinct: true
      });

      // ⚡ Traduire
      res.json({
        success: true,
        data: {
          vestiges: translateDeep(vestiges.rows, lang),
          pagination: {
            total: vestiges.count,
            page: parseInt(page),
            pages: Math.ceil(vestiges.count / limit)
          }
        },
        lang
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  async getVestigeById(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { id } = req.params;

      const vestige = await this.models.Vestige.findByPk(id, {
        include: [
          {
            model: this.models.DetailLieu,
            include: [{
              model: this.models.Lieu,
              include: [
                { model: this.models.Commune },
                { model: this.models.LieuMedia },
                { model: this.models.Service }
              ]
            }]
          }
        ]
      });

      if (!vestige) {
        return res.status(404).json({ success: false, error: 'Vestige non trouvé' });
      }

      // ⚡ Traduire
      res.json({
        success: true,
        data: translateDeep(vestige, lang),
        lang
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // ========================================================================
  // MÉTHODES CRUD SITES PATRIMONIAUX
  // ========================================================================

  // Tous les sites patrimoniaux avec pagination
  async getAllSitesPatrimoniaux(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { page = 1, limit = 20, wilaya, search, includeQR } = req.query;
      const offset = (page - 1) * limit;

      const where = {};
      if (search) {
        where[Op.or] = [
          ...this.buildMultiLangSearchLocal('nom', search),
          ...this.buildMultiLangSearchLocal('adresse', search)
        ];
      }

      const include = [
        { model: this.models.DetailLieu, required: true },
        {
          model: this.models.Commune,
          include: [{
            model: this.models.Daira,
            include: [{
              model: this.models.Wilaya,
              where: wilaya ? { id_wilaya: wilaya } : {}
            }]
          }]
        },
        { model: this.models.LieuMedia, limit: 3, required: false }
      ];

      const sites = await this.models.Lieu.findAndCountAll({
        where,
        include,
        limit: parseInt(limit),
        offset,
        distinct: true,
        order: [['createdAt', 'DESC']]
      });

      let sitesData = sites.rows.map(site => site.toJSON());

      // Générer QR codes si demandé
      if (includeQR === 'true') {
        sitesData = await Promise.all(
          sitesData.map(async (site) => {
            site.qrCode = await this.genererQRCode(this.createQRCodeData(site));
            return site;
          })
        );
      }

      res.json({
        success: true,
        data: {
          sites: translateDeep(sitesData, lang),
          pagination: {
            total: sites.count,
            page: parseInt(page),
            pages: Math.ceil(sites.count / limit)
          }
        },
        lang
      });

    } catch (error) {
      console.error('Erreur getAllSitesPatrimoniaux:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Recherche patrimoine
  async recherchePatrimoine(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { q, wilaya, limit = 20 } = req.query;

      if (!q || q.length < 2) {
        return res.json({ success: true, data: [], lang });
      }

      const where = {
        [Op.or]: [
          ...this.buildMultiLangSearchLocal('nom', q),
          ...this.buildMultiLangSearchLocal('adresse', q)
        ]
      };

      const include = [
        { model: this.models.DetailLieu, required: true },
        {
          model: this.models.Commune,
          include: [{
            model: this.models.Daira,
            include: [{
              model: this.models.Wilaya,
              where: wilaya ? { id_wilaya: parseInt(wilaya) } : {}
            }]
          }]
        },
        { model: this.models.LieuMedia, limit: 1, required: false }
      ];

      const sites = await this.models.Lieu.findAll({
        where,
        include,
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: translateDeep(sites, lang),
        lang
      });

    } catch (error) {
      console.error('Erreur recherchePatrimoine:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Monuments par type
  async getMonumentsByType(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { type } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const where = {};
      if (type && type !== 'all') {
        where.type_monument = type;
      }

      const monuments = await this.models.Monument.findAndCountAll({
        where,
        include: [{
          model: this.models.DetailLieu,
          include: [{
            model: this.models.Lieu,
            include: [
              { model: this.models.Commune },
              { model: this.models.LieuMedia, limit: 1, required: false }
            ]
          }]
        }],
        limit: parseInt(limit),
        offset,
        distinct: true
      });

      res.json({
        success: true,
        data: {
          monuments: translateDeep(monuments.rows, lang),
          pagination: {
            total: monuments.count,
            page: parseInt(page),
            pages: Math.ceil(monuments.count / limit)
          }
        },
        lang
      });

    } catch (error) {
      console.error('Erreur getMonumentsByType:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Vestiges par type
  async getVestigesByType(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { type } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const where = {};
      if (type && type !== 'all') {
        where.type_vestige = type;
      }

      const vestiges = await this.models.Vestige.findAndCountAll({
        where,
        include: [{
          model: this.models.DetailLieu,
          include: [{
            model: this.models.Lieu,
            include: [
              { model: this.models.Commune },
              { model: this.models.LieuMedia, limit: 1, required: false }
            ]
          }]
        }],
        limit: parseInt(limit),
        offset,
        distinct: true
      });

      res.json({
        success: true,
        data: {
          vestiges: translateDeep(vestiges.rows, lang),
          pagination: {
            total: vestiges.count,
            page: parseInt(page),
            pages: Math.ceil(vestiges.count / limit)
          }
        },
        lang
      });

    } catch (error) {
      console.error('Erreur getVestigesByType:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Détail complet d'un site patrimonial
  async getSitePatrimonialById(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { id } = req.params;

      const site = await this.models.Lieu.findByPk(id, {
        include: [
          {
            model: this.models.DetailLieu,
            required: false,
            include: [
              { model: this.models.Monument, required: false },
              { model: this.models.Vestige, required: false }
            ]
          },
          {
            model: this.models.Commune,
            required: false,
            include: [{
              model: this.models.Daira,
              include: [{ model: this.models.Wilaya }]
            }]
          },
          { model: this.models.LieuMedia, required: false },
          { model: this.models.Service, required: false },
          { model: this.models.QRCode, required: false },
          {
            model: this.models.Programme,
            required: false,
            include: [
              {
                model: this.models.Evenement,
                as: 'Evenement',
                required: false,
                attributes: ['id_evenement', 'nom_evenement', 'date_debut', 'date_fin', 'statut']
              }
            ]
          }
        ]
      });

      if (!site) {
        return res.status(404).json({ success: false, error: 'Site non trouvé' });
      }

      const siteData = site.toJSON();

      // Générer le QR Code dynamiquement s'il n'existe pas déjà
      if (!siteData.QRCodes?.length) {
        siteData.qrCodeGenerated = await this.genererQRCode(this.createQRCodeData(siteData));
      }

      // Récupérer les parcours qui passent par ce lieu (avec gestion d'erreur)
      let parcours = [];
      try {
        if (this.models.ParcoursLieu) {
          parcours = await this.models.ParcoursLieu.findAll({
            where: { id_lieu: id },
            include: [{
              model: this.models.Parcours,
              attributes: ['id_parcours', 'nom_parcours', 'description', 'duree_estimee', 'difficulte', 'theme', 'distance_km']
            }]
          });
        }
      } catch (parcoursError) {
        console.warn('Erreur récupération parcours:', parcoursError.message);
        // On continue sans les parcours
      }

      // Normaliser les données
      siteData.medias = siteData.LieuMedias || siteData.LieuMedia || [];
      siteData.services = siteData.Services || [];
      siteData.qrcodes = siteData.QRCodes || [];
      siteData.programmes = siteData.Programmes || [];
      siteData.monuments = siteData.DetailLieu?.Monuments || [];
      siteData.vestiges = siteData.DetailLieu?.Vestiges || [];
      siteData.parcours = parcours.map(p => p.Parcours).filter(Boolean);

      // Informations géographiques
      siteData.commune = siteData.Commune;
      siteData.daira = siteData.Commune?.Daira;
      siteData.wilaya = siteData.Commune?.Daira?.Wilaya;

      // Calculer les statistiques
      siteData.stats = {
        totalMedias: siteData.medias.length,
        totalServices: siteData.services.length,
        totalMonuments: siteData.monuments.length,
        totalVestiges: siteData.vestiges.length,
        totalProgrammes: siteData.programmes.length,
        totalParcours: siteData.parcours.length,
        noteMoyenne: siteData.DetailLieu?.noteMoyenne || null
      };

      res.json({
        success: true,
        data: translateDeep(siteData, lang),
        lang
      });

    } catch (error) {
      console.error('Erreur getSitePatrimonialById:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur', details: error.message });
    }
  }

  // Galerie d'un site
  async getGalerieSite(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { id } = req.params;
      const { type = 'all' } = req.query;

      const where = { id_lieu: id };
      if (type !== 'all') {
        where.type = type;
      }

      const medias = await this.models.LieuMedia.findAll({ where });

      res.json({
        success: true,
        data: translateDeep(medias, lang),
        lang
      });

    } catch (error) {
      console.error('Erreur getGalerieSite:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Générer carte de visite
  async genererCarteVisite(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { id } = req.params;
      const { format = 'json' } = req.query;

      const site = await this.models.Lieu.findByPk(id, {
        include: [
          { model: this.models.DetailLieu },
          {
            model: this.models.Commune,
            include: [{
              model: this.models.Daira,
              include: [{ model: this.models.Wilaya }]
            }]
          }
        ]
      });

      if (!site) {
        return res.status(404).json({ success: false, error: 'Site non trouvé' });
      }

      const siteData = site.toJSON();
      const qrCode = await this.genererQRCode(this.createQRCodeData(siteData));

      if (format === 'vcard') {
        const vcard = this.generateVCard(siteData, lang);
        res.setHeader('Content-Type', 'text/vcard');
        res.setHeader('Content-Disposition', `attachment; filename="site_${id}.vcf"`);
        return res.send(vcard);
      }

      res.json({
        success: true,
        data: {
          site: translateDeep(siteData, lang),
          qrCode
        },
        lang
      });

    } catch (error) {
      console.error('Erreur genererCarteVisite:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Télécharger QR Code
  async downloadQRCode(req, res) {
    try {
      const { id } = req.params;
      const { size = 256, format = 'png' } = req.query;

      const site = await this.models.Lieu.findByPk(id);
      if (!site) {
        return res.status(404).json({ success: false, error: 'Site non trouvé' });
      }

      const qrData = this.createQRCodeData(site.toJSON());

      if (format === 'svg') {
        const svgData = await QRCode.toString(qrData, { type: 'svg', width: parseInt(size) });
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Content-Disposition', `attachment; filename="qrcode_site_${id}.svg"`);
        return res.send(svgData);
      }

      const pngBuffer = await QRCode.toBuffer(qrData, {
        errorCorrectionLevel: 'M',
        width: parseInt(size)
      });
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="qrcode_site_${id}.png"`);
      res.send(pngBuffer);

    } catch (error) {
      console.error('Erreur downloadQRCode:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Générer VCard helper
  generateVCard(site, lang) {
    const nom = translate(site.nom, lang);
    const adresse = translate(site.adresse, lang);
    return `BEGIN:VCARD
VERSION:3.0
FN:${nom}
ADR:;;${adresse};;;
GEO:${site.latitude};${site.longitude}
END:VCARD`;
  }

  // Parcours patrimoniaux
  async getParcoursPatrimoniaux(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { wilaya, limit = 10 } = req.query;

      const include = [{
        model: this.models.Lieu,
        through: { attributes: ['ordre', 'duree_visite'] },
        include: [
          { model: this.models.DetailLieu },
          { model: this.models.LieuMedia, limit: 1, required: false }
        ]
      }];

      const parcours = await this.models.Parcours.findAll({
        include,
        limit: parseInt(limit),
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        data: translateDeep(parcours, lang),
        lang
      });

    } catch (error) {
      console.error('Erreur getParcoursPatrimoniaux:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // ========================================================================
  // MÉTHODES ADMIN - TRADUCTIONS
  // ========================================================================

  async getMonumentTranslations(req, res) {
    try {
      const { id } = req.params;
      const monument = await this.models.Monument.findByPk(id);

      if (!monument) {
        return res.status(404).json({ success: false, error: 'Monument non trouvé' });
      }

      res.json({
        success: true,
        data: {
          nom: monument.nom || {},
          description: monument.description || {}
        }
      });

    } catch (error) {
      console.error('Erreur getMonumentTranslations:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  async updateMonumentTranslation(req, res) {
    try {
      const { id, lang } = req.params;
      const { nom, description } = req.body;

      const monument = await this.models.Monument.findByPk(id);
      if (!monument) {
        return res.status(404).json({ success: false, error: 'Monument non trouvé' });
      }

      const updates = {};
      if (nom !== undefined) {
        updates.nom = mergeTranslations(monument.nom, { [lang]: nom });
      }
      if (description !== undefined) {
        updates.description = mergeTranslations(monument.description, { [lang]: description });
      }

      await monument.update(updates);

      res.json({
        success: true,
        message: `Traduction ${lang} mise à jour`,
        data: monument
      });

    } catch (error) {
      console.error('Erreur updateMonumentTranslation:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  async getVestigeTranslations(req, res) {
    try {
      const { id } = req.params;
      const vestige = await this.models.Vestige.findByPk(id);

      if (!vestige) {
        return res.status(404).json({ success: false, error: 'Vestige non trouvé' });
      }

      res.json({
        success: true,
        data: {
          nom: vestige.nom || {},
          description: vestige.description || {}
        }
      });

    } catch (error) {
      console.error('Erreur getVestigeTranslations:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  async updateVestigeTranslation(req, res) {
    try {
      const { id, lang } = req.params;
      const { nom, description } = req.body;

      const vestige = await this.models.Vestige.findByPk(id);
      if (!vestige) {
        return res.status(404).json({ success: false, error: 'Vestige non trouvé' });
      }

      const updates = {};
      if (nom !== undefined) {
        updates.nom = mergeTranslations(vestige.nom, { [lang]: nom });
      }
      if (description !== undefined) {
        updates.description = mergeTranslations(vestige.description, { [lang]: description });
      }

      await vestige.update(updates);

      res.json({
        success: true,
        message: `Traduction ${lang} mise à jour`,
        data: vestige
      });

    } catch (error) {
      console.error('Erreur updateVestigeTranslation:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // ========================================================================
  // MÉTHODES GESTION SITES (AUTH)
  // ========================================================================

  async createSitePatrimonial(req, res) {
    try {
      const lang = req.lang || 'fr';
      const {
        nom, adresse, typePatrimoine, typeLieu, communeId,
        latitude, longitude, description, histoire, referencesHistoriques,
        horaires, genererQRCode, services, programmes, monuments, vestiges, medias,
        // Ancien format pour compatibilité
        lieu, details, monument, vestige
      } = req.body;

      // Support ancien et nouveau format
      const lieuData = lieu || {
        nom, adresse, typePatrimoine, typeLieu, communeId, latitude, longitude
      };
      const detailsData = details || {
        description, histoire, referencesHistoriques, horaires
      };

      // Créer le lieu
      const newLieu = await this.models.Lieu.create({
        nom: typeof lieuData.nom === 'string' ? createMultiLang(lieuData.nom, lang) : (lieuData.nom || { fr: '' }),
        adresse: typeof lieuData.adresse === 'string' ? createMultiLang(lieuData.adresse, lang) : (lieuData.adresse || { fr: '' }),
        typePatrimoine: lieuData.typePatrimoine || typePatrimoine || 'monument',
        typeLieu: lieuData.typeLieu || typeLieu || 'Commune',
        communeId: lieuData.communeId || communeId,
        latitude: lieuData.latitude || latitude || 36.7525,
        longitude: lieuData.longitude || longitude || 3.04197
      });

      // Créer les détails du lieu
      const detailLieu = await this.models.DetailLieu.create({
        id_lieu: newLieu.id_lieu,
        description: typeof detailsData.description === 'string' ? createMultiLang(detailsData.description, lang) : (detailsData.description || {}),
        histoire: typeof detailsData.histoire === 'string' ? createMultiLang(detailsData.histoire, lang) : (detailsData.histoire || {}),
        referencesHistoriques: typeof detailsData.referencesHistoriques === 'string' ? createMultiLang(detailsData.referencesHistoriques, lang) : (detailsData.referencesHistoriques || {}),
        horaires: typeof detailsData.horaires === 'string' ? createMultiLang(detailsData.horaires, lang) : (detailsData.horaires || {})
      });

      // Créer les monuments (multiples ou single)
      const monumentsList = monuments || (monument ? [monument] : []);
      if (monumentsList.length > 0) {
        for (const mon of monumentsList) {
          await this.models.Monument.create({
            id_detail_lieu: detailLieu.id_detailLieu,
            nom: typeof mon.nom === 'string' ? createMultiLang(mon.nom, lang) : mon.nom,
            description: mon.description ? (typeof mon.description === 'string' ? createMultiLang(mon.description, lang) : mon.description) : {},
            type: mon.type || mon.type_monument || 'Autre'
          });
        }
      }

      // Créer les vestiges (multiples ou single)
      const vestigesList = vestiges || (vestige ? [vestige] : []);
      if (vestigesList.length > 0) {
        for (const ves of vestigesList) {
          await this.models.Vestige.create({
            id_detail_lieu: detailLieu.id_detailLieu,
            nom: typeof ves.nom === 'string' ? createMultiLang(ves.nom, lang) : ves.nom,
            description: ves.description ? (typeof ves.description === 'string' ? createMultiLang(ves.description, lang) : ves.description) : {},
            type: ves.type || ves.type_vestige || 'Ruines'
          });
        }
      }

      // Créer les services
      if (services && Array.isArray(services) && services.length > 0) {
        for (const service of services) {
          await this.models.Service.create({
            id_lieu: newLieu.id_lieu,
            nom_service: typeof service.nom === 'string' ? createMultiLang(service.nom, lang) : service.nom,
            description: service.description ? (typeof service.description === 'string' ? createMultiLang(service.description, lang) : service.description) : {},
            disponible: service.disponible !== false,
            horaires: service.horaires || null,
            tarif: service.tarif || null,
            icone: service.icone || null
          });
        }
      }

      // Créer les programmes
      if (programmes && Array.isArray(programmes) && programmes.length > 0) {
        for (const prog of programmes) {
          await this.models.Programme.create({
            id_lieu: newLieu.id_lieu,
            titre: typeof prog.titre === 'string' ? createMultiLang(prog.titre, lang) : prog.titre,
            description: prog.description ? (typeof prog.description === 'string' ? createMultiLang(prog.description, lang) : prog.description) : {},
            date_debut: prog.date_debut,
            date_fin: prog.date_fin || null,
            heure_debut: prog.heure_debut || null,
            heure_fin: prog.heure_fin || null,
            capacite: prog.capacite || null,
            tarif: prog.tarif || null,
            statut: 'actif'
          });
        }
      }

      // Créer les médias
      if (medias && Array.isArray(medias) && medias.length > 0) {
        for (const media of medias) {
          if (media.url) {
            await this.models.LieuMedia.create({
              id_lieu: newLieu.id_lieu,
              url: media.url,
              type: media.type || 'image',
              description: media.description ? (typeof media.description === 'string' ? createMultiLang(media.description, lang) : media.description) : {},
              ordre: media.ordre || 1
            });
          }
        }
      }

      // Générer le QR Code automatiquement
      let qrCodeGenerated = null;
      if (genererQRCode !== false) {
        try {
          const siteUrl = `${process.env.FRONTEND_URL || 'https://eventculture.dz'}/patrimoine/${newLieu.id_lieu}`;
          qrCodeGenerated = await QRCode.toDataURL(siteUrl, {
            width: 300,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' }
          });

          // Sauvegarder le QR Code en base
          await this.models.QRCode.create({
            id_lieu: newLieu.id_lieu,
            code_unique: `PATRIMOINE-${newLieu.id_lieu}-${Date.now()}`,
            url_destination: siteUrl,
            qr_image_url: qrCodeGenerated,
            statut: 'actif'
          });
        } catch (qrError) {
          console.warn('Erreur génération QR Code:', qrError.message);
        }
      }

      // Récupérer le site complet
      const site = await this.models.Lieu.findByPk(newLieu.id_lieu, {
        include: [
          {
            model: this.models.DetailLieu,
            include: [
              { model: this.models.Monument },
              { model: this.models.Vestige }
            ]
          },
          { model: this.models.Service },
          { model: this.models.Programme },
          { model: this.models.LieuMedia },
          { model: this.models.QRCode },
          {
            model: this.models.Commune,
            include: [{
              model: this.models.Daira,
              include: [{ model: this.models.Wilaya }]
            }]
          }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Site patrimonial créé avec succès',
        data: {
          ...translateDeep(site, lang),
          qrCodeGenerated
        },
        lang
      });

    } catch (error) {
      console.error('Erreur createSitePatrimonial:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur', details: error.message });
    }
  }

  async updateSitePatrimonial(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { id } = req.params;
      const { lieu, details } = req.body;

      const site = await this.models.Lieu.findByPk(id);
      if (!site) {
        return res.status(404).json({ success: false, error: 'Site non trouvé' });
      }

      // Mettre à jour le lieu
      if (lieu) {
        const updates = { ...lieu };
        if (lieu.nom) updates.nom = mergeTranslations(site.nom, createMultiLang(lieu.nom, lang));
        if (lieu.adresse) updates.adresse = mergeTranslations(site.adresse, createMultiLang(lieu.adresse, lang));
        await site.update(updates);
      }

      // Mettre à jour les détails
      if (details) {
        const detailLieu = await this.models.DetailLieu.findOne({ where: { id_lieu: id } });
        if (detailLieu) {
          const detailUpdates = {};
          if (details.description) {
            detailUpdates.description = mergeTranslations(detailLieu.description, createMultiLang(details.description, lang));
          }
          if (details.histoire) {
            detailUpdates.histoire = mergeTranslations(detailLieu.histoire, createMultiLang(details.histoire, lang));
          }
          await detailLieu.update(detailUpdates);
        }
      }

      const updatedSite = await this.models.Lieu.findByPk(id, {
        include: [{ model: this.models.DetailLieu }]
      });

      res.json({
        success: true,
        message: 'Site mis à jour',
        data: translateDeep(updatedSite, lang),
        lang
      });

    } catch (error) {
      console.error('Erreur updateSitePatrimonial:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  async deleteSitePatrimonial(req, res) {
    try {
      const { id } = req.params;

      const site = await this.models.Lieu.findByPk(id);
      if (!site) {
        return res.status(404).json({ success: false, error: 'Site non trouvé' });
      }

      await site.destroy();

      res.json({
        success: true,
        message: 'Site supprimé avec succès'
      });

    } catch (error) {
      console.error('Erreur deleteSitePatrimonial:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  async noterSite(req, res) {
    try {
      const { id } = req.params;
      const { note, commentaire } = req.body;
      const userId = req.user.id_user;

      // Vérifier que le site existe
      const site = await this.models.Lieu.findByPk(id);
      if (!site) {
        return res.status(404).json({ success: false, error: 'Site non trouvé' });
      }

      // Créer ou mettre à jour la critique
      await this.models.CritiqueEvaluation.upsert({
        id_user: userId,
        id_lieu: id,
        note,
        commentaire
      });

      res.json({
        success: true,
        message: 'Note enregistrée'
      });

    } catch (error) {
      console.error('Erreur noterSite:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  async ajouterAuxFavoris(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id_user;

      await this.models.Favori.findOrCreate({
        where: { id_user: userId, id_lieu: id },
        defaults: { id_user: userId, id_lieu: id }
      });

      res.json({
        success: true,
        message: 'Site ajouté aux favoris'
      });

    } catch (error) {
      console.error('Erreur ajouterAuxFavoris:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  async retirerDesFavoris(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id_user;

      await this.models.Favori.destroy({
        where: { id_user: userId, id_lieu: id }
      });

      res.json({
        success: true,
        message: 'Site retiré des favoris'
      });

    } catch (error) {
      console.error('Erreur retirerDesFavoris:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  async uploadMedias(req, res) {
    try {
      const { id } = req.params;

      // Vérifier que le site existe
      const site = await this.models.Lieu.findByPk(id);
      if (!site) {
        return res.status(404).json({ success: false, error: 'Site non trouvé' });
      }

      // Le fichier est traité par le middleware d'upload
      res.json({
        success: true,
        message: 'Médias uploadés avec succès'
      });

    } catch (error) {
      console.error('Erreur uploadMedias:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  async deleteMedia(req, res) {
    try {
      const { id, mediaId } = req.params;

      const media = await this.models.LieuMedia.findOne({
        where: { id: mediaId, id_lieu: id }
      });

      if (!media) {
        return res.status(404).json({ success: false, error: 'Média non trouvé' });
      }

      await media.destroy();

      res.json({
        success: true,
        message: 'Média supprimé'
      });

    } catch (error) {
      console.error('Erreur deleteMedia:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  async updateHoraires(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { id } = req.params;
      const { horaires } = req.body;

      const detailLieu = await this.models.DetailLieu.findOne({ where: { id_lieu: id } });
      if (!detailLieu) {
        return res.status(404).json({ success: false, error: 'Site non trouvé' });
      }

      await detailLieu.update({
        horaires: mergeTranslations(detailLieu.horaires, createMultiLang(horaires, lang))
      });

      res.json({
        success: true,
        message: 'Horaires mis à jour'
      });

    } catch (error) {
      console.error('Erreur updateHoraires:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // ========================================================================
  // MÉTHODES MOBILE
  // ========================================================================

  async getNearbyMobile(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { lat, lng, radius = 10 } = req.query;

      // Calcul simple de proximité (approximation)
      const latDelta = radius / 111; // 1 degré ≈ 111 km
      const lngDelta = radius / (111 * Math.cos(lat * Math.PI / 180));

      const sites = await this.models.Lieu.findAll({
        where: {
          latitude: {
            [Op.between]: [parseFloat(lat) - latDelta, parseFloat(lat) + latDelta]
          },
          longitude: {
            [Op.between]: [parseFloat(lng) - lngDelta, parseFloat(lng) + lngDelta]
          }
        },
        include: [
          { model: this.models.DetailLieu, required: true },
          { model: this.models.LieuMedia, limit: 1, required: false }
        ],
        limit: 20
      });

      res.json({
        success: true,
        data: translateDeep(sites, lang),
        lang
      });

    } catch (error) {
      console.error('Erreur getNearbyMobile:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  async handleQRScan(req, res) {
    return this.scanQRCode(req, res);
  }

  async getOfflineDataPack(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { wilaya } = req.params;

      const sites = await this.models.Lieu.findAll({
        include: [
          { model: this.models.DetailLieu, required: true },
          {
            model: this.models.Commune,
            include: [{
              model: this.models.Daira,
              include: [{
                model: this.models.Wilaya,
                where: { id_wilaya: wilaya }
              }]
            }]
          },
          { model: this.models.LieuMedia }
        ]
      });

      res.json({
        success: true,
        data: {
          sites: translateDeep(sites, lang),
          last_update: new Date().toISOString(),
          version: '1.0'
        },
        lang
      });

    } catch (error) {
      console.error('Erreur getOfflineDataPack:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // ========================================================================
  // MÉTHODES ADMIN
  // ========================================================================

  async importSitesPatrimoniaux(req, res) {
    try {
      // Import depuis fichier CSV/Excel
      res.json({
        success: true,
        message: 'Import en cours de développement'
      });

    } catch (error) {
      console.error('Erreur importSitesPatrimoniaux:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  async exportSitesPatrimoniaux(req, res) {
    try {
      const { format = 'json' } = req.query;

      const sites = await this.models.Lieu.findAll({
        include: [{ model: this.models.DetailLieu }]
      });

      if (format === 'json') {
        res.json({
          success: true,
          data: sites
        });
      } else {
        res.json({
          success: true,
          message: `Export ${format} en cours de développement`
        });
      }

    } catch (error) {
      console.error('Erreur exportSitesPatrimoniaux:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // ========================================================================
  // QR CODES
  // ========================================================================

  createQRCodeData(site) {
    return JSON.stringify({
      type: 'patrimoine',
      id: site.id_lieu,
      nom: site.nom,
      lat: site.latitude,
      lng: site.longitude
    });
  }

  async genererQRCode(data) {
    try {
      return await QRCode.toDataURL(data, {
        errorCorrectionLevel: 'M',
        width: 256
      });
    } catch (error) {
      console.error('Erreur QR code:', error);
      return null;
    }
  }

  async scanQRCode(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { qrData } = req.body;

      const data = JSON.parse(qrData);

      if (data.type === 'patrimoine') {
        const site = await this.models.Lieu.findByPk(data.id, {
          include: [
            { model: this.models.DetailLieu },
            { model: this.models.LieuMedia }
          ]
        });

        if (site) {
          // Enregistrer le scan
          if (req.user) {
            await this.models.QRScan?.create({
              id_user: req.user.id_user,
              id_lieu: data.id,
              date_scan: new Date()
            });
          }

          return res.json({
            success: true,
            data: translateDeep(site, lang),
            lang
          });
        }
      }

      res.status(404).json({ success: false, error: 'Site non trouvé' });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(400).json({ success: false, error: 'QR code invalide' });
    }
  }
}

module.exports = PatrimoineController;
