/**
 * PatrimoineRepository - Accès données pour les sites patrimoniaux (Lieu)
 * Extends BaseRepository avec des méthodes spécifiques au patrimoine
 */

const BaseRepository = require('./baseRepository');
const { Op, literal } = require('sequelize');
const { MAX_NIVEAUX_LIEU } = require('../constants/patrimoineTypes');
const { whereServicesVisibles } = require('../utils/servicesVisibles');

class PatrimoineRepository extends BaseRepository {
  constructor(models) {
    super(models.Lieu);
    this.models = models;
  }

  /**
   * Inclusions légères pour les listes (separate: true évite le produit cartésien)
   */
  _defaultIncludes() {
    const includes = [];

    // DetailLieu (hasOne)
    if (this.models.DetailLieu) {
      includes.push({
        model: this.models.DetailLieu,
        attributes: ['id_detailLieu', 'description', 'horaires', 'noteMoyenne'],
        required: false
      });
    }

    // LieuMedia (hasMany) — separate: true évite le produit cartésien
    if (this.models.LieuMedia) {
      includes.push({
        model: this.models.LieuMedia,
        required: false,
        separate: true,
        attributes: ['id', 'url', 'type']
      });
    }

    // Localisation (Commune → Daira → Wilaya)
    if (this.models.Commune) {
      const communeInclude = {
        model: this.models.Commune,
        attributes: ['id_commune', 'nom', 'commune_name_ascii'],
        required: false
      };
      if (this.models.Daira) {
        const dairaInclude = {
          model: this.models.Daira,
          attributes: ['id_daira', 'nom', 'daira_name_ascii'],
          required: false
        };
        if (this.models.Wilaya) {
          dairaInclude.include = [{
            model: this.models.Wilaya,
            attributes: ['id_wilaya', 'nom', 'wilaya_name_ascii', 'codeW'],
            required: false
          }];
        }
        communeInclude.include = [dairaInclude];
      }
      includes.push(communeInclude);
    }

    return includes;
  }

  /**
   * Inclusions complètes pour le détail (1 seul record → joins acceptables)
   */
  _fullIncludes() {
    const includes = [];

    if (this.models.DetailLieu) {
      const detailInclude = {
        model: this.models.DetailLieu,
        required: false
      };
      const detailNested = [];
      if (this.models.Monument) detailNested.push({ model: this.models.Monument, required: false });
      if (this.models.Vestige) detailNested.push({ model: this.models.Vestige, required: false });
      if (detailNested.length) detailInclude.include = detailNested;
      includes.push(detailInclude);
    }

    if (this.models.LieuMedia) {
      includes.push({ model: this.models.LieuMedia, required: false, separate: true });
    }

    if (this.models.Service) {
      // Public : services validés et équipements du site seulement
      includes.push({ model: this.models.Service, required: false, separate: true, where: whereServicesVisibles() });
    }

    if (this.models.QRCode) {
      includes.push({ model: this.models.QRCode, required: false, separate: true });
    }

    if (this.models.Commune) {
      const communeInclude = {
        model: this.models.Commune,
        attributes: ['id_commune', 'nom', 'commune_name_ascii'],
        required: false
      };
      if (this.models.Daira) {
        const dairaInclude = {
          model: this.models.Daira,
          attributes: ['id_daira', 'nom', 'daira_name_ascii'],
          required: false
        };
        if (this.models.Wilaya) {
          dairaInclude.include = [{
            model: this.models.Wilaya,
            attributes: ['id_wilaya', 'nom', 'wilaya_name_ascii', 'codeW'],
            required: false
          }];
        }
        communeInclude.include = [dairaInclude];
      }
      includes.push(communeInclude);
    }

    return includes;
  }

  /**
   * Formate la localisation à partir des données incluses (plus de requête N+1)
   */
  _formatLocation(siteData) {
    if (siteData.Commune) {
      siteData.commune = siteData.Commune;
      siteData.daira = siteData.Commune.Daira || null;
      siteData.wilaya = siteData.Commune.Daira?.Wilaya || null;
    }
    return siteData;
  }

  /**
   * Sites populaires
   */
  async findPopular(options = {}) {
    const { limit = 6, typePatrimoine } = options;
    // Public : brouillons et archives exclus (visibles seulement via la fiche, par l'auteur / la modération)
    // Les points de visite d'un site s'affichent sur sa fiche, pas dans les listes
    const where = { statut: 'publie', id_lieu_parent: null };
    if (typePatrimoine) where.typePatrimoine = typePatrimoine;

    const sites = await this.model.findAll({
      where,
      include: this._defaultIncludes(),
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      subQuery: false
    });

    return sites.map(s => this._formatLocation(s.get({ plain: true })));
  }

  /**
   * Tous les sites avec pagination
   */
  async findAllSites(options = {}) {
    const { page = 1, limit = 20, typePatrimoine, wilayaId, createurId } = options;
    const p = parseInt(page);
    const l = parseInt(limit);
    // Public : brouillons et archives exclus (visibles seulement via la fiche, par l'auteur / la modération).
    // « Mes sites » (createurId) : tous les sites et points créés par ce compte, quel que soit leur statut.
    const where = createurId ? { id_createur: createurId } : { statut: 'publie', id_lieu_parent: null };
    if (typePatrimoine) where.typePatrimoine = typePatrimoine;

    let include = this._defaultIncludes();

    // Filtre par wilaya : remplacer le Commune include existant par un filtre strict
    if (wilayaId && this.models.Commune) {
      include = include.filter(i => i.model !== this.models.Commune);
      include.push({
        model: this.models.Commune,
        attributes: ['id_commune', 'nom', 'commune_name_ascii'],
        required: true,
        include: [{
          model: this.models.Daira,
          attributes: ['id_daira', 'nom', 'daira_name_ascii'],
          required: true,
          include: [{
            model: this.models.Wilaya,
            attributes: ['id_wilaya', 'nom', 'wilaya_name_ascii', 'codeW'],
            where: { id_wilaya: wilayaId },
            required: true
          }]
        }]
      });
    }

    // Séparer count + findAll pour éviter le hang de findAndCountAll avec includes
    const [total, rows] = await Promise.all([
      this.model.count({ where }),
      this.model.findAll({
        where,
        include,
        order: [['createdAt', 'DESC']],
        limit: l,
        offset: (p - 1) * l,
        subQuery: false
      })
    ]);

    const data = rows.map(s => this._formatLocation(s.get ? s.get({ plain: true }) : s));

    return {
      data,
      pagination: {
        page: p,
        limit: l,
        total,
        totalPages: Math.ceil(total / l),
        hasNext: p * l < total,
        hasPrev: p > 1
      }
    };
  }

  /**
   * Détail complet d'un site
   */
  async findWithFullDetails(id) {
    const includes = this._fullIncludes();

    if (this.models.Programme) {
      // Activités d'événements publics qui ont lieu ici : champs publics seulement
      // (pas les notes de l'organisateur), avec l'événement pour le lien « Voir l'événement »
      includes.push({
        model: this.models.Programme,
        required: false,
        separate: true,
        attributes: ['id_programme', 'titre', 'description', 'date_programme', 'heure_debut', 'heure_fin', 'statut', 'type_activite', 'id_evenement', 'id_lieu'],
        include: [{
          model: this.models.Evenement,
          as: 'Evenement',
          required: true,
          where: { statut: { [Op.in]: ['publie', 'planifie', 'en_cours', 'termine', 'reporte'] } },
          attributes: ['id_evenement', 'nom_evenement', 'date_debut', 'date_fin', 'statut']
        }],
        order: [['date_programme', 'ASC'], ['heure_debut', 'ASC']]
      });
    }

    // Points de visite publiés, dans l'ordre de la visite, avec leurs images
    includes.push({
      model: this.model,
      as: 'SousLieux',
      required: false,
      separate: true,
      where: { statut: 'publie' },
      attributes: ['id_lieu', 'nom', 'typePatrimoine', 'latitude', 'longitude', 'ordre_visite', 'repere', 'id_lieu_parent'],
      order: [['ordre_visite', 'ASC'], ['id_lieu', 'ASC']],
      include: [
        ...(this.models.LieuMedia ? [{
          model: this.models.LieuMedia,
          required: false,
          separate: true,
          where: { type: 'image' },
          // pas de limit : avec separate, elle porterait sur l'ensemble des points
          attributes: ['id', 'url', 'type', 'id_lieu'],
          order: [['id', 'ASC']]
        }] : []),
        ...(this.models.DetailLieu ? [{
          model: this.models.DetailLieu,
          required: false,
          attributes: ['id_detailLieu', 'description']
        }] : [])
      ]
    });

    const site = await this.model.findByPk(id, { include: includes });
    if (!site) return null;

    const data = this._formatLocation(site.get({ plain: true }));
    data.Ancetres = await this.findAncetres(data.id_lieu_parent);
    data.Voisins = data.id_lieu_parent ? await this.findPointsDuSite(data.id_lieu_parent) : [];
    return data;
  }

  /**
   * Chemin vers le site principal, du plus haut au plus proche : [Timgad, Musée de Timgad].
   * Une requête par niveau, bornée par MAX_NIVEAUX_LIEU (protège aussi d'un cycle en base).
   */
  async findAncetres(idParent) {
    const ancetres = [];
    const vus = new Set();
    let courant = idParent;
    while (courant && !vus.has(courant) && ancetres.length < MAX_NIVEAUX_LIEU) {
      vus.add(courant);
      const parent = await this.model.findByPk(courant, {
        attributes: ['id_lieu', 'nom', 'typePatrimoine', 'latitude', 'longitude', 'communeId', 'localiteId', 'id_lieu_parent', 'statut', 'id_createur']
      });
      if (!parent) break;
      ancetres.unshift(parent.get({ plain: true }));
      courant = parent.id_lieu_parent;
    }
    return ancetres;
  }

  /**
   * Points publiés d'un site, dans l'ordre de visite (navigation point précédent / suivant)
   */
  async findPointsDuSite(idSite) {
    const points = await this.model.findAll({
      where: { id_lieu_parent: idSite, statut: 'publie' },
      attributes: ['id_lieu', 'nom', 'ordre_visite'],
      order: [['ordre_visite', 'ASC'], ['id_lieu', 'ASC']],
      limit: 200
    });
    return points.map(p => p.get({ plain: true }));
  }

  /**
   * Recherche multilingue
   */
  async searchSites(query, options = {}) {
    const { page = 1, limit = 20 } = options;
    const pattern = this.model.sequelize.escape(`%${this._sanitizeSearchQuery(query)}%`);
    // Texte extrait (JSON_UNQUOTE) comparé sans tenir compte des accents ni des majuscules :
    // « ait smail » trouve « Aït Smaïl » (la valeur JSON brute se comparait à l'identique)
    const champs = [
      ['nom', 'fr'], ['nom', 'ar'], ['nom', 'en'], ['nom', '"tz-ltn"'], ['nom', '"tz-tfng"'],
      ['adresse', 'fr'], ['adresse', 'ar']
    ];

    const where = {
      statut: 'publie',
      [Op.or]: champs.map(([champ, langue]) =>
        literal(`JSON_UNQUOTE(JSON_EXTRACT(\`Lieu\`.\`${champ}\`, '$.${langue}')) COLLATE utf8mb4_0900_ai_ci LIKE ${pattern}`))
    };

    return this.findAll({
      page,
      limit,
      where,
      // Les points de visite sont trouvés aussi : le site auquel ils appartiennent est joint
      include: [
        ...this._defaultIncludes(),
        { model: this.model, as: 'Parent', required: false, attributes: ['id_lieu', 'nom'] }
      ],
      order: [['id_lieu', 'DESC']]
    });
  }

  /**
   * Données pour la carte (coordonnées + infos minimales)
   */
  async findForMap(options = {}) {
    const { typePatrimoine, wilayaId } = options;
    // Public : brouillons et archives exclus (visibles seulement via la fiche, par l'auteur / la modération)
    const where = { statut: 'publie', id_lieu_parent: null };
    if (typePatrimoine) where.typePatrimoine = typePatrimoine;

    const include = [];
    if (wilayaId && this.models.Commune) {
      include.push({
        model: this.models.Commune,
        required: true,
        include: [{
          model: this.models.Daira,
          required: true,
          include: [{
            model: this.models.Wilaya,
            where: { id_wilaya: wilayaId },
            required: true
          }]
        }]
      });
    }

    return this.model.findAll({
      where,
      include,
      attributes: ['id_lieu', 'nom', 'latitude', 'longitude', 'typePatrimoine'],
      order: [['createdAt', 'DESC']],
      limit: 500
    });
  }

  /**
   * Statistiques patrimoine
   */
  async getStats() {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, thisMonthCount, byType] = await Promise.all([
      this.count(),
      this.count({ createdAt: { [Op.gte]: thisMonth } }),
      this.model.findAll({
        attributes: [
          'typePatrimoine',
          [this.model.sequelize.fn('COUNT', this.model.sequelize.col('id_lieu')), 'count']
        ],
        group: ['typePatrimoine'],
        raw: true,
        limit: 50
      })
    ]);

    return { total, thisMonth: thisMonthCount, byType };
  }
}

module.exports = PatrimoineRepository;
