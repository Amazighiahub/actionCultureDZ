// controllers/LieuController.js - VERSION i18n
const { Op } = require('sequelize');

// ⚡ Import du helper i18n
const { translate, translateDeep, createMultiLang, mergeTranslations } = require('../helpers/i18n');

class LieuController {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
  }

  // ⚡ Recherche multilingue dans les champs JSON
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

  // Récupérer tous les lieux
  async getAllLieux(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
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

      if (type_lieu) where.typeLieu = type_lieu;

      // ⚡ Recherche multilingue
      if (search) {
        where[Op.or] = [
          ...this.buildMultiLangSearch('nom', search),
          ...this.buildMultiLangSearch('adresse', search)
        ];
      }

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
        order: [[this.sequelize.fn('JSON_EXTRACT', this.sequelize.col('Lieu.nom'), `$.${lang}`), 'ASC']],
        distinct: true
      });

      const lieuxFormates = lieux.rows.map(lieu => {
        const lieuData = lieu.toJSON();
        lieuData.wilaya = lieuData.Commune?.Daira?.Wilaya || null;
        lieuData.daira = lieuData.Commune?.Daira || null;
        lieuData.commune = lieuData.Commune || null;
        return lieuData;
      });

      // ⚡ Traduire les résultats
      res.json({
        success: true,
        data: {
          lieux: translateDeep(lieuxFormates, lang),
          pagination: {
            total: lieux.count,
            page: parseInt(page),
            pages: Math.ceil(lieux.count / limit),
            limit: parseInt(limit)
          }
        },
        lang
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
      const lang = req.lang || 'fr';  // ⚡
      const { wilayaId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const wilaya = await this.models.Wilaya.findByPk(wilayaId);
      if (!wilaya) {
        return res.status(404).json({
          success: false,
          error: 'Wilaya non trouvée'
        });
      }

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
        order: [[this.sequelize.fn('JSON_EXTRACT', this.sequelize.col('Lieu.nom'), `$.${lang}`), 'ASC']],
        distinct: true
      });

      // ⚡ Traduire
      res.json({
        success: true,
        data: {
          wilaya: translate(wilaya, lang),
          lieux: translateDeep(lieux.rows, lang),
          pagination: {
            total: lieux.count,
            page: parseInt(page),
            pages: Math.ceil(lieux.count / limit)
          }
        },
        lang
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // ⚡ Préparer un champ multilingue
  prepareMultiLangField(value, lang = 'fr') {
    if (!value) return null;
    if (typeof value === 'object' && value !== null) return value;
    return createMultiLang(value, lang);
  }

  // Créer un nouveau lieu
  async createLieu(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const {
        nom,
        typeLieu,
        communeId,
        localiteId,
        adresse,
        description,
        histoire,
        latitude,
        longitude,
        details
      } = req.body;

      if (!nom || !typeLieu || !communeId || !adresse || !latitude || !longitude) {
        return res.status(400).json({
          success: false,
          error: 'Données manquantes. Les champs nom, typeLieu, communeId, adresse, latitude et longitude sont requis.'
        });
      }

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

      const commune = await this.models.Commune.findByPk(communeId);
      if (!commune) {
        return res.status(404).json({
          success: false,
          error: 'Commune non trouvée'
        });
      }

      if (localiteId) {
        const localite = await this.models.Localite.findByPk(localiteId);
        if (!localite || localite.id_commune !== communeId) {
          return res.status(400).json({
            success: false,
            error: 'Localité invalide ou n\'appartient pas à la commune spécifiée'
          });
        }
      }

      // ⚡ Préparer les champs multilingues
      const nomMultiLang = this.prepareMultiLangField(nom, lang);
      const adresseMultiLang = this.prepareMultiLangField(adresse, lang);
      const descriptionMultiLang = this.prepareMultiLangField(description, lang);
      const histoireMultiLang = this.prepareMultiLangField(histoire, lang);

      const lieu = await this.models.Lieu.create({
        nom: nomMultiLang,
        adresse: adresseMultiLang,
        description: descriptionMultiLang,
        histoire: histoireMultiLang,
        typeLieu,
        communeId,
        localiteId,
        latitude,
        longitude
      });

      if (details) {
        await this.models.DetailLieu.create({
          id_lieu: lieu.id_lieu,
          description: this.prepareMultiLangField(details.description, lang),
          horaires: this.prepareMultiLangField(details.horaires, lang),
          histoire: this.prepareMultiLangField(details.histoire, lang),
          referencesHistoriques: details.referencesHistoriques
        });
      }

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

      // ⚡ Traduire
      res.status(201).json({
        success: true,
        message: 'Lieu créé avec succès',
        data: translateDeep(lieuComplet, lang)
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
      const lang = req.lang || 'fr';  // ⚡
      const { id } = req.params;
      const { nom, adresse, description, histoire, ...otherFields } = req.body;

      const lieu = await this.models.Lieu.findByPk(id, {
        include: [{ model: this.models.DetailLieu }]
      });

      if (!lieu) {
        return res.status(404).json({
          success: false,
          error: 'Lieu non trouvé'
        });
      }

      const updates = { ...otherFields };

      // ⚡ Gérer les champs multilingues
      if (nom !== undefined) {
        if (typeof nom === 'object') {
          updates.nom = mergeTranslations(lieu.nom, nom);
        } else {
          updates.nom = mergeTranslations(lieu.nom, { [lang]: nom });
        }
      }

      if (adresse !== undefined) {
        if (typeof adresse === 'object') {
          updates.adresse = mergeTranslations(lieu.adresse, adresse);
        } else {
          updates.adresse = mergeTranslations(lieu.adresse, { [lang]: adresse });
        }
      }

      if (description !== undefined) {
        if (typeof description === 'object') {
          updates.description = mergeTranslations(lieu.description, description);
        } else {
          updates.description = mergeTranslations(lieu.description, { [lang]: description });
        }
      }

      if (histoire !== undefined) {
        if (typeof histoire === 'object') {
          updates.histoire = mergeTranslations(lieu.histoire, histoire);
        } else {
          updates.histoire = mergeTranslations(lieu.histoire, { [lang]: histoire });
        }
      }

      await lieu.update(updates);

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
        data: translateDeep(lieuMisAJour, lang)
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

      const lieu = await this.models.Lieu.findByPk(id, {
        include: [{ model: this.models.Evenement }]
      });

      if (!lieu) {
        return res.status(404).json({
          success: false,
          error: 'Lieu non trouvé'
        });
      }

      if (lieu.Evenements && lieu.Evenements.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Impossible de supprimer un lieu qui possède des événements associés'
        });
      }

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
      const lang = req.lang || 'fr';  // ⚡
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

      let lieux;
      if (radius && lat && lng) {
        const distance = this.sequelize.literal(
          `6371 * acos(
            cos(radians(${lat})) * cos(radians(latitude)) * 
            cos(radians(longitude) - radians(${lng})) + 
            sin(radians(${lat})) * sin(radians(latitude))
          )`
        );

        lieux = await this.models.Lieu.findAndCountAll({
          where: {
            ...where,
            [Op.and]: this.sequelize.literal(
              `${distance} <= ${radius}`
            )
          },
          attributes: {
            include: [[distance, 'distance']]
          },
          include,
          order: [[this.sequelize.literal('distance'), 'ASC']],
          limit: parseInt(limit),
          offset: parseInt(offset),
          distinct: true
        });
      } else {
        lieux = await this.models.Lieu.findAndCountAll({
          where,
          include,
          order: [[this.sequelize.fn('JSON_EXTRACT', this.sequelize.col('Lieu.nom'), `$.${lang}`), 'ASC']],
          limit: parseInt(limit),
          offset: parseInt(offset),
          distinct: true
        });
      }

      // ⚡ Traduire
      res.json({
        success: true,
        data: {
          lieux: translateDeep(lieux.rows, lang),
          pagination: {
            total: lieux.count,
            page: parseInt(page),
            pages: Math.ceil(lieux.count / limit)
          }
        },
        lang
      });

    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la recherche' 
      });
    }
  }

  // Obtenir un lieu par ID
  async getLieuById(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
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

      const lieuData = lieu.toJSON();
      lieuData.wilaya = lieuData.Commune?.Daira?.Wilaya || null;
      lieuData.daira = lieuData.Commune?.Daira || null;

      // ⚡ Traduire
      res.json({
        success: true,
        data: translateDeep(lieuData, lang),
        lang
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // ⚡ Récupérer toutes les traductions d'un lieu (admin)
  async getLieuTranslations(req, res) {
    try {
      const { id } = req.params;

      const lieu = await this.models.Lieu.findByPk(id, {
        attributes: ['id_lieu', 'nom', 'adresse', 'description', 'histoire'],
        include: [{
          model: this.models.DetailLieu,
          attributes: ['description', 'horaires', 'histoire']
        }]
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
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // ⚡ Mettre à jour une traduction spécifique (admin)
  async updateLieuTranslation(req, res) {
    try {
      const { id, lang } = req.params;
      const { nom, adresse, description, histoire } = req.body;

      const lieu = await this.models.Lieu.findByPk(id);
      if (!lieu) {
        return res.status(404).json({ success: false, error: 'Lieu non trouvé' });
      }

      const updates = {};
      if (nom) updates.nom = mergeTranslations(lieu.nom, { [lang]: nom });
      if (adresse) updates.adresse = mergeTranslations(lieu.adresse, { [lang]: adresse });
      if (description) updates.description = mergeTranslations(lieu.description, { [lang]: description });
      if (histoire) updates.histoire = mergeTranslations(lieu.histoire, { [lang]: histoire });

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, error: 'Aucune donnée à mettre à jour' });
      }

      await lieu.update(updates);
      res.json({ success: true, message: `Traduction ${lang} mise à jour`, data: lieu });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Statistiques des lieux
  async getStatistiques(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      
      const totalLieux = await this.models.Lieu.count();

      const lieuxParType = await this.models.Lieu.findAll({
        attributes: [
          'typeLieu',
          [this.sequelize.fn('COUNT', '*'), 'count']
        ],
        group: ['typeLieu']
      });

      const lieuxAvecDetails = await this.models.Lieu.count({
        include: [{
          model: this.models.DetailLieu,
          required: true
        }]
      });

      const lieuxAvecServices = await this.models.Lieu.count({
        include: [{
          model: this.models.Service,
          required: true
        }],
        distinct: true
      });

      res.json({
        success: true,
        data: {
          totalLieux,
          lieuxParType,
          lieuxAvecDetails,
          lieuxAvecServices
        },
        lang
      });

    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors du calcul des statistiques' 
      });
    }
  }
}

module.exports = LieuController;
