/**
 * UserProfileController - Actions de l'utilisateur sur son propre profil
 *
 * Scope :
 *   getProfile, updateProfile,
 *   changePassword (avec invalidation cache session),
 *   updateProfilePhoto, removeProfilePhoto,
 *   updatePreferences, updatePrivacy,
 *   submitProfessional, getProfessionalStatus,
 *   getProfessionals (listing public des pros valides).
 *
 * Toutes les operations operent sur req.user.id_user sauf :
 *   - getProfessionals : liste publique, ne touche pas req.user.
 */

const BaseController = require('./baseController');
const container = require('../services/serviceContainer');

class UserProfileController extends BaseController {
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
  // PROFIL
  // ============================================================================

  async getProfile(req, res) {
    try {
      const user = await this.userService.getProfile(req.user.id_user);
      res.json({
        success: true,
        data: this._translateUser(user, req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async updateProfile(req, res) {
    try {
      const user = await this.userService.update(
        req.user.id_user,
        req.body,
        req.user.id_user
      );
      res.json({
        success: true,
        message: req.t('user.profileUpdated'),
        data: this._translateUser(user, req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // MOT DE PASSE
  // ============================================================================

  async changePassword(req, res) {
    try {
      const current_password = req.body.ancien_mot_de_passe
        || req.body.current_password
        || req.body.currentPassword;
      const new_password = req.body.nouveau_mot_de_passe
        || req.body.new_password
        || req.body.newPassword;

      if (!current_password || !new_password) {
        return res.status(400).json({
          success: false,
          error: req.t('auth.currentAndNewPasswordRequired')
        });
      }

      await this.userService.changePassword(
        req.user.id_user,
        current_password,
        new_password
      );

      // Invalider le cache session Redis : password_changed_at a change,
      // tous les tokens emis avant ce point doivent etre refuses par
      // le authMiddleware.
      const authMw = require('../middlewares/authMiddleware')(require('../models'));
      await authMw.invalidateUserCache(req.user.id_user).catch(() => {});

      res.json({
        success: true,
        message: req.t('auth.passwordChanged')
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // PHOTO DE PROFIL
  // ============================================================================

  async updateProfilePhoto(req, res) {
    try {
      const { photo_url } = req.body;
      if (!photo_url) {
        return res.status(400).json({
          success: false,
          error: req.t('user.photoUrlRequired')
        });
      }
      // Whitelist d'origines : on n'accepte que les URLs emises par notre
      // pipeline d'upload (chemin relatif ou base API). Empeche le client
      // de pointer vers un host externe arbitraire.
      const allowedPrefixes = ['/uploads/', '/images/'];
      const apiBase = process.env.API_URL || process.env.VITE_API_URL || '';
      if (apiBase) allowedPrefixes.push(apiBase);
      const isAllowed = allowedPrefixes.some(prefix => photo_url.startsWith(prefix));
      if (!isAllowed) {
        return res.status(400).json({
          success: false,
          error: req.t
            ? req.t('user.invalidPhotoUrl')
            : 'URL de photo invalide. Utilisez le service d\'upload.'
        });
      }
      const user = await this.userService.update(req.user.id_user, { photo_url });
      res.json({
        success: true,
        message: req.t('user.photoUpdated'),
        data: this._translateUser(user, req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async removeProfilePhoto(req, res) {
    try {
      const user = await this.userService.update(req.user.id_user, { photo_url: null });
      res.json({
        success: true,
        message: req.t('user.photoDeleted'),
        data: this._translateUser(user, req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // PREFERENCES ET CONFIDENTIALITE
  // ============================================================================

  async updatePreferences(req, res) {
    try {
      const userId = req.user.id_user;
      const body = req.body || {};
      const payload = {};
      if (body.langue_preferee !== undefined) payload.langue_preferee = body.langue_preferee;
      if (body.theme_prefere !== undefined) payload.theme_prefere = body.theme_prefere;
      if (body.newsletter !== undefined) payload.accepte_newsletter = body.newsletter;
      if (body.notifications_email !== undefined) payload.notifications_email = body.notifications_email;
      if (body.notifications_push !== undefined) payload.notifications_push = body.notifications_push;
      const user = await this.userService.update(userId, payload, userId);

      res.json({
        success: true,
        message: req.t('user.preferencesUpdated'),
        data: this._translateUser(user, req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async updatePrivacy(req, res) {
    try {
      const userId = req.user.id_user;
      const body = req.body || {};
      const payload = {};
      if (body.profil_public !== undefined) payload.profil_public = body.profil_public;
      if (body.afficher_email !== undefined) payload.email_public = body.afficher_email;
      if (body.afficher_telephone !== undefined) payload.telephone_public = body.afficher_telephone;
      const user = await this.userService.update(userId, payload, userId);

      res.json({
        success: true,
        message: req.t('user.privacyUpdated'),
        data: this._translateUser(user, req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // STATUT PROFESSIONNEL
  // ============================================================================

  async submitProfessional(req, res) {
    try {
      const userId = req.user.id_user;
      const { specialite, description, experience, portfolio_url } = req.body;

      const user = await this.userService.update(userId, {
        statut: 'en_attente_validation',
        specialite,
        description_pro: description,
        experience,
        portfolio_url
      }, userId);

      res.json({
        success: true,
        message: req.t('user.professionalRequestSubmitted'),
        data: this._translateUser(user, req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getProfessionalStatus(req, res) {
    try {
      const user = await this.userService.findById(req.user.id_user);
      const data = user.toJSON(req.lang);
      res.json({
        success: true,
        data: {
          statut: data.statut || 'non_demande',
          date_demande: data.date_demande_pro || null,
          commentaire: data.commentaire_validation || null
        }
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // LISTING PUBLIC DES PROFESSIONNELS VALIDES
  // ============================================================================

  async getProfessionals(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;

      const result = await this.userService.findValidatedProfessionals({
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
}

module.exports = new UserProfileController();
