/**
 * UserAdminController - Operations admin/moderation sur les utilisateurs
 *
 * Scope :
 *   list, getById (avec PII masking pour moderateurs), update, delete,
 *   search, getStats, getPending,
 *   validate, reject, suspend, reactivate,
 *   getUserTranslations, updateUserTranslation.
 *
 * Les routes qui appellent ces methodes sont protegees par :
 *   authenticate + requireRole(['Admin']) ou ['Admin','Moderateur']
 * (voir userRoutes.js). On ne duplique pas la verification de role ici.
 */

const BaseController = require('./baseController');
const container = require('../services/serviceContainer');

class UserAdminController extends BaseController {
  get userService() {
    return container.userService;
  }

  _translateUser(userDTO, lang = 'fr') {
    if (!userDTO) return null;
    return userDTO.toJSON(lang);
  }

  _translateUsers(userDTOs, lang = 'fr') {
    if (!Array.isArray(userDTOs)) return [];
    return userDTOs.map(dto => this._translateUser(dto, lang));
  }

  // ============================================================================
  // LISTE ET RECHERCHE
  // ============================================================================

  async list(req, res) {
    try {
      const { page = 1, limit = 20, type, statut, search } = req.query;

      const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        where: {}
      };

      if (type) options.where.type_user = type;
      if (statut) options.where.statut = statut;
      if (search) options.search = search;

      const result = await this.userService.findAll(options);

      res.json({
        success: true,
        data: this._translateUsers(result.data, req.lang),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getById(req, res) {
    try {
      const user = await this.userService.findById(parseInt(req.params.id, 10));
      let data = this._translateUser(user, req.lang);

      // PII masking : les moderateurs ne voient pas email/telephone/adresse.
      // Les admins (isAdmin = true) voient tout.
      if (data && !req.user.isAdmin) {
        const { email: _email, telephone: _telephone, adresse: _adresse, ...safeData } = data;
        data = safeData;
      }

      res.json({ success: true, data });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async search(req, res) {
    try {
      const { q, page = 1, limit = 20 } = req.query;

      if (!q || q.length < 2) {
        return res.status(400).json({
          success: false,
          error: req.t('user.searchTooShort')
        });
      }

      const result = await this.userService.search(q, {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
      });

      res.json({
        success: true,
        data: this._translateUsers(result.data, req.lang),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // CRUD ADMIN
  // ============================================================================

  async update(req, res) {
    try {
      const user = await this.userService.update(
        parseInt(req.params.id, 10),
        req.body,
        req.user.id_user
      );
      res.json({
        success: true,
        message: req.t('user.updated'),
        data: this._translateUser(user, req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async delete(req, res) {
    try {
      await this.userService.delete(
        parseInt(req.params.id, 10),
        req.user.id_user
      );
      res.json({
        success: true,
        message: req.t('user.deleted')
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // MODERATION : VALIDATION / REJET / SUSPENSION
  // ============================================================================

  async getPending(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;

      const result = await this.userService.findPendingValidation({
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
      });

      res.json({
        success: true,
        data: this._translateUsers(result.data, req.lang),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async validate(req, res) {
    try {
      const user = await this.userService.validateUser(
        parseInt(req.params.id, 10),
        req.user.id_user
      );
      res.json({
        success: true,
        message: req.t('user.validated'),
        data: this._translateUser(user, req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async reject(req, res) {
    try {
      const { motif } = req.body;
      const user = await this.userService.rejectUser(
        parseInt(req.params.id, 10),
        req.user.id_user,
        motif
      );
      res.json({
        success: true,
        message: req.t('user.rejected'),
        data: this._translateUser(user, req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async suspend(req, res) {
    try {
      const { duree, motif } = req.body;
      const user = await this.userService.suspendUser(
        parseInt(req.params.id, 10),
        req.user.id_user,
        duree,
        motif
      );
      res.json({
        success: true,
        message: req.t('user.suspended'),
        data: this._translateUser(user, req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async reactivate(req, res) {
    try {
      const user = await this.userService.reactivateUser(
        parseInt(req.params.id, 10),
        req.user.id_user
      );
      res.json({
        success: true,
        message: req.t('user.reactivated'),
        data: this._translateUser(user, req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // STATISTIQUES
  // ============================================================================

  async getStats(req, res) {
    try {
      const stats = await this.userService.getStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // TRADUCTIONS (ADMIN i18n)
  // ============================================================================

  async getUserTranslations(req, res) {
    try {
      const user = await this.userService.findById(parseInt(req.params.id, 10));
      res.json({
        success: true,
        data: user.toRawTranslations ? user.toRawTranslations() : user.toJSON()
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async updateUserTranslation(req, res) {
    try {
      const user = await this.userService.updateTranslation(
        parseInt(req.params.id, 10),
        req.params.lang,
        req.body
      );
      res.json({
        success: true,
        message: req.t('translation.updated', { lang: req.params.lang }),
        data: this._translateUser(user, req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }
}

module.exports = new UserAdminController();
