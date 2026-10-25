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
      const rawIp = req.ip ||
                    req.connection?.remoteAddress ||
                    req.headers['x-forwarded-for']?.split(',')[0] ||
                    '0.0.0.0';

      // RGPD : anonymiser l'IP avant stockage (recommandation CNIL)
      // IPv4 : tronquer le dernier octet (192.168.1.42 → 192.168.1.0)
      // IPv6 : tronquer les 80 derniers bits (garder les 48 premiers)
      const ipAddress = rawIp.includes(':')
        ? rawIp.split(':').slice(0, 3).join(':') + '::'
        : rawIp.replace(/\.\d+$/, '.0');

      // Une seule vue par session et par contenu : l'index unique (type_entite, id_entite, session_id)
      // s'applique à toutes les lignes (MySQL ignore sa condition is_unique). Revoir un article dans
      // la même session n'est donc pas recompté — avant, l'insertion échouait (erreur 500 affichée)
      const existingView = await this.vueService.findExistingView(type_entite, id_entite, sessionId);
      if (existingView) {
        return this._sendSuccess(res, { id_vue: existingView.id_vue, is_unique: false });
      }

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
        is_unique: true,
        duree_secondes: duree_secondes || null,
        date_vue: new Date()
      };

      let vue;
      try {
        vue = await this.vueService.createView(viewData);
      } catch (error) {
        // Deux vues simultanées de la même session : la seconde est déjà comptée
        if (error.name !== 'SequelizeUniqueConstraintError') throw error;
        return this._sendSuccess(res, { id_vue: null, is_unique: false });
      }

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
