// controllers/LieuController.js - VERSION i18n
const { Op } = require('sequelize');

// ⚡ Import du helper i18n
const { translate, translateDeep, createMultiLang, mergeTranslations } = require('../helpers/i18n');

// ✅ OPTIMISATION: Import de l'utilitaire de recherche multilingue centralisé
const { buildMultiLangSearch } = require('../utils/MultiLangSearchBuilder');

class LieuController {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
  }

  // ⚡ Recherche multilingue - utilise l'utilitaire centralisé
  buildMultiLangSearchLocal(field, search) {
    return buildMultiLangSearch(this.sequelize, field, search, 'Lieu');
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

      // Construire les inclusions de manière sécurisée
      const include = [];

      // Commune avec Daira et Wilaya
      if (this.models.Commune) {
        const communeInclude = {
          model: this.models.Commune,
          attributes: ['id_commune', 'nom', 'commune_name_ascii'],
          required: false,
          where: commune ? { id_commune: commune } : undefined
        };

        if (this.models.Daira) {
          communeInclude.include = [{
            model: this.models.Daira,
            attributes: ['id_daira', 'nom', 'daira_name_ascii'],
            required: false,
            where: daira ? { id_daira: daira } : undefined
          }];

          if (this.models.Wilaya) {
            communeInclude.include[0].include = [{
              model: this.models.Wilaya,
              attributes: ['id_wilaya', 'nom', 'wilaya_name_ascii'],
              required: false,
              where: wilaya ? { id_wilaya: wilaya } : undefined
            }];
          }
        }
        include.push(communeInclude);
      }

      // Localite
      if (this.models.Localite) {
        include.push({
          model: this.models.Localite,
          attributes: ['id_localite', 'nom', 'localite_name_ascii'],
          required: false
        });
      }

      // DetailLieu avec Monument et Vestige - seulement si pas trop de données
      if (this.models.DetailLieu && parseInt(limit) <= 50) {
        const detailInclude = {
          model: this.models.DetailLieu,
          required: false
        };
        // Ne pas inclure Monument/Vestige dans les listes pour éviter les erreurs
        include.push(detailInclude);
      }

      // Service et LieuMedia - seulement si pas trop de données
      if (this.models.Service && parseInt(limit) <= 50) {
        include.push({ model: this.models.Service, required: false });
      }
      if (this.models.LieuMedia && parseInt(limit) <= 50) {
        include.push({ model: this.models.LieuMedia, required: false });
      }

      if (type_lieu) where.typeLieu = type_lieu;

      // ⚡ Recherche multilingue
      if (search) {
        where[Op.or] = [
          ...this.buildMultiLangSearchLocal('nom', search),
          ...this.buildMultiLangSearchLocal('adresse', search)
        ];
      }

      if (with_events === 'true' && this.models.Evenement) {
        include.push({
          model: this.models.Evenement,
          attributes: ['nom_evenement', 'date_debut', 'date_fin'],
          where: { date_fin: { [Op.gte]: new Date() } },
          required: false
        });
      }

      // Ordre simplifié pour éviter les erreurs JSON_EXTRACT
      let order = [['id_lieu', 'ASC']];
      try {
        // Tenter l'ordre par nom si JSON fonctionne
        order = [[this.sequelize.fn('JSON_EXTRACT', this.sequelize.col('Lieu.nom'), `$.${lang}`), 'ASC']];
      } catch {
        // Fallback sur l'ID
      }

      const lieux = await this.models.Lieu.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        include,
        order,
        distinct: true,
        subQuery: false
      });

      const lieuxFormates = lieux.rows.map(lieu => {
        const lieuData = lieu.toJSON();
        lieuData.wilaya = lieuData.Commune?.Daira?.Wilaya || null;
        lieuData.daira = lieuData.Commune?.Daira || null;
        lieuData.commune = lieuData.Commune || null;
        return lieuData;
      });

      // ⚡ Traduire les résultats - Utiliser "items" pour être compatible avec le frontend
      const translatedLieux = translateDeep(lieuxFormates, lang);
      res.json({
        success: true,
        data: {
          items: translatedLieux,
          lieux: translatedLieux, // Garder aussi "lieux" pour rétrocompatibilité
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
      console.error('Erreur lors de la récupération des lieux:', error.message);
      console.error('Stack:', error.stack);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des lieux',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
        typeLieu = 'Commune', // Valeur par défaut
        typeLieuCulturel,
        communeId,
        wilayaId, // Le frontend peut envoyer wilayaId au lieu de communeId
        localiteId,
        adresse,
        description,
        histoire,
        latitude,
        longitude,
        details,
        detail // Alias pour details
      } = req.body;

      // Si pas de communeId mais wilayaId, chercher une commune de cette wilaya
      let finalCommuneId = communeId;
      if (!communeId && wilayaId) {
        const commune = await this.models.Commune.findOne({
          include: [{
            model: this.models.Daira,
            where: { wilayaId },
            required: true
          }]
        });
        if (commune) {
          finalCommuneId = commune.id_commune;
        }
      }

      if (!nom || !adresse || !latitude || !longitude) {
        return res.status(400).json({
          success: false,
          error: 'Données manquantes. Les champs nom, adresse, latitude et longitude sont requis.'
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

      // Vérifier la commune si fournie
      if (finalCommuneId) {
        const commune = await this.models.Commune.findByPk(finalCommuneId);
        if (!commune) {
          return res.status(404).json({
            success: false,
            error: 'Commune non trouvée'
          });
        }

        if (localiteId) {
          const localite = await this.models.Localite.findByPk(localiteId);
          if (!localite || localite.id_commune !== finalCommuneId) {
            return res.status(400).json({
              success: false,
              error: 'Localité invalide ou n\'appartient pas à la commune spécifiée'
            });
          }
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
        typeLieuCulturel,
        communeId: finalCommuneId,
        localiteId,
        latitude,
        longitude
      });

      // Créer les détails si fournis (accepter details ou detail)
      const detailsData = details || detail;
      if (detailsData) {
        await this.models.DetailLieu.create({
          id_lieu: lieu.id_lieu,
          description: this.prepareMultiLangField(detailsData.description, lang),
          horaires: this.prepareMultiLangField(detailsData.horaires, lang),
          histoire: this.prepareMultiLangField(detailsData.histoire, lang),
          referencesHistoriques: detailsData.referencesHistoriques
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
          ...this.buildMultiLangSearchLocal('nom', q),
          ...this.buildMultiLangSearchLocal('adresse', q)
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

      // ⚡ Traduire - Utiliser "items" pour être compatible avec le frontend
      res.json({
        success: true,
        data: {
          items: translateDeep(lieux.rows, lang),
          lieux: translateDeep(lieux.rows, lang), // Garder aussi "lieux" pour rétrocompatibilité
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
          { model: this.models.QRCode },
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

  // Lieux à proximité (pour patrimoine routes)
  async getLieuxProximite(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { latitude, longitude, rayon = 10, limit = 20 } = req.query;

      // Calcul simple de proximité (approximation)
      const latDelta = rayon / 111; // 1 degré ≈ 111 km
      const lngDelta = rayon / (111 * Math.cos(parseFloat(latitude) * Math.PI / 180));

      const lieux = await this.models.Lieu.findAll({
        where: {
          latitude: {
            [Op.between]: [parseFloat(latitude) - latDelta, parseFloat(latitude) + latDelta]
          },
          longitude: {
            [Op.between]: [parseFloat(longitude) - lngDelta, parseFloat(longitude) + lngDelta]
          }
        },
        include: [
          { model: this.models.DetailLieu, required: true },
          {
            model: this.models.Commune,
            include: [{
              model: this.models.Daira,
              include: [{ model: this.models.Wilaya }]
            }]
          },
          { model: this.models.LieuMedia, limit: 1, required: false }
        ],
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: translateDeep(lieux, lang),
        lang
      });

    } catch (error) {
      console.error('Erreur getLieuxProximite:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Statistiques des lieux (alias pour patrimoine routes)
  async getStatistiquesLieux(req, res) {
    return this.getStatistiques(req, res);
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

  // Vérifier les doublons de lieu
  async checkDuplicate(req, res) {
    try {
      const { nom, latitude, longitude } = req.body;
      const lang = req.lang || 'fr';

      // Tolérance de 100 mètres (environ 0.001 degré)
      const tolerance = 0.001;

      // Rechercher par nom similaire
      const lieuByName = await this.models.Lieu.findOne({
        where: this.sequelize.where(
          this.sequelize.fn('JSON_EXTRACT', this.sequelize.col('nom'), `$.${lang}`),
          { [Op.like]: `%${nom}%` }
        ),
        include: [
          {
            model: this.models.Commune,
            include: [{
              model: this.models.Daira,
              include: [{ model: this.models.Wilaya }]
            }]
          }
        ]
      });

      // Rechercher par coordonnées proches
      const lieuByCoords = await this.models.Lieu.findOne({
        where: {
          latitude: {
            [Op.between]: [latitude - tolerance, latitude + tolerance]
          },
          longitude: {
            [Op.between]: [longitude - tolerance, longitude + tolerance]
          }
        },
        include: [
          {
            model: this.models.Commune,
            include: [{
              model: this.models.Daira,
              include: [{ model: this.models.Wilaya }]
            }]
          }
        ]
      });

      const existingLieu = lieuByName || lieuByCoords;

      if (existingLieu) {
        return res.json({
          success: true,
          data: {
            exists: true,
            lieu: translateDeep(existingLieu, lang),
            matchType: lieuByName ? 'name' : 'coordinates'
          }
        });
      }

      res.json({
        success: true,
        data: {
          exists: false
        }
      });

    } catch (error) {
      console.error('Erreur checkDuplicate:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la vérification des doublons'
      });
    }
  }

  // ========================================================================
  // GESTION DES SERVICES D'UN LIEU
  // ========================================================================

  /**
   * Obtenir les services d'un lieu
   */
  async getServicesLieu(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { id } = req.params;

      const lieu = await this.models.Lieu.findByPk(id);
      if (!lieu) {
        return res.status(404).json({ success: false, error: 'Lieu non trouvé' });
      }

      const services = await this.models.Service.findAll({
        where: { id_lieu: id }
      });

      res.json({
        success: true,
        data: translateDeep(services, lang),
        lang
      });

    } catch (error) {
      console.error('Erreur getServicesLieu:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  /**
   * Ajouter un service à un lieu
   */
  async addServiceLieu(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { id } = req.params;
      const { nom, description, disponible = true, services } = req.body;

      const lieu = await this.models.Lieu.findByPk(id);
      if (!lieu) {
        return res.status(404).json({ success: false, error: 'Lieu non trouvé' });
      }

      // Support pour ajout multiple (array de noms) ou single
      if (services && Array.isArray(services)) {
        const createdServices = [];
        for (const serviceName of services) {
          const service = await this.models.Service.create({
            id_lieu: id,
            nom_service: typeof serviceName === 'string'
              ? createMultiLang(serviceName, lang)
              : serviceName,
            disponible: true
          });
          createdServices.push(service);
        }
        return res.status(201).json({
          success: true,
          message: `${createdServices.length} services ajoutés`,
          data: translateDeep(createdServices, lang),
          lang
        });
      }

      // Ajout d'un seul service
      const service = await this.models.Service.create({
        id_lieu: id,
        nom_service: typeof nom === 'string' ? createMultiLang(nom, lang) : nom,
        description: description
          ? (typeof description === 'string' ? createMultiLang(description, lang) : description)
          : null,
        disponible
      });

      res.status(201).json({
        success: true,
        message: 'Service ajouté',
        data: translateDeep(service, lang),
        lang
      });

    } catch (error) {
      console.error('Erreur addServiceLieu:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  /**
   * Mettre à jour un service
   */
  async updateServiceLieu(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { id, serviceId } = req.params;
      const { nom, description, disponible } = req.body;

      const service = await this.models.Service.findOne({
        where: { id: serviceId, id_lieu: id }
      });

      if (!service) {
        return res.status(404).json({ success: false, error: 'Service non trouvé' });
      }

      const updates = {};
      if (nom !== undefined) {
        updates.nom_service = typeof nom === 'string'
          ? mergeTranslations(service.nom_service, { [lang]: nom })
          : nom;
      }
      if (description !== undefined) {
        updates.description = typeof description === 'string'
          ? mergeTranslations(service.description, { [lang]: description })
          : description;
      }
      if (disponible !== undefined) {
        updates.disponible = disponible;
      }

      await service.update(updates);

      res.json({
        success: true,
        message: 'Service mis à jour',
        data: translateDeep(service, lang),
        lang
      });

    } catch (error) {
      console.error('Erreur updateServiceLieu:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  /**
   * Supprimer un service
   */
  async deleteServiceLieu(req, res) {
    try {
      const { id, serviceId } = req.params;

      const service = await this.models.Service.findOne({
        where: { id: serviceId, id_lieu: id }
      });

      if (!service) {
        return res.status(404).json({ success: false, error: 'Service non trouvé' });
      }

      await service.destroy();

      res.json({
        success: true,
        message: 'Service supprimé'
      });

    } catch (error) {
      console.error('Erreur deleteServiceLieu:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // ========================================================================
  // GESTION DES DÉTAILS D'UN LIEU
  // ========================================================================

  /**
   * Obtenir les détails d'un lieu
   */
  async getDetailsLieu(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { id } = req.params;

      const details = await this.models.DetailLieu.findOne({
        where: { id_lieu: id },
        include: [
          { model: this.models.Monument },
          { model: this.models.Vestige }
        ]
      });

      if (!details) {
        return res.status(404).json({ success: false, error: 'Détails non trouvés' });
      }

      res.json({
        success: true,
        data: translateDeep(details, lang),
        lang
      });

    } catch (error) {
      console.error('Erreur getDetailsLieu:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  /**
   * Créer ou mettre à jour les détails d'un lieu
   */
  async updateDetailsLieu(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { id } = req.params;
      const { description, horaires, histoire, referencesHistoriques } = req.body;

      const lieu = await this.models.Lieu.findByPk(id);
      if (!lieu) {
        return res.status(404).json({ success: false, error: 'Lieu non trouvé' });
      }

      let details = await this.models.DetailLieu.findOne({ where: { id_lieu: id } });

      const data = {};
      if (description !== undefined) {
        data.description = typeof description === 'string'
          ? createMultiLang(description, lang)
          : description;
      }
      if (horaires !== undefined) {
        data.horaires = typeof horaires === 'string'
          ? createMultiLang(horaires, lang)
          : horaires;
      }
      if (histoire !== undefined) {
        data.histoire = typeof histoire === 'string'
          ? createMultiLang(histoire, lang)
          : histoire;
      }
      if (referencesHistoriques !== undefined) {
        data.referencesHistoriques = typeof referencesHistoriques === 'string'
          ? createMultiLang(referencesHistoriques, lang)
          : referencesHistoriques;
      }

      if (details) {
        // Mettre à jour en fusionnant les traductions
        const updates = {};
        if (description !== undefined) {
          updates.description = typeof description === 'string'
            ? mergeTranslations(details.description, { [lang]: description })
            : description;
        }
        if (horaires !== undefined) {
          updates.horaires = typeof horaires === 'string'
            ? mergeTranslations(details.horaires, { [lang]: horaires })
            : horaires;
        }
        if (histoire !== undefined) {
          updates.histoire = typeof histoire === 'string'
            ? mergeTranslations(details.histoire, { [lang]: histoire })
            : histoire;
        }
        if (referencesHistoriques !== undefined) {
          updates.referencesHistoriques = typeof referencesHistoriques === 'string'
            ? mergeTranslations(details.referencesHistoriques, { [lang]: referencesHistoriques })
            : referencesHistoriques;
        }
        await details.update(updates);
      } else {
        // Créer les détails
        details = await this.models.DetailLieu.create({
          id_lieu: id,
          ...data
        });
      }

      res.json({
        success: true,
        message: details ? 'Détails mis à jour' : 'Détails créés',
        data: translateDeep(details, lang),
        lang
      });

    } catch (error) {
      console.error('Erreur updateDetailsLieu:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }
}

module.exports = LieuController;
