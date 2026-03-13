/**
 * LieuService - Service pour la gestion des lieux
 *
 * Encapsule toute la logique d'acces aux donnees (Sequelize) pour les lieux.
 * Le controller n'a plus qu'a appeler ces methodes et formater les reponses HTTP.
 */
const { Op } = require('sequelize');
const { createMultiLang, mergeTranslations } = require('../helpers/i18n');
const { buildMultiLangSearch } = require('../utils/multiLangSearchBuilder');
const { sanitizeLike } = require('../utils/sanitize');

const ALLOWED_LANGS = ['fr', 'ar', 'en', 'tz-ltn', 'tz-tfng'];

class LieuService {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
  }

  // ========================================================================
  // HELPERS INTERNES
  // ========================================================================

  /**
   * Recherche multilingue via l'utilitaire centralise
   */
  _buildMultiLangSearch(field, search) {
    return buildMultiLangSearch(this.sequelize, field, search, 'Lieu');
  }

  /**
   * Prepare un champ multilingue (string -> objet i18n)
   */
  _prepareMultiLangField(value, lang = 'fr') {
    if (!value) return null;
    if (typeof value === 'object' && value !== null) return value;
    return createMultiLang(value, lang);
  }

  /**
   * Construit l'include Commune -> Daira -> Wilaya avec filtres optionnels
   */
  _buildCommuneInclude({ commune, daira, wilaya, required = false } = {}) {
    if (!this.models.Commune) return null;

    const communeInclude = {
      model: this.models.Commune,
      attributes: ['id_commune', 'nom', 'commune_name_ascii'],
      required,
      where: commune ? { id_commune: commune } : undefined
    };

    if (this.models.Daira) {
      communeInclude.include = [{
        model: this.models.Daira,
        attributes: ['id_daira', 'nom', 'daira_name_ascii'],
        required,
        where: daira ? { id_daira: daira } : undefined
      }];

      if (this.models.Wilaya) {
        communeInclude.include[0].include = [{
          model: this.models.Wilaya,
          attributes: ['id_wilaya', 'nom', 'wilaya_name_ascii'],
          required,
          where: wilaya ? { id_wilaya: wilaya } : undefined
        }];
      }
    }

    return communeInclude;
  }

  /**
   * Include complet Commune -> Daira -> Wilaya (sans filtres, pour reload)
   */
  _fullCommuneInclude() {
    return {
      model: this.models.Commune,
      include: [{
        model: this.models.Daira,
        include: [{ model: this.models.Wilaya }]
      }]
    };
  }

  /**
   * Ordre par nom multilingue avec fallback sur id_lieu
   */
  _orderByName(lang) {
    const safeLang = (lang || 'fr').replace(/[^a-z-]/gi, '');
    try {
      return [[this.sequelize.literal(`JSON_EXTRACT(\`Lieu\`.\`nom\`, '$.${safeLang}')`), 'ASC']];
    } catch {
      return [['id_lieu', 'ASC']];
    }
  }

  // ========================================================================
  // LECTURE
  // ========================================================================

  /**
   * Recuperer tous les lieux avec pagination et filtres
   * @param {Object} options
   * @param {string} options.lang
   * @param {number} options.page
   * @param {number} options.limit
   * @param {number} options.wilaya
   * @param {number} options.daira
   * @param {number} options.commune
   * @param {string} options.type_lieu
   * @param {string} options.search
   * @param {boolean|string} options.with_events
   * @returns {{ rows: Array, count: number }}
   */
  async getAllLieux({ lang = 'fr', page = 1, limit = 10, wilaya, daira, commune, type_lieu, search, with_events = false } = {}) {
    const offset = (page - 1) * limit;
    const where = {};
    const include = [];

    // Commune -> Daira -> Wilaya
    const communeInclude = this._buildCommuneInclude({ commune, daira, wilaya });
    if (communeInclude) include.push(communeInclude);

    // Localite
    if (this.models.Localite) {
      include.push({
        model: this.models.Localite,
        attributes: ['id_localite', 'nom', 'localite_name_ascii'],
        required: false
      });
    }

    // DetailLieu (seulement si pas trop de donnees)
    if (this.models.DetailLieu && parseInt(limit) <= 50) {
      include.push({
        model: this.models.DetailLieu,
        required: false
      });
    }

    // Service et LieuMedia (seulement si pas trop de donnees)
    if (this.models.Service && parseInt(limit) <= 50) {
      include.push({ model: this.models.Service, required: false });
    }
    if (this.models.LieuMedia && parseInt(limit) <= 50) {
      include.push({ model: this.models.LieuMedia, required: false });
    }

    if (type_lieu) where.typeLieu = type_lieu;

    // Recherche multilingue
    if (search) {
      where[Op.or] = [
        ...this._buildMultiLangSearch('nom', search),
        ...this._buildMultiLangSearch('adresse', search)
      ];
    }

    // Evenements actifs
    if (with_events === 'true' && this.models.Evenement) {
      include.push({
        model: this.models.Evenement,
        attributes: ['nom_evenement', 'date_debut', 'date_fin'],
        where: { date_fin: { [Op.gte]: new Date() } },
        required: false
      });
    }

    // Ordre
    let order = [['id_lieu', 'ASC']];
    try {
      order = [[this.sequelize.literal(`JSON_EXTRACT(\`Lieu\`.\`nom\`, '$.${lang.replace(/[^a-z-]/gi, '')}')`), 'ASC']];
    } catch {
      // Fallback sur l'ID
    }

    const result = await this.models.Lieu.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      include,
      order,
      distinct: true,
      subQuery: false
    });

    // Aplatir les relations geographiques
    const rows = result.rows.map(lieu => {
      const lieuData = lieu.toJSON();
      lieuData.wilaya = lieuData.Commune?.Daira?.Wilaya || null;
      lieuData.daira = lieuData.Commune?.Daira || null;
      lieuData.commune = lieuData.Commune || null;
      return lieuData;
    });

    return { rows, count: result.count };
  }

  /**
   * Recuperer les lieux d'une wilaya specifique
   * @returns {{ wilaya: Object|null, rows: Array, count: number }}
   */
  async getLieuxByWilaya(wilayaId, { lang = 'fr', page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;

    const wilaya = await this.models.Wilaya.findByPk(wilayaId);
    if (!wilaya) return { wilaya: null, rows: [], count: 0 };

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
              where: { wilayaId },
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
      order: this._orderByName(lang),
      distinct: true
    });

    return { wilaya, rows: lieux.rows, count: lieux.count };
  }

  /**
   * Trouver une commune appartenant a une wilaya (pour createLieu fallback)
   */
  async findCommuneByWilaya(wilayaId) {
    return this.models.Commune.findOne({
      include: [{
        model: this.models.Daira,
        where: { wilayaId },
        required: true
      }]
    });
  }

  /**
   * Trouver une commune par ID (pour validation)
   */
  async findCommuneById(communeId) {
    return this.models.Commune.findByPk(communeId);
  }

  /**
   * Trouver une localite par ID (pour validation)
   */
  async findLocaliteById(localiteId) {
    return this.models.Localite.findByPk(localiteId);
  }

  /**
   * Obtenir un lieu par ID avec toutes les includes
   */
  async getLieuById(id) {
    const lieu = await this.models.Lieu.findByPk(id, {
      include: [
        this._fullCommuneInclude(),
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

    if (!lieu) return null;

    const lieuData = lieu.toJSON();
    lieuData.wilaya = lieuData.Commune?.Daira?.Wilaya || null;
    lieuData.daira = lieuData.Commune?.Daira || null;
    return lieuData;
  }

  // ========================================================================
  // CREATION / MODIFICATION / SUPPRESSION
  // ========================================================================

  /**
   * Creer un lieu + optionnel DetailLieu, recharger avec includes
   * @param {Object} data - champs du lieu
   * @param {string} lang - langue courante
   * @returns {Object} lieu cree avec includes
   */
  async createLieu(data, lang = 'fr') {
    const {
      nom, typeLieu = 'Commune', typeLieuCulturel, communeId, localiteId,
      adresse, description, histoire, latitude, longitude,
      details, detail
    } = data;

    const lieu = await this.models.Lieu.create({
      nom: this._prepareMultiLangField(nom, lang),
      adresse: this._prepareMultiLangField(adresse, lang),
      description: this._prepareMultiLangField(description, lang),
      histoire: this._prepareMultiLangField(histoire, lang),
      typeLieu,
      typeLieuCulturel,
      communeId,
      localiteId,
      latitude,
      longitude
    });

    // Creer les details si fournis (accepter details ou detail)
    const detailsData = details || detail;
    if (detailsData) {
      await this.models.DetailLieu.create({
        id_lieu: lieu.id_lieu,
        description: this._prepareMultiLangField(detailsData.description, lang),
        horaires: this._prepareMultiLangField(detailsData.horaires, lang),
        histoire: this._prepareMultiLangField(detailsData.histoire, lang),
        referencesHistoriques: detailsData.referencesHistoriques
      });
    }

    // Recharger avec includes
    const lieuComplet = await this.models.Lieu.findByPk(lieu.id_lieu, {
      include: [
        this._fullCommuneInclude(),
        { model: this.models.Localite },
        { model: this.models.DetailLieu }
      ]
    });

    return lieuComplet;
  }

  /**
   * Mettre a jour un lieu
   * @param {number} id
   * @param {Object} updates - champs a mettre a jour (dont nom, adresse, description, histoire multilingues)
   * @returns {Object|null} lieu mis a jour ou null si introuvable
   */
  async updateLieu(id, updates) {
    const lieu = await this.models.Lieu.findByPk(id, {
      include: [{ model: this.models.DetailLieu }]
    });

    if (!lieu) return null;

    await lieu.update(updates);

    const lieuMisAJour = await this.models.Lieu.findByPk(id, {
      include: [
        this._fullCommuneInclude(),
        { model: this.models.Localite },
        { model: this.models.DetailLieu },
        { model: this.models.Service },
        { model: this.models.LieuMedia }
      ]
    });

    return lieuMisAJour;
  }

  /**
   * Trouver un lieu par ID avec ses evenements (pour verification avant suppression)
   * @returns {{ lieu: Object|null, hasEvents: boolean }}
   */
  async deleteLieu(id) {
    const lieu = await this.models.Lieu.findByPk(id, {
      include: [{ model: this.models.Evenement }]
    });

    if (!lieu) return { lieu: null, hasEvents: false };

    if (lieu.Evenements && lieu.Evenements.length > 0) {
      return { lieu, hasEvents: true };
    }

    await lieu.destroy();
    return { lieu, hasEvents: false };
  }

  // ========================================================================
  // RECHERCHE
  // ========================================================================

  /**
   * Rechercher des lieux avec geo (Haversine) ou texte
   * @param {Object} options
   * @returns {{ rows: Array, count: number }} ou { invalidCoords: true } ou { coordsOutOfRange: true }
   */
  async searchLieux({ lang = 'fr', q, type, commune, daira, wilaya, radius, lat, lng, page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const where = {};

    // Recherche multilingue
    if (q) {
      where[Op.or] = [
        ...this._buildMultiLangSearch('nom', q),
        ...this._buildMultiLangSearch('adresse', q)
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

    // Recherche geo (Haversine)
    if (radius && lat && lng) {
      const safeLat = parseFloat(lat);
      const safeLng = parseFloat(lng);
      const safeRadius = parseFloat(radius);

      if (isNaN(safeLat) || isNaN(safeLng) || isNaN(safeRadius)) {
        return { invalidCoords: true };
      }

      if (safeLat < -90 || safeLat > 90 || safeLng < -180 || safeLng > 180) {
        return { coordsOutOfRange: true };
      }

      const clampedRadius = Math.min(Math.max(safeRadius, 0), 500);

      const distance = this.sequelize.literal(
        `6371 * acos(
          cos(radians(${safeLat})) * cos(radians(latitude)) *
          cos(radians(longitude) - radians(${safeLng})) +
          sin(radians(${safeLat})) * sin(radians(latitude))
        )`
      );

      const result = await this.models.Lieu.findAndCountAll({
        where: {
          ...where,
          [Op.and]: this.sequelize.literal(
            `6371 * acos(
              cos(radians(${safeLat})) * cos(radians(latitude)) *
              cos(radians(longitude) - radians(${safeLng})) +
              sin(radians(${safeLat})) * sin(radians(latitude))
            ) <= ${clampedRadius}`
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

      return { rows: result.rows, count: result.count };
    }

    // Recherche texte classique
    const result = await this.models.Lieu.findAndCountAll({
      where,
      include,
      order: this._orderByName(lang),
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true
    });

    return { rows: result.rows, count: result.count };
  }

  /**
   * Lieux a proximite par bounding box (lat/lng)
   */
  async getLieuxProximite({ latitude, longitude, rayon = 10, limit = 20 } = {}) {
    const latDelta = rayon / 111;
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

    return lieux;
  }

  // ========================================================================
  // STATISTIQUES
  // ========================================================================

  /**
   * Statistiques des lieux (total, par type, avec details, avec services)
   */
  async getStatistiques() {
    const [totalLieux, lieuxParType, lieuxAvecDetails, lieuxAvecServices] = await Promise.all([
      this.models.Lieu.count(),

      this.models.Lieu.findAll({
        attributes: [
          'typeLieu',
          [this.sequelize.fn('COUNT', '*'), 'count']
        ],
        group: ['typeLieu']
      }),

      this.models.Lieu.count({
        include: [{
          model: this.models.DetailLieu,
          required: true
        }]
      }),

      this.models.Lieu.count({
        include: [{
          model: this.models.Service,
          required: true
        }],
        distinct: true
      })
    ]);

    return { totalLieux, lieuxParType, lieuxAvecDetails, lieuxAvecServices };
  }

  // ========================================================================
  // VERIFICATION DOUBLONS
  // ========================================================================

  /**
   * Verifier les doublons par nom (JSON_EXTRACT) ou coordonnees
   * @param {Object} options
   * @returns {{ exists: boolean, lieu?: Object, matchType?: string, isPatrimoine?: boolean, hasDetailLieu?: boolean, typePatrimoine?: string }}
   */
  async checkDuplicate({ nom, latitude, longitude, typePatrimoine } = {}) {
    const normalizedNom = typeof nom === 'string' ? nom.trim() : '';
    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);
    const hasValidCoords = Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude);

    // Tolerance de 100 metres (environ 0.001 degre)
    const tolerance = 0.001;

    const coordsCondition = hasValidCoords ? {
      latitude: { [Op.between]: [parsedLatitude - tolerance, parsedLatitude + tolerance] },
      longitude: { [Op.between]: [parsedLongitude - tolerance, parsedLongitude + tolerance] }
    } : {};

    const typeCondition = typePatrimoine ? { typePatrimoine } : {};

    const commonIncludes = [
      {
        model: this.models.Commune,
        include: [{
          model: this.models.Daira,
          include: [{ model: this.models.Wilaya }]
        }]
      },
      {
        model: this.models.DetailLieu,
        required: false
      }
    ];

    // Rechercher par nom similaire
    let lieuByName = null;
    if (normalizedNom.length >= 3) {
      const safeNom = `%${sanitizeLike(normalizedNom)}%`;
      try {
        lieuByName = await this.models.Lieu.findOne({
          where: {
            ...typeCondition,
            [Op.or]: [
              this.sequelize.where(
                this.sequelize.fn('JSON_EXTRACT', this.sequelize.col('nom'), '$.fr'),
                { [Op.like]: safeNom }
              ),
              this.sequelize.where(
                this.sequelize.fn('JSON_EXTRACT', this.sequelize.col('nom'), '$.ar'),
                { [Op.like]: safeNom }
              ),
              this.sequelize.where(
                this.sequelize.fn('JSON_EXTRACT', this.sequelize.col('nom'), '$.en'),
                { [Op.like]: safeNom }
              )
            ]
          },
          include: commonIncludes
        });
      } catch (nameSearchError) {
        // Fallback tolerant si certaines lignes JSON sont invalides en base
        console.warn('Fallback checkDuplicate nom (JSON_EXTRACT indisponible):', nameSearchError.message);
        lieuByName = await this.models.Lieu.findOne({
          where: {
            ...typeCondition,
            nom: { [Op.like]: safeNom }
          },
          include: commonIncludes
        });
      }
    }

    // Rechercher par coordonnees proches
    let lieuByCoords = null;
    if (hasValidCoords) {
      lieuByCoords = await this.models.Lieu.findOne({
        where: {
          ...coordsCondition,
          ...typeCondition
        },
        include: commonIncludes
      });

      // Si pas trouve avec le type, chercher sans le type
      if (!lieuByCoords && typePatrimoine) {
        lieuByCoords = await this.models.Lieu.findOne({
          where: coordsCondition,
          include: commonIncludes
        });
      }
    }

    const existingLieu = lieuByName || lieuByCoords;

    if (existingLieu) {
      const hasDetailLieu = !!existingLieu.DetailLieu;
      const isPatrimoine = hasDetailLieu || !!existingLieu.typePatrimoine;

      return {
        exists: true,
        lieu: existingLieu,
        matchType: lieuByName ? 'name' : 'coordinates',
        isPatrimoine,
        hasDetailLieu,
        typePatrimoine: existingLieu.typePatrimoine || null
      };
    }

    return { exists: false };
  }

  // ========================================================================
  // TRADUCTIONS (ADMIN)
  // ========================================================================

  /**
   * Recuperer les traductions brutes d'un lieu
   */
  async getLieuTranslations(id) {
    return this.models.Lieu.findByPk(id, {
      attributes: ['id_lieu', 'nom', 'adresse', 'description', 'histoire'],
      include: [{
        model: this.models.DetailLieu,
        attributes: ['description', 'horaires', 'histoire']
      }]
    });
  }

  /**
   * Mettre a jour une traduction specifique
   * @returns {{ lieu: Object|null, updates: Object }}
   */
  async updateLieuTranslation(id, lang, fields) {
    const { nom, adresse, description, histoire } = fields;

    const lieu = await this.models.Lieu.findByPk(id);
    if (!lieu) return { lieu: null, updates: {} };

    const updates = {};
    if (nom) updates.nom = mergeTranslations(lieu.nom, { [lang]: nom });
    if (adresse) updates.adresse = mergeTranslations(lieu.adresse, { [lang]: adresse });
    if (description) updates.description = mergeTranslations(lieu.description, { [lang]: description });
    if (histoire) updates.histoire = mergeTranslations(lieu.histoire, { [lang]: histoire });

    if (Object.keys(updates).length > 0) {
      await lieu.update(updates);
    }

    return { lieu, updates };
  }

  // ========================================================================
  // SERVICES D'UN LIEU
  // ========================================================================

  /**
   * Obtenir les services d'un lieu
   * @returns {{ lieu: Object|null, services: Array }}
   */
  async getServicesLieu(lieuId) {
    const lieu = await this.models.Lieu.findByPk(lieuId);
    if (!lieu) return { lieu: null, services: [] };

    const services = await this.models.Service.findAll({
      where: { id_lieu: lieuId }
    });

    return { lieu, services };
  }

  /**
   * Ajouter un ou plusieurs services a un lieu
   * @param {number} lieuId
   * @param {Object} data - { nom, description, disponible, services }
   * @param {string} lang
   * @returns {{ lieu: Object|null, created: Array|Object }}
   */
  async addServiceLieu(lieuId, data, lang = 'fr') {
    const { nom, description, disponible = true, services } = data;

    const lieu = await this.models.Lieu.findByPk(lieuId);
    if (!lieu) return { lieu: null, created: null };

    // Support pour ajout multiple (array de noms)
    if (services && Array.isArray(services)) {
      const createdServices = [];
      for (const serviceName of services) {
        const service = await this.models.Service.create({
          id_lieu: lieuId,
          nom_service: typeof serviceName === 'string'
            ? createMultiLang(serviceName, lang)
            : serviceName,
          disponible: true
        });
        createdServices.push(service);
      }
      return { lieu, created: createdServices, isMultiple: true };
    }

    // Ajout d'un seul service
    const service = await this.models.Service.create({
      id_lieu: lieuId,
      nom_service: typeof nom === 'string' ? createMultiLang(nom, lang) : nom,
      description: description
        ? (typeof description === 'string' ? createMultiLang(description, lang) : description)
        : null,
      disponible
    });

    return { lieu, created: service, isMultiple: false };
  }

  /**
   * Mettre a jour un service d'un lieu
   * @returns {Object|null} service mis a jour ou null si introuvable
   */
  async updateServiceLieu(lieuId, serviceId, data, lang = 'fr') {
    const { nom, description, disponible } = data;

    const service = await this.models.Service.findOne({
      where: { id: serviceId, id_lieu: lieuId }
    });

    if (!service) return null;

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
    return service;
  }

  /**
   * Supprimer un service d'un lieu
   * @returns {boolean} true si supprime, false si introuvable
   */
  async deleteServiceLieu(lieuId, serviceId) {
    const service = await this.models.Service.findOne({
      where: { id: serviceId, id_lieu: lieuId }
    });

    if (!service) return false;

    await service.destroy();
    return true;
  }

  // ========================================================================
  // DETAILS D'UN LIEU
  // ========================================================================

  /**
   * Obtenir les details d'un lieu avec Monument et Vestige
   */
  async getDetailsLieu(lieuId) {
    return this.models.DetailLieu.findOne({
      where: { id_lieu: lieuId },
      include: [
        { model: this.models.Monument },
        { model: this.models.Vestige }
      ]
    });
  }

  /**
   * Creer ou mettre a jour les details d'un lieu
   * @returns {{ lieu: Object|null, details: Object|null }}
   */
  async updateDetailsLieu(lieuId, data, lang = 'fr') {
    const { description, horaires, histoire, referencesHistoriques } = data;

    const lieu = await this.models.Lieu.findByPk(lieuId);
    if (!lieu) return { lieu: null, details: null };

    let details = await this.models.DetailLieu.findOne({ where: { id_lieu: lieuId } });

    if (details) {
      // Mettre a jour en fusionnant les traductions
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
      // Creer les details
      const createData = {};
      if (description !== undefined) {
        createData.description = typeof description === 'string'
          ? createMultiLang(description, lang)
          : description;
      }
      if (horaires !== undefined) {
        createData.horaires = typeof horaires === 'string'
          ? createMultiLang(horaires, lang)
          : horaires;
      }
      if (histoire !== undefined) {
        createData.histoire = typeof histoire === 'string'
          ? createMultiLang(histoire, lang)
          : histoire;
      }
      if (referencesHistoriques !== undefined) {
        createData.referencesHistoriques = typeof referencesHistoriques === 'string'
          ? createMultiLang(referencesHistoriques, lang)
          : referencesHistoriques;
      }

      details = await this.models.DetailLieu.create({
        id_lieu: lieuId,
        ...createData
      });
    }

    return { lieu, details };
  }
}

module.exports = LieuService;
