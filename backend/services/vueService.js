/**
 * VueService - Service pour le tracking des vues
 *
 * Encapsule toute la logique d'acces aux donnees (Sequelize) pour les vues.
 * Le controller n'a plus qu'a appeler ces methodes et formater les reponses HTTP.
 */
const { Op } = require('sequelize');

class VueService {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
  }

  // ========================================================================
  // HELPERS PURS (pas de modeles, logique metier uniquement)
  // ========================================================================

  /**
   * Detecter le type d'appareil depuis le User-Agent
   * @param {string} userAgent
   * @returns {string}
   */
  detectDeviceType(userAgent) {
    if (/bot|crawler|spider/i.test(userAgent)) return 'bot';
    if (/mobile/i.test(userAgent)) return 'mobile';
    if (/tablet|ipad/i.test(userAgent)) return 'tablet';
    return 'desktop';
  }

  /**
   * Detecter la source du trafic depuis le referer
   * @param {string} referer
   * @returns {string}
   */
  detectSource(referer) {
    if (!referer) return 'direct';

    if (referer.includes('google')) return 'google';
    if (referer.includes('facebook')) return 'facebook';
    if (referer.includes('twitter') || referer.includes('x.com')) return 'twitter';
    if (referer.includes('linkedin')) return 'linkedin';
    if (referer.includes('instagram')) return 'instagram';

    return 'other';
  }

  // ========================================================================
  // METHODES PRINCIPALES
  // ========================================================================

  /**
   * Verifier si une vue existe deja pour cette session
   * @param {string} type_entite
   * @param {number} id_entite
   * @param {string} sessionId
   * @returns {Promise<Object|null>}
   */
  async findExistingView(type_entite, id_entite, sessionId) {
    return this.models.Vue.findOne({
      where: { type_entite, id_entite, session_id: sessionId }
    });
  }

  /**
   * Creer un enregistrement de vue
   * @param {Object} viewData
   * @returns {Promise<Object>}
   */
  async createView(viewData) {
    return this.models.Vue.create(viewData);
  }

  /**
   * Trouver une vue par son ID
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    return this.models.Vue.findByPk(id);
  }

  /**
   * Mettre a jour la duree d'une vue
   * @param {Object} vue - Instance Sequelize de la vue
   * @param {number} duration - Duree en secondes
   * @returns {Promise<Object>}
   */
  async updateDuration(vue, duration) {
    return vue.update({
      duree_secondes: duration,
      date_fin: new Date()
    });
  }

  /**
   * Mettre a jour le compteur de vues sur l'entite associee
   * @param {string} type
   * @param {number} id
   */
  async updateEntityViewCount(type, id) {
    try {
      let model;
      const field = 'nombre_vues';
      let idField;

      switch (type) {
        case 'oeuvre':
          model = this.models.Oeuvre;
          idField = 'id_oeuvre';
          break;
        case 'evenement':
          model = this.models.Evenement;
          idField = 'id_evenement';
          break;
        case 'lieu':
          model = this.models.Lieu;
          idField = 'id_lieu';
          break;
        case 'artisanat':
          model = this.models.Artisanat;
          idField = 'id_artisanat';
          break;
        case 'article':
          model = this.models.Article;
          idField = 'id_article';
          break;
        default:
          return;
      }

      if (model) {
        const attributes = await model.describe();
        if (attributes[field]) {
          await model.increment(field, {
            where: { [idField]: id }
          });
        }
      }
    } catch (error) {
      console.error('Erreur mise a jour compteur:', error);
      // Ne pas faire echouer la requete principale
    }
  }

  // ========================================================================
  // STATISTIQUES
  // ========================================================================

  /**
   * Calculer la date de debut selon la periode demandee
   * @param {string} periode
   * @returns {Date}
   */
  _calcDateDebut(periode) {
    const dateDebut = new Date();
    switch (periode) {
      case '24h':
        dateDebut.setHours(dateDebut.getHours() - 24);
        break;
      case '7j':
        dateDebut.setDate(dateDebut.getDate() - 7);
        break;
      case '30j':
        dateDebut.setDate(dateDebut.getDate() - 30);
        break;
      case '90j':
        dateDebut.setDate(dateDebut.getDate() - 90);
        break;
      case 'all':
        dateDebut.setFullYear(2000);
        break;
    }
    return dateDebut;
  }

  /**
   * Obtenir les statistiques de vues pour une entite
   * @param {string} type - Type d'entite
   * @param {number} id - ID de l'entite
   * @param {string} periode - Periode ('24h', '7j', '30j', '90j', 'all')
   * @returns {Promise<Object>}
   */
  async getViewStats(type, id, periode = '30j') {
    const dateDebut = this._calcDateDebut(periode);
    const entityId = parseInt(id);

    // Statistiques globales
    const totalStats = await this.models.Vue.findOne({
      where: {
        type_entite: type,
        id_entite: entityId
      },
      attributes: [
        [this.sequelize.fn('COUNT', '*'), 'total_vues'],
        [this.sequelize.fn('COUNT', this.sequelize.literal('DISTINCT session_id')), 'vues_uniques'],
        [this.sequelize.fn('COUNT', this.sequelize.literal('DISTINCT id_user')), 'utilisateurs_uniques'],
        [this.sequelize.fn('AVG', this.sequelize.col('duree_secondes')), 'duree_moyenne']
      ]
    });

    // Evolution par jour
    const dailyStats = await this.models.Vue.findAll({
      where: {
        type_entite: type,
        id_entite: entityId,
        date_vue: { [Op.gte]: dateDebut }
      },
      attributes: [
        [this.sequelize.fn('DATE', this.sequelize.col('date_vue')), 'date'],
        [this.sequelize.fn('COUNT', '*'), 'vues']
      ],
      group: [this.sequelize.fn('DATE', this.sequelize.col('date_vue'))],
      order: [[this.sequelize.fn('DATE', this.sequelize.col('date_vue')), 'ASC']]
    });

    // Repartition par device
    const deviceStats = await this.models.Vue.findAll({
      where: {
        type_entite: type,
        id_entite: entityId,
        date_vue: { [Op.gte]: dateDebut }
      },
      attributes: [
        'device_type',
        [this.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['device_type']
    });

    // Sources de trafic
    const sourceStats = await this.models.Vue.findAll({
      where: {
        type_entite: type,
        id_entite: entityId,
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

    return {
      periode,
      total: totalStats?.dataValues || {},
      evolution: dailyStats.map(d => ({
        date: d.dataValues.date,
        vues: parseInt(d.dataValues.vues)
      })),
      devices: deviceStats.map(d => ({
        type: d.device_type,
        count: parseInt(d.dataValues.count)
      })),
      sources: sourceStats.map(s => ({
        source: s.source,
        count: parseInt(s.dataValues.count)
      }))
    };
  }
}

module.exports = VueService;
