/**
 * UserController - Controller refactoré avec Service Pattern
 *
 * Architecture: Controller → Service → Repository → Database
 *
 * Le Controller est responsable de:
 * - Recevoir et valider les requêtes HTTP
 * - Déléguer la logique métier au Service
 * - Formater les réponses HTTP
 *
 * Il NE doit PAS:
 * - Accéder directement à la base de données
 * - Contenir de logique métier
 * - Transformer les données (c'est le rôle des DTOs)
 */

const BaseController = require('./baseController');
const container = require('../services/serviceContainer');
const { translateDeep } = require('../helpers/i18n');
const { accountRateLimiter } = require('../middlewares/rateLimitMiddleware');
const logger = require('../utils/logger');

class UserController extends BaseController {
  get userService() {
    return container.userService;
  }

  // ============================================================================
  // AUTHENTIFICATION
  // ============================================================================

  /**
   * POST /api/users/register
   * Inscription d'un nouvel utilisateur
   */
  async register(req, res) {
    try {
      const result = await this.userService.register(req.body, req.ip);

      this._setAuthCookies(res, result.token);
      this._setRefreshTokenCookie(res, result.refreshToken);

      res.status(201).json({
        success: true,
        message: req.t('auth.registerSuccess'),
        data: {
          user: this._translateUser(result.user, req.lang),
          expiresIn: this._getTokenExpirySeconds()
        }
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * POST /api/users/login
   * Connexion d'un utilisateur
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: req.t('auth.emailPasswordRequired')
        });
      }

      const result = await this.userService.login(email, password);

      await accountRateLimiter.resetAttempts(email);

      this._setAuthCookies(res, result.token);
      this._setRefreshTokenCookie(res, result.refreshToken);

      res.json({
        success: true,
        message: req.t('auth.loginSuccess'),
        data: {
          user: this._translateUser(result.user, req.lang),
          expiresIn: this._getTokenExpirySeconds()
        }
      });

    } catch (error) {
      if (req.body?.email) {
        try {
          await accountRateLimiter.recordFailedAttempt(req.body.email);
        } catch (limiterError) {
          // Ne jamais masquer l'erreur d'origine si le limiter échoue
          logger.warn('accountRateLimiter.recordFailedAttempt failed', { error: limiterError.message });
        }
      }
      this._handleError(res, error);
    }
  }

  /**
   * POST /api/users/logout
   * Déconnexion
   */
  async logout(req, res) {
    try {
      if (req.user?.id_user) {
        await this.userService.revokeRefreshToken(req.user.id_user);
        // Invalider le cache session Redis
        const authMw = require('../middlewares/authMiddleware')(require('../models'));
        await authMw.invalidateUserCache(req.user.id_user).catch(() => {});
      }
    } catch (_) {
      // Best-effort revocation; proceed with cookie cleanup regardless
    }

    // Blacklister l'access token cote Redis pour empecher sa reutilisation
    // avant son expiration naturelle (clef = jti si present, sinon token
    // complet pour retro-compat avec les anciennes sessions en vol).
    try {
      const jwt = require('jsonwebtoken');
      const { getClient } = require('../utils/redisClient');
      const { buildBlacklistKey } = require('../utils/jwtHelper');
      const logger = require('../utils/logger');

      const token = req.cookies?.access_token
        || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);

      if (token) {
        const decoded = jwt.decode(token);
        if (decoded?.exp) {
          const ttl = decoded.exp - Math.floor(Date.now() / 1000);
          if (ttl > 0) {
            const redis = getClient();
            if (!redis) {
              // Redis absent : en prod, un token logue reste valide jusqu'a
              // expiration naturelle (fail-open explicite). On log pour
              // pouvoir en eter alerte via Sentry.
              logger.warn('logout: Redis unavailable, token not blacklisted');
            } else {
              const key = buildBlacklistKey({ jti: decoded.jti, token });
              if (key) await redis.setEx(key, ttl, '1');
            }
          }
        }
      }
    } catch (blacklistErr) {
      const logger = require('../utils/logger');
      logger.warn('logout: best-effort blacklist failed:', blacklistErr.message);
    }

    this._clearAuthCookies(res);

    res.json({
      success: true,
      message: req.t('auth.logoutSuccess')
    });
  }

  // ============================================================================
  // RGPD — SUPPRESSION DE COMPTE ET EXPORT DE DONNÉES
  // ============================================================================

  /**
   * DELETE /api/users/profile
   * Suppression du propre compte (RGPD art. 17 — droit à l'effacement)
   * Requiert le mot de passe pour confirmer l'identité
   */
  async deleteMyAccount(req, res) {
    try {
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({
          success: false,
          error: req.t('auth.passwordRequired')
        });
      }

      await this.userService.deleteMyAccount(req.user.id_user, password);

      this._clearAuthCookies(res);

      res.json({
        success: true,
        message: req.t('auth.accountDeleted', { defaultValue: 'Votre compte a été supprimé avec succès.' })
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * GET /api/users/profile/export
   * Export des données personnelles (RGPD art. 20 — droit à la portabilité)
   * Retourne un JSON avec toutes les données de l'utilisateur
   */
  async exportMyData(req, res) {
    try {
      const data = await this.userService.exportMyData(req.user.id_user);

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="mes-donnees-${Date.now()}.json"`);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // CRUD UTILISATEURS
  // ============================================================================

  /**
   * GET /api/users
   * Liste des utilisateurs avec pagination
   */
  async list(req, res) {
    try {
      const { page = 1, limit = 20, type, statut, search } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
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

  /**
   * GET /api/users/:id
   * Récupère un utilisateur par ID
   */
  async getById(req, res) {
    try {
      const user = await this.userService.findById(parseInt(req.params.id));

      let data = this._translateUser(user, req.lang);

      // Filtrer les PII pour les modérateurs (seuls les admins voient tout)
      if (data && !req.user.isAdmin) {
        const { email, telephone, adresse, ...safeData } = data;
        data = safeData;
      }

      res.json({
        success: true,
        data
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * GET /api/users/profile
   * Récupère le profil de l'utilisateur connecté
   */
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

  /**
   * PUT /api/users/profile
   * Met à jour le profil de l'utilisateur connecté
   */
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

  /**
   * PUT /api/users/:id
   * Met à jour un utilisateur (admin)
   */
  async update(req, res) {
    try {
      const user = await this.userService.update(
        parseInt(req.params.id),
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

  /**
   * DELETE /api/users/:id
   * Supprime un utilisateur (admin)
   */
  async delete(req, res) {
    try {
      await this.userService.delete(
        parseInt(req.params.id),
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

  /**
   * POST /api/users/change-password
   * Change le mot de passe de l'utilisateur connecté
   */
  async changePassword(req, res) {
    try {
      const current_password = req.body.ancien_mot_de_passe || req.body.current_password || req.body.currentPassword;
      const new_password = req.body.nouveau_mot_de_passe || req.body.new_password || req.body.newPassword;

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

      // Invalider le cache session Redis (password_changed_at a changé)
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
  // RECHERCHE
  // ============================================================================

  /**
   * GET /api/users/search
   * Recherche d'utilisateurs
   */
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
        page: parseInt(page),
        limit: parseInt(limit)
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

  /**
   * GET /api/users/professionals
   * Liste des professionnels validés
   */
  async getProfessionals(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;

      const result = await this.userService.findValidatedProfessionals({
        page: parseInt(page),
        limit: parseInt(limit)
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
  // MODÉRATION
  // ============================================================================

  /**
   * GET /api/users/pending
   * Liste des utilisateurs en attente de validation
   */
  async getPending(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;

      const result = await this.userService.findPendingValidation({
        page: parseInt(page),
        limit: parseInt(limit)
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

  /**
   * POST /api/users/:id/validate
   * Valide un utilisateur professionnel
   */
  async validate(req, res) {
    try {
      const user = await this.userService.validateUser(
        parseInt(req.params.id),
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

  /**
   * POST /api/users/:id/reject
   * Refuse un utilisateur
   */
  async reject(req, res) {
    try {
      const { motif } = req.body;

      const user = await this.userService.rejectUser(
        parseInt(req.params.id),
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

  /**
   * POST /api/users/:id/suspend
   * Suspend un utilisateur
   */
  async suspend(req, res) {
    try {
      const { duree, motif } = req.body;

      const user = await this.userService.suspendUser(
        parseInt(req.params.id),
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

  /**
   * POST /api/users/:id/reactivate
   * Réactive un utilisateur
   */
  async reactivate(req, res) {
    try {
      const user = await this.userService.reactivateUser(
        parseInt(req.params.id),
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

  /**
   * GET /api/users/stats
   * Statistiques utilisateurs
   */
  async getStats(req, res) {
    try {
      const stats = await this.userService.getStats();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // ENDPOINTS SUPPLÉMENTAIRES (migrés de v1)
  // ============================================================================

  /**
   * POST /api/users/refresh-token
   * Rafraîchir le token d'accès
   */
  async refreshToken(req, res) {
    try {
      const incomingRefreshToken = req.cookies?.refresh_token || req.body.refreshToken;

      const result = await this.userService.refreshToken(incomingRefreshToken);

      this._setAuthCookies(res, result.token);
      this._setRefreshTokenCookie(res, result.refreshToken);

      res.json({
        success: true,
        data: {
          user: this._translateUser(result.user, req.lang),
          expiresIn: this._getTokenExpirySeconds()
        }
      });
    } catch (error) {
      this._clearAuthCookies(res);
      this._handleError(res, error);
    }
  }

  /**
   * POST /api/users/check-email
   * Vérifier si un email existe déjà
   */
  async checkEmail(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: req.t('auth.emailPasswordRequired') });
      }
      const exists = await this.userService.checkEmailExists(email);
      res.json({ success: true, available: !exists });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * GET /api/users/types
   * Types d'utilisateurs disponibles
   */
  async getTypes(req, res) {
    const TYPE_USER_IDS = {
      VISITEUR: 1, ECRIVAIN: 2, JOURNALISTE: 3, SCIENTIFIQUE: 4,
      ACTEUR: 5, ARTISTE: 6, ARTISAN: 7, REALISATEUR: 8,
      MUSICIEN: 9, PHOTOGRAPHE: 10, DANSEUR: 11, SCULPTEUR: 12, AUTRE: 13
    };
    const types = Object.entries(TYPE_USER_IDS).map(([key, value]) => ({
      id: value,
      key: key.toLowerCase(),
      label: key.charAt(0) + key.slice(1).toLowerCase().replace('_', ' ')
    }));
    res.json({ success: true, data: types });
  }

  /**
   * PATCH /api/users/profile/photo
   * Mettre à jour la photo de profil
   */
  async updateProfilePhoto(req, res) {
    try {
      const { photo_url } = req.body;
      if (!photo_url) {
        return res.status(400).json({ success: false, error: req.t('user.photoUrlRequired') });
      }
      const allowedPrefixes = ['/uploads/', '/images/'];
      const apiBase = process.env.API_URL || process.env.VITE_API_URL || '';
      if (apiBase) allowedPrefixes.push(apiBase);
      const isAllowed = allowedPrefixes.some(prefix => photo_url.startsWith(prefix));
      if (!isAllowed) {
        return res.status(400).json({ success: false, error: req.t ? req.t('user.invalidPhotoUrl') : 'URL de photo invalide. Utilisez le service d\'upload.' });
      }
      const user = await this.userService.update(req.user.id_user, { photo_url: photo_url });
      res.json({
        success: true,
        message: req.t('user.photoUpdated'),
        data: this._translateUser(user, req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * DELETE /api/users/profile/photo
   * Supprimer la photo de profil
   */
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

  /**
   * POST /api/users/verify-email/:token
   * Vérifier l'email avec un jeton
   */
  async verifyEmail(req, res) {
    try {
      const result = await this.userService.verifyEmail(req.params.token);
      res.json({
        success: true,
        message: req.t('email.verified'),
        data: result
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * GET /api/users/:id/translations
   * Récupérer les traductions d'un utilisateur (admin)
   */
  async getUserTranslations(req, res) {
    try {
      const user = await this.userService.findById(parseInt(req.params.id));
      res.json({
        success: true,
        data: user.toRawTranslations ? user.toRawTranslations() : user.toJSON()
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * PATCH /api/users/:id/translation/:lang
   * Mettre à jour une traduction spécifique (admin)
   */
  async updateUserTranslation(req, res) {
    try {
      const user = await this.userService.updateTranslation(
        parseInt(req.params.id),
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

  // ============================================================================
  // PROFESSIONNEL - SUBMIT / STATUS
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
  // PRÉFÉRENCES ET CONFIDENTIALITÉ
  // ============================================================================

  async updatePreferences(req, res) {
    try {
      const userId = req.user.id_user;
      const body = req.body || {};
      // Mapper les préférences aux colonnes User existantes
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
      // Mapper la confidentialité aux colonnes User existantes
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
  // HELPERS PRIVÉS
  // ============================================================================

  /**
   * Traduit un UserDTO selon la langue
   * @private
   */
  _translateUser(userDTO, lang = 'fr') {
    if (!userDTO) return null;
    return userDTO.toJSON(lang);
  }

  /**
   * Traduit un tableau de UserDTO
   * @private
   */
  _translateUsers(userDTOs, lang = 'fr') {
    if (!Array.isArray(userDTOs)) return [];
    return userDTOs.map(dto => this._translateUser(dto, lang));
  }


  /**
   * Configure le cookie d'access token
   * @private
   */
  _setAuthCookies(res, token) {
    const isProduction = process.env.NODE_ENV === 'production';

    // Aligner maxAge cookie avec l'expiration JWT.
    // JWT_EXPIRATION prime sur JWT_EXPIRES_IN (cf. jwtHelper).
    const jwtExp = process.env.JWT_EXPIRATION || process.env.JWT_EXPIRES_IN || '1h';
    const maxAgeMs = this._parseExpToMs(jwtExp);

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: maxAgeMs,
      path: '/'
    });
  }

  /**
   * Parse une durée JWT (ex: '15m', '1h', '7d') en millisecondes
   * @private
   */
  _parseExpToMs(exp) {
    const match = String(exp).match(/^(\d+)\s*(s|m|h|d)$/i);
    if (!match) return 15 * 60 * 1000; // fallback 15min
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return value * (multipliers[unit] || 60000);
  }

  /**
   * Retourne la durée d'expiration du token JWT en secondes
   * @private
   */
  _getTokenExpirySeconds() {
    const jwtExp = process.env.JWT_EXPIRATION || process.env.JWT_EXPIRES_IN || '1h';
    return Math.floor(this._parseExpToMs(jwtExp) / 1000);
  }

  /**
   * Configure le cookie de refresh token (scoped au seul endpoint de refresh)
   * @private
   */
  _setRefreshTokenCookie(res, refreshToken) {
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/api/users/refresh-token',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
  }

  /**
   * Efface les cookies d'authentification
   * @private
   */
  _clearAuthCookies(res) {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/api/users/refresh-token' });
  }
}

// Export singleton
module.exports = new UserController();
