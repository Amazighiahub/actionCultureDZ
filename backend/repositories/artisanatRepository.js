/**
 * ArtisanatRepository - Accès données pour l'artisanat
 * Artisanat est lié à Oeuvre (relation 1:1) avec Materiau et Technique
 */

const BaseRepository = require('./baseRepository');
const { Op } = require('sequelize');

class ArtisanatRepository extends BaseRepository {
  constructor(models) {
    super(models.Artisanat);
    this.models = models;
  }

  /**
   * Inclusions standard
   */
  _defaultIncludes() {
    const includes = [];

    if (this.models.Oeuvre) {
      const oeuvreInclude = {
        model: this.models.Oeuvre,
        required: true,
        include: []
      };
      if (this.models.User) {
        oeuvreInclude.include.push({
          model: this.models.User,
          as: 'Saiseur',
          attributes: ['id_user', 'nom', 'prenom', 'photo_url'],
          required: false
        });
      }
      if (this.models.Media) {
        oeuvreInclude.include.push({
          model: this.models.Media,
          attributes: ['id_media', 'url', 'type_media', 'thumbnail_url'],
          required: false
        });
      }
      includes.push(oeuvreInclude);
    }

    if (this.models.Materiau) {
      includes.push({
        model: this.models.Materiau,
        attributes: ['id_materiau', 'nom', 'description'],
        required: false
      });
    }

    if (this.models.Technique) {
      includes.push({
        model: this.models.Technique,
        attributes: ['id_technique', 'nom', 'description'],
        required: false
      });
    }

    return includes;
  }

  /**
   * Tous les artisanats publiés avec filtres
   */
  async findPublished(options = {}) {
    const { page = 1, limit = 12, materiau, technique, prixMin, prixMax, sort = 'recent' } = options;
    const where = {};

    if (materiau) where.id_materiau = materiau;
    if (technique) where.id_technique = technique;
    if (prixMin || prixMax) {
      where.prix = {};
      if (prixMin) where.prix[Op.gte] = parseFloat(prixMin);
      if (prixMax) where.prix[Op.lte] = parseFloat(prixMax);
    }

    const includes = this._defaultIncludes();
    // Force statut publie on Oeuvre include
    const oeuvreInc = includes.find(i => i.model === this.models.Oeuvre);
    if (oeuvreInc) {
      oeuvreInc.where = { ...(oeuvreInc.where || {}), statut: 'publie' };
    }

    let order;
    switch (sort) {
      case 'prix_asc': order = [['prix', 'ASC']]; break;
      case 'prix_desc': order = [['prix', 'DESC']]; break;
      case 'recent':
      default:
        order = this.models.Oeuvre
          ? [[this.models.Oeuvre, 'date_creation', 'DESC']]
          : [['date_creation', 'DESC']];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows, count } = await this.model.findAndCountAll({
      where,
      include: includes,
      limit: parseInt(limit),
      offset,
      order,
      distinct: true,
      subQuery: false
    });

    return {
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit)),
        hasNext: parseInt(page) * parseInt(limit) < count,
        hasPrev: parseInt(page) > 1
      }
    };
  }

  /**
   * Détail complet
   */
  async findWithFullDetails(id) {
    return this.model.findByPk(id, {
      include: this._defaultIncludes()
    });
  }

  /**
   * Recherche multilingue (via Oeuvre.titre, Oeuvre.description)
   */
  async searchArtisanats(query, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const sanitized = this._sanitizeSearchQuery(query);
    const pattern = `%${sanitized}%`;

    const includes = this._defaultIncludes();
    const oeuvreInc = includes.find(i => i.model === this.models.Oeuvre);
    if (oeuvreInc) {
      oeuvreInc.where = {
        statut: 'publie',
        [Op.or]: [
          { titre: { [Op.like]: pattern } },
          { description: { [Op.like]: pattern } }
        ]
      };
    }

    const { rows, count } = await this.model.findAndCountAll({
      include: includes,
      limit: parseInt(limit),
      offset,
      distinct: true
    });

    return {
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit)),
        hasNext: parseInt(page) * parseInt(limit) < count,
        hasPrev: parseInt(page) > 1
      }
    };
  }

  /**
   * Par artisan (id_user sur Oeuvre)
   */
  async findByArtisan(userId, options = {}) {
    const includes = this._defaultIncludes();
    const oeuvreInc = includes.find(i => i.model === this.models.Oeuvre);
    if (oeuvreInc) {
      oeuvreInc.where = { saisi_par: userId };
    }

    return this.findAll({
      ...options,
      include: includes
    });
  }

  /**
   * Statistiques
   */
  async getStats() {
    const total = await this.count();

    let byMateriau = [];
    if (this.models.Materiau) {
      byMateriau = await this.model.findAll({
        attributes: [
          'id_materiau',
          [this.model.sequelize.fn('COUNT', this.model.sequelize.col('id_artisanat')), 'count']
        ],
        include: [{
          model: this.models.Materiau,
          attributes: ['nom'],
          required: false
        }],
        group: ['id_materiau', 'Materiau.id_materiau'],
        raw: false,
        limit: 50
      });
    }

    let byTechnique = [];
    if (this.models.Technique) {
      byTechnique = await this.model.findAll({
        attributes: [
          'id_technique',
          [this.model.sequelize.fn('COUNT', this.model.sequelize.col('id_artisanat')), 'count']
        ],
        include: [{
          model: this.models.Technique,
          attributes: ['nom'],
          required: false
        }],
        group: ['id_technique', 'Technique.id_technique'],
        raw: false,
        limit: 50
      });
    }

    return { total, byMateriau, byTechnique };
  }
}

module.exports = ArtisanatRepository;
