// controllers/PatrimoineController.js - VERSION i18n
const { Op } = require('sequelize');
const QRCode = require('qrcode');

// ⚡ Import du helper i18n
const { translate, translateDeep, createMultiLang, mergeTranslations } = require('../helpers/i18n');

class PatrimoineController {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
  }

  // ⚡ Recherche multilingue
  buildMultiLangSearch(field, search) {
    return [
      this.sequelize.where(
        this.sequelize.fn('JSON_EXTRACT', this.sequelize.col(field), '$.fr'),
        { [Op.like]: `%${search}%` }
      ),
      this.sequelize.where(
        this.sequelize.fn('JSON_EXTRACT', this.sequelize.col(field), '$.ar'),
        { [Op.like]: `%${search}%` }
      ),
      this.sequelize.where(
        this.sequelize.fn('JSON_EXTRACT', this.sequelize.col(field), '$.en'),
        { [Op.like]: `%${search}%` }
      )
    ];
  }

  // Sites patrimoniaux populaires
  async getSitesPopulaires(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { limit = 6 } = req.query;

      const sites = await this.models.Lieu.findAll({
        include: [
          { model: this.models.DetailLieu, required: true },
          {
            model: this.models.Commune,
            attributes: ['nom'],
            include: [{
              model: this.models.Daira,
              attributes: ['nom'],
              include: [{ model: this.models.Wilaya, attributes: ['nom'] }]
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

      const sitesAvecQR = await Promise.all(
        sites.map(async (site) => {
          const siteData = site.toJSON();
          siteData.wilaya = siteData.Commune?.Daira?.Wilaya || null;
          const qrCodeData = this.createQRCodeData(siteData);
          siteData.qrCode = await this.genererQRCode(qrCodeData);
          return siteData;
        })
      );

      // ⚡ Traduire
      res.json({
        success: true,
        data: translateDeep(sitesAvecQR, lang),
        lang
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
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

  // Rechercher des sites patrimoniaux
  async searchSitesPatrimoniaux(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { 
        q, 
        wilaya, 
        type,
        page = 1, 
        limit = 20 
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      // ⚡ Recherche multilingue
      if (q) {
        where[Op.or] = [
          ...this.buildMultiLangSearch('nom', q),
          ...this.buildMultiLangSearch('adresse', q)
        ];
      }

      if (type) {
        where.typeLieu = type;
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
          ...this.buildMultiLangSearch('nom', search),
          ...this.buildMultiLangSearch('description', search)
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
          ...this.buildMultiLangSearch('nom', search),
          ...this.buildMultiLangSearch('description', search)
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
