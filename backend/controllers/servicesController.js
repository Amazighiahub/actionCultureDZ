// controllers/ServicesController.js - VERSION i18n
const { Op } = require('sequelize');

// ⚡ Import du helper i18n
const { translate, translateDeep, createMultiLang, mergeTranslations } = require('../helpers/i18n');

// ✅ OPTIMISATION: Import de l'utilitaire de recherche multilingue centralisé
const { buildMultiLangSearch } = require('../utils/MultiLangSearchBuilder');

class ServicesController {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
  }

  // ⚡ Recherche multilingue - utilise l'utilitaire centralisé
  buildMultiLangSearchLocal(field, search) {
    return buildMultiLangSearch(this.sequelize, field, search);
  }

  // Récupérer tous les services
  async getAllServices(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { page = 1, limit = 20, type, lieu, search } = req.query;
      const offset = (page - 1) * limit;

      const where = {};

      // ⚡ Recherche multilingue
      if (search) {
        where[Op.or] = [
          ...this.buildMultiLangSearchLocal('nom', search),
          ...this.buildMultiLangSearchLocal('description', search)
        ];
      }

      if (type) where.type_service = type;
      if (lieu) where.id_lieu = lieu;

      const services = await this.models.Service.findAndCountAll({
        where,
        include: [
          {
            model: this.models.Lieu,
            attributes: ['id_lieu', 'nom', 'adresse']
          }
        ],
        limit: parseInt(limit),
        offset,
        order: [[this.sequelize.fn('JSON_EXTRACT', this.sequelize.col('Service.nom'), `$.${lang}`), 'ASC']]
      });

      // ⚡ Traduire
      res.json({
        success: true,
        data: {
          services: translateDeep(services.rows, lang),
          pagination: {
            total: services.count,
            page: parseInt(page),
            pages: Math.ceil(services.count / limit)
          }
        },
        lang
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Récupérer un service par ID
  async getServiceById(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { id } = req.params;

      const service = await this.models.Service.findByPk(id, {
        include: [
          {
            model: this.models.Lieu,
            include: [
              { model: this.models.Commune },
              { model: this.models.LieuMedia }
            ]
          }
        ]
      });

      if (!service) {
        return res.status(404).json({ success: false, error: 'Service non trouvé' });
      }

      // ⚡ Traduire
      res.json({
        success: true,
        data: translateDeep(service, lang),
        lang
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Services par lieu
  async getServicesByLieu(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { lieuId } = req.params;

      const services = await this.models.Service.findAll({
        where: { id_lieu: lieuId },
        order: [[this.sequelize.fn('JSON_EXTRACT', this.sequelize.col('nom'), `$.${lang}`), 'ASC']]
      });

      // ⚡ Traduire
      res.json({
        success: true,
        data: translateDeep(services, lang),
        lang
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // ⚡ Préparer un champ multilingue
  prepareMultiLangField(value, lang = 'fr') {
    if (!value) return null;
    if (typeof value === 'object' && value !== null) return value;
    return createMultiLang(value, lang);
  }

  // Créer un service
  async createService(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const {
        nom,
        description,
        type_service,
        id_lieu,
        horaires,
        adresse,
        telephone,
        email,
        site_web,
        latitude,
        longitude,
        tarif_min,
        tarif_max,
        disponible = true
      } = req.body;

      if (!nom) {
        return res.status(400).json({
          success: false,
          error: 'Le nom est requis'
        });
      }

      if (!type_service) {
        return res.status(400).json({
          success: false,
          error: 'Le type de service est requis'
        });
      }

      // ⚡ Préparer les champs multilingues
      const nomMultiLang = this.prepareMultiLangField(nom, lang);
      const descriptionMultiLang = this.prepareMultiLangField(description, lang);
      const horairesMultiLang = this.prepareMultiLangField(horaires, lang);
      const adresseMultiLang = this.prepareMultiLangField(adresse, lang);

      // Récupérer l'utilisateur connecté (professionnel)
      const id_user = req.user?.id_user || req.user?.id || null;

      const service = await this.models.Service.create({
        nom: nomMultiLang,
        description: descriptionMultiLang,
        type_service,
        id_lieu: id_lieu || null,
        horaires: horairesMultiLang,
        adresse: adresseMultiLang,
        telephone: telephone || null,
        email: email || null,
        site_web: site_web || null,
        latitude: latitude || null,
        longitude: longitude || null,
        tarif_min: tarif_min || null,
        tarif_max: tarif_max || null,
        disponible: disponible !== false,
        id_user,
        statut: 'en_attente' // Par défaut en attente de validation
      });

      // ⚡ Traduire
      res.status(201).json({
        success: true,
        message: 'Service créé avec succès',
        data: translate(service, lang)
      });

    } catch (error) {
      console.error('Erreur création service:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Mettre à jour un service
  async updateService(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { id } = req.params;
      const {
        nom,
        description,
        horaires,
        adresse,
        type_service,
        telephone,
        email,
        site_web,
        latitude,
        longitude,
        tarif_min,
        tarif_max,
        disponible,
        ...otherFields
      } = req.body;

      const service = await this.models.Service.findByPk(id);
      if (!service) {
        return res.status(404).json({ success: false, error: 'Service non trouvé' });
      }

      const updates = { ...otherFields };

      // ⚡ Gérer les champs multilingues
      if (nom !== undefined) {
        if (typeof nom === 'object') {
          updates.nom = mergeTranslations(service.nom, nom);
        } else {
          updates.nom = mergeTranslations(service.nom, { [lang]: nom });
        }
      }

      if (description !== undefined) {
        if (typeof description === 'object') {
          updates.description = mergeTranslations(service.description, description);
        } else {
          updates.description = mergeTranslations(service.description, { [lang]: description });
        }
      }

      if (horaires !== undefined) {
        if (typeof horaires === 'object') {
          updates.horaires = mergeTranslations(service.horaires, horaires);
        } else {
          updates.horaires = mergeTranslations(service.horaires, { [lang]: horaires });
        }
      }

      if (adresse !== undefined) {
        if (typeof adresse === 'object') {
          updates.adresse = mergeTranslations(service.adresse, adresse);
        } else {
          updates.adresse = mergeTranslations(service.adresse, { [lang]: adresse });
        }
      }

      // Champs simples
      if (type_service !== undefined) updates.type_service = type_service;
      if (telephone !== undefined) updates.telephone = telephone;
      if (email !== undefined) updates.email = email;
      if (site_web !== undefined) updates.site_web = site_web;
      if (latitude !== undefined) updates.latitude = latitude;
      if (longitude !== undefined) updates.longitude = longitude;
      if (tarif_min !== undefined) updates.tarif_min = tarif_min;
      if (tarif_max !== undefined) updates.tarif_max = tarif_max;
      if (disponible !== undefined) updates.disponible = disponible;

      await service.update(updates);

      // ⚡ Traduire
      res.json({
        success: true,
        message: 'Service mis à jour',
        data: translate(service, lang)
      });

    } catch (error) {
      console.error('Erreur mise à jour service:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Supprimer un service
  async deleteService(req, res) {
    try {
      const { id } = req.params;

      const service = await this.models.Service.findByPk(id);
      if (!service) {
        return res.status(404).json({ success: false, error: 'Service non trouvé' });
      }

      await service.destroy();

      res.json({
        success: true,
        message: 'Service supprimé'
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Types de services disponibles
  async getTypesServices(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡

      const types = await this.models.Service.findAll({
        attributes: [
          [this.sequelize.fn('DISTINCT', this.sequelize.col('type_service')), 'type']
        ],
        where: {
          type_service: { [Op.ne]: null }
        }
      });

      res.json({
        success: true,
        data: types.map(t => t.type),
        lang
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // ⚡ Récupérer les traductions d'un service (admin)
  async getServiceTranslations(req, res) {
    try {
      const { id } = req.params;

      const service = await this.models.Service.findByPk(id, {
        attributes: ['id_service', 'nom', 'description', 'horaires']
      });

      if (!service) {
        return res.status(404).json({ success: false, error: 'Service non trouvé' });
      }

      res.json({ success: true, data: service });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // ⚡ Mettre à jour une traduction spécifique (admin)
  async updateServiceTranslation(req, res) {
    try {
      const { id, lang } = req.params;
      const { nom, description, horaires } = req.body;

      const service = await this.models.Service.findByPk(id);
      if (!service) {
        return res.status(404).json({ success: false, error: 'Service non trouvé' });
      }

      const updates = {};
      if (nom) updates.nom = mergeTranslations(service.nom, { [lang]: nom });
      if (description) updates.description = mergeTranslations(service.description, { [lang]: description });
      if (horaires) updates.horaires = mergeTranslations(service.horaires, { [lang]: horaires });

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, error: 'Aucune donnée' });
      }

      await service.update(updates);
      res.json({ success: true, message: `Traduction ${lang} mise à jour`, data: service });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }
}

module.exports = ServicesController;
