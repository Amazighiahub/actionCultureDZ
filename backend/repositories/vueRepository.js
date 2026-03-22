/**
 * VueRepository - Repository pour le tracking des vues
 * Encapsule tous les accès Sequelize pour le modèle Vue
 */
const BaseRepository = require('./baseRepository');
const { Op } = require('sequelize');

class VueRepository extends BaseRepository {
  constructor(models) {
    super(models.Vue);
    this.models = models;
    this.sequelize = models.sequelize || models.Vue.sequelize;
  }

  /**
   * Cherche une vue existante par session
   */
  async findBySession(type_entite, id_entite, sessionId) {
    return this.model.findOne({
      where: { type_entite, id_entite, session_id: sessionId }
    });
  }

  /**
   * Met à jour la durée d'une vue
   */
  async updateDuration(vue, duration) {
    return vue.update({
      duree_secondes: duration,
      date_fin: new Date()
    });
  }

  /**
   * Incrémente le compteur de vues sur l'entité associée
   */
  async incrementEntityViewCount(type, id) {
    const modelMap = {
      oeuvre: { model: this.models.Oeuvre, idField: 'id_oeuvre' },
      evenement: { model: this.models.Evenement, idField: 'id_evenement' },
      lieu: { model: this.models.Lieu, idField: 'id_lieu' },
      artisanat: { model: this.models.Artisanat, idField: 'id_artisanat' },
      article: { model: this.models.Article, idField: 'id_article' }
    };

    const entry = modelMap[type];
    if (!entry || !entry.model) return;

    const attributes = await entry.model.describe();
    if (attributes.nombre_vues) {
      await entry.model.increment('nombre_vues', {
        where: { [entry.idField]: id }
      });
    }
  }

  /**
   * Statistiques globales pour une entité
   */
  async getGlobalStats(type, id) {
    return this.model.findOne({
      where: { type_entite: type, id_entite: parseInt(id) },
      attributes: [
        [this.sequelize.fn('COUNT', '*'), 'total_vues'],
        [this.sequelize.fn('COUNT', this.sequelize.literal('DISTINCT session_id')), 'vues_uniques'],
        [this.sequelize.fn('COUNT', this.sequelize.literal('DISTINCT id_user')), 'utilisateurs_uniques'],
        [this.sequelize.fn('AVG', this.sequelize.col('duree_secondes')), 'duree_moyenne']
      ]
    });
  }

  /**
   * Évolution journalière des vues
   */
  async getDailyStats(type, id, dateDebut) {
    return this.model.findAll({
      where: {
        type_entite: type,
        id_entite: parseInt(id),
        date_vue: { [Op.gte]: dateDebut }
      },
      attributes: [
        [this.sequelize.fn('DATE', this.sequelize.col('date_vue')), 'date'],
        [this.sequelize.fn('COUNT', '*'), 'vues']
      ],
      group: [this.sequelize.fn('DATE', this.sequelize.col('date_vue'))],
      order: [[this.sequelize.fn('DATE', this.sequelize.col('date_vue')), 'ASC']]
    });
  }

  /**
   * Répartition par type d'appareil
   */
  async getDeviceStats(type, id, dateDebut) {
    return this.model.findAll({
      where: {
        type_entite: type,
        id_entite: parseInt(id),
        date_vue: { [Op.gte]: dateDebut }
      },
      attributes: [
        'device_type',
        [this.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['device_type']
    });
  }

  /**
   * Sources de trafic
   */
  async getSourceStats(type, id, dateDebut) {
    return this.model.findAll({
      where: {
        type_entite: type,
        id_entite: parseInt(id),
        date_vue: { [Op.gte]: dateDebut },
        source: { [Op.ne]: null }
      },
      attributes: [
        'source',
        [this.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['source'],
      order: [[this.sequelize.literal('count'), 'DESC']],
      limit: 10
    });
  }
}

module.exports = VueRepository;
