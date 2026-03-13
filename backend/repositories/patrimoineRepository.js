/**
 * PatrimoineRepository - Accès données pour les sites patrimoniaux (Lieu)
 * Extends BaseRepository avec des méthodes spécifiques au patrimoine
 */

const BaseRepository = require('./baseRepository');
const { Op, fn, col, literal, where: seqWhere } = require('sequelize');

class PatrimoineRepository extends BaseRepository {
  constructor(models) {
    super(models.Lieu);
    this.models = models;
  }

  /**
   * Inclusions standard pour les sites patrimoniaux
   */
  _defaultIncludes() {
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
      includes.push({ model: this.models.LieuMedia, required: false });
    }

    if (this.models.Service) {
      includes.push({ model: this.models.Service, required: false });
    }

    if (this.models.QRCode) {
      includes.push({ model: this.models.QRCode, required: false });
    }

    // Localisation (Commune → Daira → Wilaya) incluse directement pour éviter N+1
    if (this.models.Commune) {
      const communeInclude = {
        model: this.models.Commune,
        attributes: ['id_commune', 'nom'],
        required: false
      };
      if (this.models.Daira) {
        const dairaInclude = {
          model: this.models.Daira,
          attributes: ['id_daira', 'nom'],
          required: false
        };
        if (this.models.Wilaya) {
          dairaInclude.include = [{
            model: this.models.Wilaya,
            attributes: ['id_wilaya', 'nom', 'code'],
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
    const where = {};
    if (typePatrimoine) where.typePatrimoine = typePatrimoine;

    const sites = await this.model.findAll({
      where,
      include: this._defaultIncludes(),
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    return sites.map(s => this._formatLocation(s.get({ plain: true })));
  }

  /**
   * Tous les sites avec pagination
   */
  async findAllSites(options = {}) {
    const { page = 1, limit = 20, typePatrimoine, wilayaId } = options;
    const where = {};
    if (typePatrimoine) where.typePatrimoine = typePatrimoine;

    let include = this._defaultIncludes();

    // Filtre par wilaya via Commune → Daira → Wilaya
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

    const result = await this.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      where,
      include,
      order: [['createdAt', 'DESC']]
    });

    const data = result.data.map(s => this._formatLocation(s.get ? s.get({ plain: true }) : s));

    return { data, pagination: result.pagination };
  }

  /**
   * Détail complet d'un site
   */
  async findWithFullDetails(id) {
    const includes = this._defaultIncludes();

    if (this.models.Programme) {
      includes.push({ model: this.models.Programme, required: false });
    }

    const site = await this.model.findByPk(id, { include: includes });
    if (!site) return null;

    return this._formatLocation(site.get({ plain: true }));
  }

  /**
   * Recherche multilingue
   */
  async searchSites(query, options = {}) {
    const { page = 1, limit = 20 } = options;
    const pattern = `%${this._sanitizeSearchQuery(query)}%`;

    const where = {
      [Op.or]: [
        seqWhere(fn('JSON_EXTRACT', col('lieu.nom'), literal("'$.fr'")), { [Op.like]: pattern }),
        seqWhere(fn('JSON_EXTRACT', col('lieu.nom'), literal("'$.ar'")), { [Op.like]: pattern }),
        seqWhere(fn('JSON_EXTRACT', col('lieu.nom'), literal("'$.en'")), { [Op.like]: pattern }),
        seqWhere(fn('JSON_EXTRACT', col('lieu.adresse'), literal("'$.fr'")), { [Op.like]: pattern }),
        seqWhere(fn('JSON_EXTRACT', col('lieu.adresse'), literal("'$.ar'")), { [Op.like]: pattern })
      ]
    };

    return this.findAll({
      page,
      limit,
      where,
      include: this._defaultIncludes(),
      order: [['id_lieu', 'DESC']]
    });
  }

  /**
   * Données pour la carte (coordonnées + infos minimales)
   */
  async findForMap(options = {}) {
    const { typePatrimoine, wilayaId } = options;
    const where = {};
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
