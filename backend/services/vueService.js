/**
 * VueService - Service pour le tracking des vues
 *
 * Architecture: Controller → Service → Repository → Database
 * Délègue tous les accès Sequelize au VueRepository.
 */
const BaseService = require('./core/baseService');

class VueService extends BaseService {
  constructor(repository, options = {}) {
    super(repository, options);
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
    return this.repository.findBySession(type_entite, id_entite, sessionId);
  }

  /**
   * Creer un enregistrement de vue
   * @param {Object} viewData
   * @returns {Promise<Object>}
   */
  async createView(viewData) {
    return this.repository.create(viewData);
  }

  /**
   * Trouver une vue par son ID
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    return this.repository.findById(id);
  }

  /**
   * Mettre a jour la duree d'une vue
   * @param {Object} vue - Instance Sequelize de la vue
   * @param {number} duration - Duree en secondes
   * @returns {Promise<Object>}
   */
  async updateDuration(vue, duration) {
    return this.repository.updateDuration(vue, duration);
  }

  /**
   * Mettre a jour le compteur de vues sur l'entite associee
   * @param {string} type
   * @param {number} id
   */
  async updateEntityViewCount(type, id) {
    try {
      await this.repository.incrementEntityViewCount(type, id);
    } catch (error) {
      this.logger.error('Erreur mise a jour compteur:', error);
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

    const [totalStats, dailyStats, deviceStats, sourceStats] = await Promise.all([
      this.repository.getGlobalStats(type, id),
      this.repository.getDailyStats(type, id, dateDebut),
      this.repository.getDeviceStats(type, id, dateDebut),
      this.repository.getSourceStats(type, id, dateDebut)
    ]);

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
