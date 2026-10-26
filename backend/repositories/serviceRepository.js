/**
 * ServiceRepository - Accès données pour les services culturels
 * Extends BaseRepository avec des méthodes spécifiques aux services
 */

const BaseRepository = require('./baseRepository');
const { PUBLIC_USER_ATTRIBUTES } = require('../constants/publicAttributes');
const { Op } = require('sequelize');

class ServiceRepository extends BaseRepository {
  constructor(models) {
    super(models.Service);
    this.models = models;
  }

  /**
   * Inclusions standard
   */
  _defaultIncludes() {
    const includes = [];

    if (this.models.Lieu) {
      includes.push({
        model: this.models.Lieu,
        attributes: ['id_lieu', 'nom', 'adresse', 'latitude', 'longitude'],
        required: false
      });
    }

    if (this.models.User) {
      includes.push({
        model: this.models.User,
        as: 'Professionnel',
        attributes: PUBLIC_USER_ATTRIBUTES,
        required: false
      });
    }

    return includes;
  }

  /**
   * Services validés avec filtres
   */
  async findValidated(options = {}) {
    const { page = 1, limit = 20, type, lieuId } = options;
    const where = { statut: 'valide' };
    if (type) where.type_service = type;
    if (lieuId) where.id_lieu = parseInt(lieuId);

    return this.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      where,
      include: this._defaultIncludes(),
      order: [['createdAt', 'DESC']]
    });
  }

  /**
   * Annuaire public : services validés, avec leur lieu et sa wilaya (Commune › Daïra › Wilaya)
   */
  async findAnnuaire() {
    const { Lieu, Commune, Daira, Wilaya, User } = this.models;
    const include = [];
    if (Lieu) {
      include.push({
        model: Lieu, required: false, attributes: ['id_lieu', 'nom', 'adresse', 'latitude', 'longitude', 'communeId'],
        include: Commune ? [{
          model: Commune, required: false, attributes: ['id_commune', 'nom', 'commune_name_ascii', 'dairaId'],
          include: [{ model: Daira, required: false, attributes: ['id_daira', 'wilayaId'], include: [{ model: Wilaya, required: false, attributes: ['id_wilaya', 'nom', 'wilaya_name_ascii', 'codeW'] }] }]
        }] : []
      });
    }
    if (User) include.push({ model: User, as: 'Professionnel', attributes: PUBLIC_USER_ATTRIBUTES, required: false });
    return this.model.findAll({ where: { statut: 'valide' }, include, order: [['createdAt', 'DESC']], limit: 500 });
  }

  /**
   * Détail complet d'un service
   */
  async findWithFullDetails(id) {
    const includes = this._defaultIncludes();

    // Enrichir l'include Lieu avec Commune > Daira > Wilaya + LieuMedia
    const lieuInc = includes.find(i => i.model === this.models.Lieu);
    if (lieuInc) {
      lieuInc.include = [];
      if (this.models.Commune) {
        lieuInc.include.push({
          model: this.models.Commune,
          required: false,
          include: [{
            model: this.models.Daira,
            required: false,
            include: [{ model: this.models.Wilaya, required: false }]
          }]
        });
      }
      if (this.models.LieuMedia) {
        lieuInc.include.push({ model: this.models.LieuMedia, required: false });
      }
    }

    return this.model.findByPk(id, { include: includes });
  }

  /**
   * Services par lieu
   */
  async findByLieu(lieuId, options = {}) {
    return this.findAll({
      ...options,
      where: { ...options.where, id_lieu: parseInt(lieuId), statut: 'valide' },
      include: this._defaultIncludes(),
      order: [['createdAt', 'DESC']]
    });
  }

  /**
   * Services par professionnel
   */
  async findByProfessionnel(userId, options = {}) {
    return this.findAll({
      ...options,
      where: { ...options.where, id_user: userId },
      include: this._defaultIncludes(),
      order: [['createdAt', 'DESC']]
    });
  }

  /**
   * Recherche multilingue
   */
  async searchServices(query, options = {}) {
    // Recherche publique : services validés uniquement
    return this.search(query, ['nom', 'description'], {
      ...options,
      additionalWhere: { ...options.additionalWhere, statut: 'valide' },
      include: this._defaultIncludes()
    });
  }

  /**
   * Services des professionnels pour la modération (équipements des sites exclus), par statut
   */
  async findForModeration({ statut, ...options } = {}) {
    const where = { id_user: { [Op.ne]: null } };
    if (['en_attente', 'valide', 'rejete'].includes(statut)) where.statut = statut;
    return this.findAll({
      ...options,
      where,
      include: this._defaultIncludes(),
      order: [['createdAt', 'DESC']]
    });
  }

  /**
   * Services en attente de validation (admin)
   */
  async findPending(options = {}) {
    return this.findAll({
      ...options,
      where: { ...options.where, statut: 'en_attente' },
      include: this._defaultIncludes(),
      order: [['createdAt', 'ASC']]
    });
  }

  /**
   * Statistiques
   */
  async getStats() {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, validated, pending, thisMonthCount, byType] = await Promise.all([
      this.count(),
      this.count({ statut: 'valide' }),
      this.count({ statut: 'en_attente' }),
      this.count({ createdAt: { [Op.gte]: thisMonth } }),
      this.model.findAll({
        attributes: [
          'type_service',
          [this.model.sequelize.fn('COUNT', this.model.sequelize.col('id')), 'count']
        ],
        group: ['type_service'],
        raw: true,
        limit: 50
      })
    ]);

    return { total, validated, pending, thisMonth: thisMonthCount, byType };
  }
}

module.exports = ServiceRepository;
