/**
 * LieuRepository - Repository pour les lieux
 * Encapsule tous les accès Sequelize pour le modèle Lieu
 */
const BaseRepository = require('./baseRepository');
const { Op } = require('sequelize');
const { buildMultiLangSearch } = require('../utils/multiLangSearchBuilder');

class LieuRepository extends BaseRepository {
  constructor(models) {
    super(models.Lieu);
    this.models = models;
    this.sequelize = models.sequelize || models.Lieu.sequelize;
  }

  /**
   * Includes par défaut pour un lieu
   */
  _defaultIncludes() {
    const includes = [];
    if (this.models.Commune) {
      includes.push({
        model: this.models.Commune,
        attributes: ['nom'],
        include: this.models.Daira ? [{
          model: this.models.Daira,
          attributes: ['nom'],
          include: this.models.Wilaya ? [{ model: this.models.Wilaya, attributes: ['nom', 'code'] }] : []
        }] : []
      });
    }
    if (this.models.Wilaya) {
      includes.push({ model: this.models.Wilaya, attributes: ['nom', 'code'] });
    }
    return includes;
  }

  /**
   * Recherche paginée avec filtres
   */
  async findFiltered({ page = 1, limit = 20, search, typeLieu, typeLieuCulturel, communeId, wilayaId, statut, lang = 'fr' }) {
    const where = {};

    if (search) {
      where[Op.or] = buildMultiLangSearch(this.sequelize, 'nom', search, 'Lieu');
    }
    if (typeLieu) where.type_lieu = typeLieu;
    if (typeLieuCulturel) where.type_lieu_culturel = typeLieuCulturel;
    if (communeId) where.commune_id = communeId;
    if (wilayaId) where.wilaya_id = wilayaId;
    if (statut) where.statut = statut;

    const safeLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const offset = (page - 1) * safeLimit;

    const { rows, count } = await this.model.findAndCountAll({
      where,
      include: this._defaultIncludes(),
      limit: safeLimit,
      offset,
      order: [['date_creation', 'DESC']],
      distinct: true
    });

    return {
      data: rows,
      pagination: {
        page,
        limit: safeLimit,
        total: count,
        totalPages: Math.ceil(count / safeLimit),
        hasNext: page * safeLimit < count,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Trouve un lieu avec tous ses détails (médias, détails, etc.)
   */
  async findWithFullDetails(id) {
    const includes = [...this._defaultIncludes()];
    if (this.models.DetailLieu) {
      includes.push({ model: this.models.DetailLieu });
    }
    if (this.models.LieuMedia) {
      includes.push({ model: this.models.LieuMedia });
    }
    if (this.models.Localite) {
      includes.push({ model: this.models.Localite, attributes: ['nom'] });
    }

    return this.model.findByPk(id, { include: includes });
  }

  /**
   * Lieux pour la carte (attributs minimaux + coordonnées)
   */
  async findForMap({ typeLieu, wilayaId } = {}) {
    const where = {};
    if (typeLieu) where.type_lieu = typeLieu;
    if (wilayaId) where.wilaya_id = wilayaId;

    return this.model.findAll({
      where,
      attributes: ['id_lieu', 'nom', 'type_lieu', 'latitude', 'longitude', 'statut'],
      include: this.models.Wilaya
        ? [{ model: this.models.Wilaya, attributes: ['nom', 'code'] }]
        : []
    });
  }

  /**
   * Trouve une commune par ID
   */
  async findCommuneById(communeId) {
    if (!this.models.Commune) return null;
    return this.models.Commune.findByPk(communeId);
  }

  /**
   * Trouve la première commune d'une wilaya
   */
  async findCommuneByWilaya(wilayaId) {
    if (!this.models.Commune || !this.models.Daira) return null;
    return this.models.Commune.findOne({
      include: [{
        model: this.models.Daira,
        where: { id_wilaya: wilayaId },
        attributes: []
      }]
    });
  }

  /**
   * Trouve une localité par ID
   */
  async findLocaliteById(localiteId) {
    if (!this.models.Localite) return null;
    return this.models.Localite.findByPk(localiteId);
  }
}

module.exports = LieuRepository;
