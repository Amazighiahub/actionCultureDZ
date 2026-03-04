/**
 * ServiceRepository - Accès données pour les services culturels
 * Extends BaseRepository avec des méthodes spécifiques aux services
 */

const BaseRepository = require('./baseRepository');
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
        attributes: ['id_user', 'nom', 'prenom', 'email', 'photo_url'],
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
    return this.search(query, ['nom', 'description'], {
      ...options,
      include: this._defaultIncludes()
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
        raw: true
      })
    ]);

    return { total, validated, pending, thisMonth: thisMonthCount, byType };
  }
}

module.exports = ServiceRepository;
