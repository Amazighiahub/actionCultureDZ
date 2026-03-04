/**
 * PatrimoineRepository - Accès données pour les sites patrimoniaux (Lieu)
 * Extends BaseRepository avec des méthodes spécifiques au patrimoine
 */

const BaseRepository = require('./baseRepository');
const { Op } = require('sequelize');

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

    return includes;
  }

  /**
   * Ajoute la localisation (Commune → Daira → Wilaya) à un site
   */
  async _enrichWithLocation(siteData) {
    if (siteData.communeId && this.models.Commune) {
      try {
        const commune = await this.models.Commune.findByPk(siteData.communeId, {
          include: [{
            model: this.models.Daira,
            include: [{ model: this.models.Wilaya }]
          }]
        });
        if (commune) {
          const c = commune.toJSON();
          siteData.commune = c;
          siteData.daira = c.Daira;
          siteData.wilaya = c.Daira?.Wilaya;
        }
      } catch (e) { /* ignore location errors */ }
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

    const enriched = await Promise.all(
      sites.map(async s => this._enrichWithLocation(s.get({ plain: true })))
    );

    return enriched;
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

    // Enrich each site with location
    const enriched = await Promise.all(
      result.data.map(async s => this._enrichWithLocation(s.get ? s.get({ plain: true }) : s))
    );

    return { data: enriched, pagination: result.pagination };
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

    return this._enrichWithLocation(site.get({ plain: true }));
  }

  /**
   * Recherche multilingue
   */
  async searchSites(query, options = {}) {
    const { page = 1, limit = 20 } = options;
    const { literal } = require('sequelize');
    const sanitized = (query || '').replace(/'/g, "\\'").replace(/[%_]/g, '');
    const pattern = `%${sanitized}%`;

    const where = literal(
      `(JSON_EXTRACT(\`lieu\`.\`nom\`, '$.fr') LIKE '${pattern}' ` +
      `OR JSON_EXTRACT(\`lieu\`.\`nom\`, '$.ar') LIKE '${pattern}' ` +
      `OR JSON_EXTRACT(\`lieu\`.\`nom\`, '$.en') LIKE '${pattern}' ` +
      `OR JSON_EXTRACT(\`lieu\`.\`adresse\`, '$.fr') LIKE '${pattern}' ` +
      `OR JSON_EXTRACT(\`lieu\`.\`adresse\`, '$.ar') LIKE '${pattern}')`
    );

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
      order: [['createdAt', 'DESC']]
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
        raw: true
      })
    ]);

    return { total, thisMonth: thisMonthCount, byType };
  }
}

module.exports = PatrimoineRepository;
