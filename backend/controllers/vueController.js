/**
 * VueController - Controller refactore avec BaseController + Service Pattern
 * Architecture: BaseController -> Controller -> Service -> Models
 */

const BaseController = require('./baseController');
const container = require('../services/serviceContainer');

class VueController extends BaseController {
  get vueService() {
    return container.vueService;
  }

  /**
   * Enregistrer une vue
   * POST /api/tracking/view
   */
  async trackView(req, res) {
    try {
      const { type_entite, id_entite, duree_secondes, source, page_source } = req.body;
      const userId = req.user?.id_user || null;

      // Validation
      const validTypes = ['oeuvre', 'evenement', 'lieu', 'artisanat', 'article'];
      if (!validTypes.includes(type_entite)) {
        return res.status(400).json({
          success: false,
          error: req.t('common.badRequest')
        });
      }

      if (!id_entite) {
        return res.status(400).json({
          success: false,
          error: req.t('common.badRequest')
        });
      }

      // Recuperer les infos de la requete
      const sessionId = req.session?.id || req.cookies?.sessionId ||
                       req.headers['x-session-id'] ||
                       `anon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      if (!req.cookies?.sessionId && !req.headers['x-session-id'] && !req.session?.id) {
        res.cookie('sessionId', sessionId, {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production'
        });
      }

      const userAgent = req.get('User-Agent') || '';
      const ipAddress = req.ip ||
                       req.connection?.remoteAddress ||
                       req.headers['x-forwarded-for']?.split(',')[0] ||
                       '0.0.0.0';

      // Verifier si c'est une vue unique pour cette session
      const existingView = await this.vueService.findExistingView(type_entite, id_entite, sessionId);

      // Creer la vue
      const viewData = {
        type_entite,
        id_entite,
        id_user: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        referer: req.get('Referer'),
        source: source || this.vueService.detectSource(req.get('Referer')),
        page_source,
        session_id: sessionId,
        device_type: this.vueService.detectDeviceType(userAgent),
        is_unique: !existingView,
        duree_secondes: duree_secondes || null,
        date_vue: new Date()
      };

      const vue = await this.vueService.createView(viewData);

      // Mettre a jour le compteur de vues sur l'entite
      await this.vueService.updateEntityViewCount(type_entite, id_entite);

      this._sendSuccess(res, {
        id_vue: vue.id_vue,
        is_unique: vue.is_unique
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Mettre a jour la duree d'une vue
   * PUT /api/tracking/view/:id
   */
  async updateViewDuration(req, res) {
    try {
      const { id } = req.params;
      const { duration } = req.body;

      const requestSessionId = req.session?.id || req.cookies?.sessionId || req.headers['x-session-id'] || req.sessionID;

      const vue = await this.vueService.findById(id);
      if (!vue) {
        return res.status(404).json({
          success: false,
          error: req.t('common.notFound')
        });
      }

      // Verifier les permissions
      const canUpdate = vue.id_user ?
        vue.id_user === req.user?.id_user :
        (requestSessionId ? vue.session_id === requestSessionId : false);

      if (!canUpdate && !req.user?.isAdmin) {
        return res.status(403).json({
          success: false,
          message: req.t('auth.forbidden')
        });
      }

      const parsedDuration = parseInt(duration, 10);
      if (!Number.isFinite(parsedDuration) || parsedDuration < 0 || parsedDuration > 86400) {
        return res.status(400).json({
          success: false,
          error: req.t('common.badRequest')
        });
      }

      const updated = await this.vueService.updateDuration(vue, parsedDuration);

      this._sendSuccess(res, updated);

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Obtenir les statistiques de vues
   * GET /api/tracking/stats/:type/:id
   */
  async getViewStats(req, res) {
    try {
      const { type, id } = req.params;
      const { periode = '30j' } = req.query;

      const stats = await this.vueService.getViewStats(type, id, periode);

      this._sendSuccess(res, stats);

    } catch (error) {
      this._handleError(res, error);
    }
  }
}

module.exports = new VueController();
