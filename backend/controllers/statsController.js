/**
 * StatsController - Controller pour les statistiques publiques
 * Architecture: BaseController → Controller → Service (statsService)
 *
 * ZÉRO accès direct aux models Sequelize.
 * Toute logique métier déléguée au statsService via le container.
 */
const BaseController = require('./baseController');
const container = require('../services/serviceContainer');

class StatsController extends BaseController {
  get statsService() {
    return container.statsService;
  }

  /**
   * Statistiques publiques pour la page d'accueil (hero section)
   */
  async getPublicStats(req, res) {
    try {
      const data = await this.statsService.getPublicStats();

      res.json({
        success: true,
        data,
        cached: false,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }
}

module.exports = new StatsController();
