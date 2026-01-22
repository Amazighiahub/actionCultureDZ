/**
 * UserControllerV2 - Controller refactoré avec Service Pattern
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

const container = require('../../services/ServiceContainer');
const { translateDeep } = require('../../helpers/i18n');

const IS_DEV_MODE = process.env.NODE_ENV === 'development';

class UserControllerV2 {
  constructor() {
    // Le service est récupéré via le container (lazy loading)
  }

  /**
   * Getter pour le service utilisateur
   * @private
   */
  get userService() {
    return container.userService;
  }

  // ============================================================================
  // AUTHENTIFICATION
  // ============================================================================

  /**
   * POST /api/v2/users/register
   * Inscription d'un nouvel utilisateur
   */
  async register(req, res) {
    try {
      const result = await this.userService.register(req.body);

      // Configurer les cookies d'authentification
      this._setAuthCookies(res, result.token);

      res.status(201).json({
        success: true,
        message: 'Inscription réussie',
        data: {
          user: this._translateUser(result.user, req.lang),
          token: result.token
        }
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * POST /api/v2/users/login
   * Connexion d'un utilisateur
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email et mot de passe requis'
        });
      }

      const result = await this.userService.login(email, password);

      // Configurer les cookies d'authentification
      this._setAuthCookies(res, result.token);

      res.json({
        success: true,
        message: 'Connexion réussie',
        data: {
          user: this._translateUser(result.user, req.lang),
          token: result.token
        }
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * POST /api/v2/users/logout
   * Déconnexion
   */
  async logout(req, res) {
    this._clearAuthCookies(res);

    res.json({
      success: true,
      message: 'Déconnexion réussie'
    });
  }

  // ============================================================================
  // CRUD UTILISATEURS
  // ============================================================================

  /**
   * GET /api/v2/users
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
   * GET /api/v2/users/:id
   * Récupère un utilisateur par ID
   */
  async getById(req, res) {
    try {
      const user = await this.userService.findById(parseInt(req.params.id));

      res.json({
        success: true,
        data: this._translateUser(user, req.lang)
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * GET /api/v2/users/profile
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
   * PUT /api/v2/users/profile
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
        message: 'Profil mis à jour',
        data: this._translateUser(user, req.lang)
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * PUT /api/v2/users/:id
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
        message: 'Utilisateur mis à jour',
        data: this._translateUser(user, req.lang)
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * DELETE /api/v2/users/:id
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
        message: 'Utilisateur supprimé'
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * POST /api/v2/users/change-password
   * Change le mot de passe de l'utilisateur connecté
   */
  async changePassword(req, res) {
    try {
      const { current_password, new_password } = req.body;

      await this.userService.changePassword(
        req.user.id_user,
        current_password,
        new_password
      );

      res.json({
        success: true,
        message: 'Mot de passe modifié'
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // RECHERCHE
  // ============================================================================

  /**
   * GET /api/v2/users/search
   * Recherche d'utilisateurs
   */
  async search(req, res) {
    try {
      const { q, page = 1, limit = 20 } = req.query;

      if (!q || q.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Requête de recherche trop courte (min 2 caractères)'
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
   * GET /api/v2/users/professionals
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
   * GET /api/v2/users/pending
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
   * POST /api/v2/users/:id/validate
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
        message: 'Utilisateur validé',
        data: this._translateUser(user, req.lang)
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * POST /api/v2/users/:id/reject
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
        message: 'Utilisateur refusé',
        data: this._translateUser(user, req.lang)
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * POST /api/v2/users/:id/suspend
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
        message: 'Utilisateur suspendu',
        data: this._translateUser(user, req.lang)
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * POST /api/v2/users/:id/reactivate
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
        message: 'Utilisateur réactivé',
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
   * GET /api/v2/users/stats
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
   * Gère les erreurs et retourne la réponse appropriée
   * @private
   */
  _handleError(res, error) {
    const statusCode = error.statusCode || 500;
    const code = error.code || 'INTERNAL_ERROR';

    // Log en développement
    if (IS_DEV_MODE) {
      console.error(`❌ Error [${code}]:`, error.message);
      console.error(error.stack);
    }

    const response = {
      success: false,
      error: error.message || 'Erreur serveur',
      code
    };

    // Inclure les erreurs de validation
    if (error.errors) {
      response.errors = error.errors;
    }

    // Détails en dev uniquement
    if (IS_DEV_MODE && statusCode === 500) {
      response.stack = error.stack;
    }

    res.status(statusCode).json(response);
  }

  /**
   * Configure les cookies d'authentification
   * @private
   */
  _setAuthCookies(res, token) {
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/'
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
module.exports = new UserControllerV2();
