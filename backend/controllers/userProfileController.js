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
const BaseDTO = require('../dto/baseDTO');
const { translateDeep } = require('../helpers/i18n');
const QRCode = require('qrcode');
const { professionnelPath } = require('../utils/slug');

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
      // Uniquement un média hébergé par la plateforme (chemin local ou notre
      // Cloudinary) — l'ancien test startsWith(API_URL) acceptait
      // "https://api.domaine.com.evil.tld/...".
      if (!BaseDTO.isOwnMediaUrl(photo_url)) {
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

  /**
   * GET /users/professionals/nearby?communeId=&wilayaId=&types=2,3,4,7&limit=
   * Professionnels proches (commune, puis daïra, puis wilaya), profils publics uniquement.
   */
  async getNearbyProfessionals(req, res) {
    try {
      const toInt = (v) => (/^\d+$/.test(String(v || '')) ? parseInt(v, 10) : null);
      const communeId = toInt(req.query.communeId);
      const wilayaId = toInt(req.query.wilayaId);
      if (!communeId && !wilayaId) {
        return res.status(400).json({ success: false, error: req.t('common.badRequest') });
      }
      const types = String(req.query.types || '')
        .split(',').map(toInt).filter(Boolean);
      const data = await this.userService.findNearbyProfessionals({
        communeId, wilayaId, types,
        excludeUserId: req.user?.id_user,
        limit: req.query.limit
      });
      res.json({ success: true, data: translateDeep(data, req.lang) });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * GET /users/professionals/:id/portfolio : page publique d'un professionnel
   * (profil, œuvres, artisanat, événements, services publiés). 404 si le profil n'est pas public.
   */
  async getPortfolio(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      // Le professionnel connecté sur sa propre page voit en plus ses outils de partage
      const isOwner = Number(req.user?.id_user) === id;
      const data = await this.userService.getPublicPortfolio(id);
      if (!data) {
        return res.status(404).json({ success: false, error: req.t('common.notFound') });
      }
      data.estProprietaire = isOwner;
      // Vue propriétaire : pas de cache partagé
      res.set('Cache-Control', isOwner ? 'private, no-store' : 'public, max-age=120, stale-while-revalidate=30');
      // La réponse dépend de la session (vue propriétaire ou publique)
      res.set('Vary', 'Cookie, Authorization');
      res.json({ success: true, data: translateDeep(data, req.lang) });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * GET /users/professionals/:id/qrcode : QR code menant au portfolio.
   * ?format=png|svg -> fichier à télécharger ou imprimer ; sinon JSON { qr_data_url, portfolio_url }.
   */
  async getPortfolioQRCode(req, res) {
    try {
      const pro = await this.userService.getPublicProfessional(parseInt(req.params.id, 10));
      if (!pro) {
        return res.status(404).json({ success: false, error: req.t('common.notFound') });
      }
      const baseUrl = (process.env.FRONTEND_URL || 'https://taladz.com').replace(/\/$/, '');
      const url = `${baseUrl}${professionnelPath(pro.id_user, pro.prenom, pro.nom)}`;
      const width = Math.min(Math.max(parseInt(req.query.size, 10) || 400, 100), 1200);
      // Niveau de correction élevé : le code reste lisible imprimé petit ou un peu abîmé
      const options = { width, margin: 2, errorCorrectionLevel: 'H', color: { dark: '#1c1917', light: '#ffffff' } };
      const filename = `taladz-portfolio-${pro.id_user}`;
      res.set('Cache-Control', 'public, max-age=3600');

      if (req.query.format === 'svg') {
        res.set('Content-Type', 'image/svg+xml');
        res.set('Content-Disposition', `attachment; filename="${filename}.svg"`);
        return res.send(await QRCode.toString(url, { ...options, type: 'svg' }));
      }
      if (req.query.format === 'png') {
        res.set('Content-Type', 'image/png');
        res.set('Content-Disposition', `attachment; filename="${filename}.png"`);
        return res.send(await QRCode.toBuffer(url, options));
      }
      res.json({ success: true, data: { qr_data_url: await QRCode.toDataURL(url, options), portfolio_url: url } });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getProfessionals(req, res) {
    try {
      const { page, limit } = this._paginate(req);
      const result = await this.userService.findValidatedProfessionals({ page, limit });

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
