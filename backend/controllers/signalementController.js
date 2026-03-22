// controllers/SignalementController.js

const BaseController = require('./baseController');
const container = require('../services/serviceContainer');

class SignalementController extends BaseController {
  get signalementService() {
    return container.signalementService;
  }

  /**
   * Creer un signalement
   * POST /api/signalements
   */
  async create(req, res) {
    try {
      const signalement = await this.signalementService.createSignalement(
        req.body,
        req.user.id_user,
        req.files
      );

      this._sendCreated(res, signalement);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Obtenir mes signalements
   * GET /api/signalements/mes-signalements
   */
  async getMesSignalements(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const result = await this.signalementService.getMesSignalements(
        req.user.id_user,
        { page: parseInt(page), limit: parseInt(limit) }
      );

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * [ADMIN] Obtenir la file de moderation
   * GET /api/signalements/moderation
   */
  async getModerationQueue(req, res) {
    try {
      const { statut = 'en_attente', priorite, page = 1, limit = 20 } = req.query;
      const result = await this.signalementService.getModerationQueue({
        statut,
        priorite,
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * [ADMIN] Traiter un signalement
   * PUT /api/signalements/:id/traiter
   */
  async traiterSignalement(req, res) {
    try {
      const signalement = await this.signalementService.traiterSignalement(
        req.params.id,
        req.body,
        req.user.id_user
      );

      this._sendSuccess(res, signalement);
    } catch (error) {
      this._handleError(res, error);
    }
  }
}

module.exports = new SignalementController();
