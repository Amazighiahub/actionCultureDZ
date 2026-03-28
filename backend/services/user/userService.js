/**
 * UserService - Service complet pour la gestion des utilisateurs
 *
 * Architecture: Controller → Service → Repository → Database
 *
 * Responsabilités:
 * - Logique métier utilisateur
 * - Transformation via DTOs
 * - Validation des règles métier
 * - Orchestration des opérations
 */

const BaseService = require('../core/baseService');
const UserDTO = require('../../dto/user/userDTO');
const CreateUserDTO = require('../../dto/user/createUserDTO');
const UpdateUserDTO = require('../../dto/user/updateUserDTO');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const REFRESH_TOKEN_EXPIRY_DAYS = 7;

class UserService extends BaseService {
  constructor(userRepository, options = {}) {
    super(userRepository, options);
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET must be configured. Set it in your .env file.');
    }
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtExpiration = process.env.JWT_EXPIRATION || '15m';
    this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || (process.env.NODE_ENV === 'production' ? 14 : 12);
  }

  // ============================================================================
  // AUTHENTIFICATION
  // ============================================================================

  /**
   * Inscription d'un nouvel utilisateur
   * @param {Object} requestBody - Corps de la requête
   * @returns {Promise<{user: UserDTO, token: string}>}
   */
  async register(requestBody) {
    // 1. Transformer la requête en DTO
    const createDTO = CreateUserDTO.fromRequest(requestBody);

    // 2. Valider les données
    const validation = createDTO.validate();
    if (!validation.valid) {
      throw this._validationError('Données invalides', validation.errors);
    }

    // 3. Vérifier si l'email existe déjà
    const existingUser = await this.repository.findByEmail(createDTO.email);
    if (existingUser) {
      throw this._conflictError('Cet email est déjà utilisé');
    }

    // 4. Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(createDTO.password, this.bcryptRounds);

    // 5. Préparer les données pour la base
    const entityData = createDTO.toEntity();
    entityData.password = hashedPassword;

    // 6. Créer l'utilisateur + refresh token dans une transaction
    const result = await this.repository.withTransaction(async (transaction) => {
      const newUser = await this.repository.create(entityData, { transaction });

      const token = this._generateToken(newUser);
      const refreshToken = this._generateRefreshToken();
      await this._saveRefreshToken(newUser.id_user, refreshToken, transaction);

      const userDTO = UserDTO.fromEntity(newUser);

      return { user: userDTO, token, refreshToken, userId: newUser.id_user };
    });

    this.logger.info(`Nouvel utilisateur inscrit: ${result.userId}`);

    // Envoyer l'email de vérification (fire-and-forget)
    if (process.env.SKIP_EMAIL_VERIFICATION !== 'true') {
      try {
        const container = require('../serviceContainer');
        const evService = container.emailVerificationService;
        if (evService) {
          evService.sendVerificationEmail(result.userId, '0.0.0.0').catch(err => {
            this.logger.error('Erreur envoi email vérification:', err.message);
          });
        }
      } catch (err) {
        this.logger.error('Email verification service non disponible:', err.message);
      }
    }

    return {
      user: result.user,
      token: result.token,
      refreshToken: result.refreshToken
    };
  }

  /**
   * Connexion d'un utilisateur
   * @param {string} email
   * @param {string} motDePasse
   * @returns {Promise<{user: UserDTO, token: string}>}
   */
  async login(email, motDePasse) {
    // 1. Trouver l'utilisateur
    const user = await this.repository.findByEmail(email);
    if (!user) {
      throw this._unauthorizedError('Email ou mot de passe incorrect');
    }

    // 2. Vérifier le statut
    if (user.statut === 'inactif' || user.statut === 'banni') {
      throw this._forbiddenError('Votre compte est désactivé');
    }

    if (user.statut === 'suspendu') {
      throw this._forbiddenError('Votre compte est suspendu');
    }

    // 3. Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(motDePasse, user.password);
    if (!isValidPassword) {
      throw this._unauthorizedError('Email ou mot de passe incorrect');
    }

    // 4. Mettre à jour la dernière connexion
    await this.repository.updateLastLogin(user.id_user);

    // 5. Générer les tokens
    const token = this._generateToken(user);
    const refreshToken = this._generateRefreshToken();
    await this._saveRefreshToken(user.id_user, refreshToken);

    // 6. Transformer en DTO
    const userDTO = UserDTO.fromEntity(user);

    this.logger.info(`Connexion réussie: ${user.id_user}`);

    return {
      user: userDTO,
      token,
      refreshToken
    };
  }

  /**
   * Rafraîchit les tokens à l'aide d'un refresh token opaque (rotation)
   * @param {string} refreshToken - Refresh token actuel
   * @returns {Promise<{user: UserDTO, token: string, refreshToken: string}>}
   */
  async refreshToken(refreshToken) {
    if (!refreshToken) {
      throw this._unauthorizedError('Refresh token requis');
    }

    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const user = await this.repository.findByRefreshToken(hashedToken);

    if (!user) {
      throw this._unauthorizedError('Refresh token invalide');
    }

    if (new Date() > new Date(user.refresh_token_expires)) {
      await this._clearRefreshToken(user.id_user);
      throw this._unauthorizedError('Refresh token expiré');
    }

    if (user.statut === 'inactif' || user.statut === 'banni' || user.statut === 'suspendu') {
      await this._clearRefreshToken(user.id_user);
      throw this._forbiddenError('Compte désactivé ou suspendu');
    }

    const newAccessToken = this._generateToken(user);
    const newRefreshToken = this._generateRefreshToken();
    await this._saveRefreshToken(user.id_user, newRefreshToken);

    const userDTO = UserDTO.fromEntity(user);

    this.logger.info(`Token rafraîchi pour: ${user.id_user}`);

    return { user: userDTO, token: newAccessToken, refreshToken: newRefreshToken };
  }

  /**
   * Vérifie un token JWT
   * @param {string} token
   * @returns {Promise<UserDTO>}
   */
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, { algorithms: ['HS256'] });
      const user = await this.repository.findById(decoded.userId);

      if (!user) {
        throw this._unauthorizedError('Token invalide');
      }

      return UserDTO.fromEntity(user);
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw this._unauthorizedError('Token invalide ou expiré');
      }
      throw error;
    }
  }

  /**
   * Vérifie si un email existe déjà
   * @param {string} email
   * @returns {Promise<boolean>}
   */
  async checkEmailExists(email) {
    const user = await this.repository.findByEmail(email);
    return !!user;
  }

  // ============================================================================
  // CRUD UTILISATEURS
  // ============================================================================

  /**
   * Récupère tous les utilisateurs avec pagination
   * @param {Object} options - Options de pagination et filtres
   * @returns {Promise<{data: Array<UserDTO>, pagination: Object}>}
   */
  async findAll(options = {}) {
    const result = await this.repository.findAll(options);

    return {
      data: UserDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Récupère un utilisateur par ID
   * @param {number} id
   * @param {Object} options
   * @returns {Promise<UserDTO>}
   */
  async findById(id, options = {}) {
    const user = await this.repository.findById(id, options);
    if (!user) {
      throw this._notFoundError(id);
    }
    return UserDTO.fromEntity(user, options);
  }

  /**
   * Récupère le profil complet d'un utilisateur
   * @param {number} userId
   * @returns {Promise<UserDTO>}
   */
  async getProfile(userId) {
    const user = await this.repository.findWithRoles(userId);
    if (!user) {
      throw this._notFoundError(userId);
    }
    return UserDTO.fromEntity(user, { includeStats: true });
  }

  /**
   * Récupère un utilisateur avec ses œuvres
   * @param {number} userId
   * @param {Object} options
   * @returns {Promise<{user: UserDTO, oeuvres: Array}>}
   */
  async findWithOeuvres(userId, options = {}) {
    const user = await this.repository.findWithOeuvres(userId, options);
    if (!user) {
      throw this._notFoundError(userId);
    }

    return {
      user: UserDTO.fromEntity(user),
      oeuvres: user.Oeuvres || []
    };
  }

  /**
   * Met à jour un utilisateur
   * @param {number} id
   * @param {Object} requestBody
   * @param {number} currentUserId - ID de l'utilisateur faisant la modification
   * @returns {Promise<UserDTO>}
   */
  async update(id, requestBody, currentUserId = null) {
    // 1. Vérifier que l'utilisateur existe
    const existingUser = await this.repository.findById(id);
    if (!existingUser) {
      throw this._notFoundError(id);
    }

    // 2. Vérifier les permissions (si currentUserId fourni)
    if (currentUserId && currentUserId !== id) {
      // Seul l'utilisateur lui-même ou un admin peut modifier
      const currentUser = await this.repository.findById(currentUserId);
      if (!currentUser || currentUser.id_type_user !== 29) {
        throw this._forbiddenError('Vous ne pouvez pas modifier ce profil');
      }
    }

    // 3. Transformer en DTO
    const updateDTO = UpdateUserDTO.fromRequest(requestBody);

    // 4. Valider
    const validation = updateDTO.validate();
    if (!validation.valid) {
      throw this._validationError('Données invalides', validation.errors);
    }

    // 5. Vérifier si le nouvel email est disponible
    if (updateDTO.email && updateDTO.email !== existingUser.email) {
      const emailExists = await this.repository.findByEmail(updateDTO.email);
      if (emailExists) {
        throw this._conflictError('Cet email est déjà utilisé');
      }
    }

    // 6. Préparer les données
    const entityData = updateDTO.toEntity();

    // 7. Mettre à jour
    const updatedUser = await this.repository.update(id, entityData);

    this.logger.info(`Utilisateur mis à jour: ${id}`);

    return UserDTO.fromEntity(updatedUser);
  }

  /**
   * Change le mot de passe d'un utilisateur
   * @param {number} userId
   * @param {string} ancienMotDePasse
   * @param {string} nouveauMotDePasse
   * @returns {Promise<boolean>}
   */
  async changePassword(userId, ancienMotDePasse, nouveauMotDePasse) {
    const user = await this.repository.findById(userId);
    if (!user) {
      throw this._notFoundError(userId);
    }

    // Vérifier l'ancien mot de passe
    const isValid = await bcrypt.compare(ancienMotDePasse, user.password);
    if (!isValid) {
      throw this._validationError('Mot de passe actuel incorrect');
    }

    // Valider le nouveau mot de passe (mêmes critères que l'inscription)
    if (!nouveauMotDePasse || nouveauMotDePasse.length < 12) {
      throw this._validationError('Le nouveau mot de passe doit contenir au moins 12 caractères');
    }
    if (!/[A-Z]/.test(nouveauMotDePasse) || !/[a-z]/.test(nouveauMotDePasse) || !/[0-9]/.test(nouveauMotDePasse) || !/[!@#$%^&*(),.?":{}|<>]/.test(nouveauMotDePasse)) {
      throw this._validationError('Le mot de passe doit contenir majuscule, minuscule, chiffre et caractère spécial');
    }

    // Hasher et mettre à jour
    const hashedPassword = await bcrypt.hash(nouveauMotDePasse, this.bcryptRounds);
    await this.repository.update(userId, {
      password: hashedPassword,
      password_changed_at: new Date()
    });

    // Révoquer le refresh token pour forcer la re-authentification
    await this._clearRefreshToken(userId);

    this.logger.info(`Mot de passe changé pour: ${userId}`);

    return true;
  }

  /**
   * Supprime un utilisateur
   * @param {number} id
   * @param {number} adminId - ID de l'admin effectuant la suppression
   * @returns {Promise<boolean>}
   */
  async delete(id, adminId) {
    const user = await this.repository.findById(id);
    if (!user) {
      throw this._notFoundError(id);
    }

    // Empêcher la suppression de son propre compte admin
    if (id === adminId) {
      throw this._forbiddenError('Vous ne pouvez pas supprimer votre propre compte');
    }

    await this.repository.delete(id);

    this.logger.info(`Utilisateur supprimé: ${id} par admin: ${adminId}`);

    return true;
  }

  // ============================================================================
  // RGPD — DROIT À L'EFFACEMENT ET PORTABILITÉ
  // ============================================================================

  /**
   * Suppression du propre compte de l'utilisateur (RGPD art. 17)
   * Anonymise les contenus liés et supprime les données personnelles
   * @param {number} userId - ID de l'utilisateur qui demande la suppression
   * @param {string} password - Mot de passe pour confirmer l'identité
   */
  async deleteMyAccount(userId, password) {
    const user = await this.repository.findById(userId);
    if (!user) {
      throw this._notFoundError(userId);
    }

    // Vérifier le mot de passe pour confirmer l'identité
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw this._validationError('Mot de passe incorrect');
    }

    // Utiliser hardDeleteUser qui anonymise et nettoie tout
    await this.repository.hardDeleteUser(userId, {
      adminId: null,
      userEmail: user.email,
      userType: user.type_user,
      userName: `${user.nom} ${user.prenom}`
    });

    this.logger.info(`RGPD: Compte supprimé par l'utilisateur lui-même: ${userId}`);

    return { deleted: true };
  }

  /**
   * Export des données personnelles de l'utilisateur (RGPD art. 20)
   * Retourne toutes les données associées à l'utilisateur au format JSON
   * @param {number} userId
   */
  async exportMyData(userId) {
    const user = await this.repository.findById(userId);
    if (!user) {
      throw this._notFoundError(userId);
    }

    const data = {
      export_date: new Date().toISOString(),
      export_format: 'RGPD Article 20 — Droit à la portabilité',
      personal_info: {
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        telephone: user.telephone,
        entreprise: user.entreprise,
        type_user: user.type_user,
        statut: user.statut,
        wilaya_residence: user.wilaya_residence,
        date_creation: user.date_creation,
        derniere_connexion: user.derniere_connexion,
        photo_url: user.photo_url,
      },
    };

    // Collecter les données liées
    const models = this.repository.models;

    const EXPORT_LIMIT = 10000;

    if (models.Oeuvre) {
      const oeuvres = await models.Oeuvre.findAll({
        where: { saisi_par: userId },
        attributes: ['id_oeuvre', 'titre', 'description', 'date_creation', 'statut'],
        raw: true,
        limit: EXPORT_LIMIT,
      });
      data.oeuvres = oeuvres;
    }

    if (models.Evenement) {
      const evenements = await models.Evenement.findAll({
        where: { id_user: userId },
        attributes: ['id_evenement', 'nom_evenement', 'date_debut', 'date_fin', 'statut'],
        raw: true,
        limit: EXPORT_LIMIT,
      });
      data.evenements = evenements;
    }

    if (models.Commentaire) {
      const commentaires = await models.Commentaire.findAll({
        where: { id_user: userId },
        attributes: ['id_commentaire', 'contenu', 'date_creation'],
        raw: true,
        limit: EXPORT_LIMIT,
      });
      data.commentaires = commentaires;
    }

    if (models.Favori) {
      const favoris = await models.Favori.findAll({
        where: { id_user: userId },
        attributes: ['id_favori', 'type_entite', 'id_entite', 'date_creation'],
        raw: true,
        limit: EXPORT_LIMIT,
      });
      data.favoris = favoris;
    }

    if (models.Notification) {
      const notifications = await models.Notification.findAll({
        where: { id_user: userId },
        attributes: ['id_notification', 'type_notification', 'message', 'lu', 'date_creation'],
        raw: true,
        limit: EXPORT_LIMIT,
      });
      data.notifications = notifications;
    }

    this.logger.info(`RGPD: Export de données demandé par l'utilisateur: ${userId}`);

    return data;
  }

  // ============================================================================
  // RECHERCHE ET FILTRAGE
  // ============================================================================

  /**
   * Recherche d'utilisateurs
   * @param {string} query
   * @param {Object} options
   * @returns {Promise<{data: Array<UserDTO>, pagination: Object}>}
   */
  async search(query, options = {}) {
    const result = await this.repository.searchUsers(query, options);

    return {
      data: UserDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Récupère les utilisateurs par type
   * @param {string} typeUser
   * @param {Object} options
   * @returns {Promise<{data: Array<UserDTO>, pagination: Object}>}
   */
  async findByType(typeUser, options = {}) {
    const result = await this.repository.findByType(typeUser, options);

    return {
      data: UserDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Récupère les professionnels validés
   * @param {Object} options
   * @returns {Promise<{data: Array<UserDTO>, pagination: Object}>}
   */
  async findValidatedProfessionals(options = {}) {
    const result = await this.repository.findValidatedProfessionals(options);

    return {
      data: UserDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  // ============================================================================
  // MODÉRATION / ADMIN
  // ============================================================================

  /**
   * Récupère les utilisateurs en attente de validation
   * @param {Object} options
   * @returns {Promise<{data: Array<UserDTO>, pagination: Object}>}
   */
  async findPendingValidation(options = {}) {
    const result = await this.repository.findPendingValidation(options);

    return {
      data: UserDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Valide un utilisateur professionnel
   * @param {number} userId
   * @param {number} validatorId
   * @returns {Promise<UserDTO>}
   */
  async validateUser(userId, validatorId) {
    const user = await this.repository.findById(userId);
    if (!user) {
      throw this._notFoundError(userId);
    }

    if (user.statut === 'actif') {
      throw this._conflictError('Cet utilisateur est déjà validé');
    }

    const updatedUser = await this.repository.validate(userId, validatorId);

    this.logger.info(`Utilisateur validé: ${userId} par: ${validatorId}`);

    // TODO: Envoyer notification à l'utilisateur

    return UserDTO.fromEntity(updatedUser);
  }

  /**
   * Refuse un utilisateur
   * @param {number} userId
   * @param {number} validatorId
   * @param {string} motif
   * @returns {Promise<UserDTO>}
   */
  async rejectUser(userId, validatorId, motif) {
    const user = await this.repository.findById(userId);
    if (!user) {
      throw this._notFoundError(userId);
    }

    if (!motif || motif.trim().length === 0) {
      throw this._validationError('Un motif de refus est requis');
    }

    const updatedUser = await this.repository.reject(userId, validatorId, motif);

    this.logger.info(`Utilisateur refusé: ${userId} par: ${validatorId}`);

    // TODO: Envoyer notification à l'utilisateur

    return UserDTO.fromEntity(updatedUser);
  }

  /**
   * Suspend un utilisateur
   * @param {number} userId
   * @param {number} adminId
   * @param {number} duree - Durée en jours
   * @param {string} motif
   * @returns {Promise<UserDTO>}
   */
  async suspendUser(userId, adminId, duree, motif) {
    const user = await this.repository.findById(userId);
    if (!user) {
      throw this._notFoundError(userId);
    }

    if (user.statut === 'suspendu') {
      throw this._conflictError('Cet utilisateur est déjà suspendu');
    }

    if (!motif || motif.trim().length === 0) {
      throw this._validationError('Un motif de suspension est requis');
    }

    const updatedUser = await this.repository.suspend(userId, adminId, duree, motif);

    this.logger.info(`Utilisateur suspendu: ${userId} par: ${adminId} pour ${duree} jours`);

    // TODO: Envoyer notification à l'utilisateur

    return UserDTO.fromEntity(updatedUser);
  }

  /**
   * Réactive un utilisateur
   * @param {number} userId
   * @param {number} adminId
   * @returns {Promise<UserDTO>}
   */
  async reactivateUser(userId, adminId) {
    const user = await this.repository.findById(userId);
    if (!user) {
      throw this._notFoundError(userId);
    }

    if (user.statut === 'actif') {
      throw this._conflictError('Cet utilisateur est déjà actif');
    }

    const updatedUser = await this.repository.reactivate(userId, adminId);

    this.logger.info(`Utilisateur réactivé: ${userId} par: ${adminId}`);

    return UserDTO.fromEntity(updatedUser);
  }

  // ============================================================================
  // STATISTIQUES
  // ============================================================================

  /**
   * Récupère les statistiques utilisateurs
   * @returns {Promise<Object>}
   */
  async getStats() {
    return this.repository.getStats();
  }

  // ============================================================================
  // HELPERS PRIVÉS
  // ============================================================================

  /**
   * Révoque le refresh token d'un utilisateur (pour le logout)
   * @param {number} userId
   * @returns {Promise<void>}
   */
  async revokeRefreshToken(userId) {
    await this._clearRefreshToken(userId);
    this.logger.info(`Refresh token révoqué pour: ${userId}`);
  }

  /**
   * Génère un token JWT
   * @private
   */
  _generateToken(user) {
    return jwt.sign(
      {
        userId: user.id_user,
        email: user.email,
        typeUser: user.id_type_user,
        pwdAt: user.password_changed_at ? Math.floor(new Date(user.password_changed_at).getTime() / 1000) : 0
      },
      this.jwtSecret,
      { expiresIn: this.jwtExpiration, algorithm: 'HS256' }
    );
  }

  /**
   * Génère un refresh token opaque cryptographiquement sûr
   * @private
   */
  _generateRefreshToken() {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Persiste le refresh token hashé avec une date d'expiration
   * @private
   */
  async _saveRefreshToken(userId, refreshToken, transaction = null) {
    const expires = new Date();
    expires.setDate(expires.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const options = transaction ? { transaction } : {};
    await this.repository.update(userId, {
      refresh_token: hashedToken,
      refresh_token_expires: expires
    }, options);
  }

  /**
   * Efface le refresh token d'un utilisateur
   * @private
   */
  async _clearRefreshToken(userId) {
    await this.repository.update(userId, {
      refresh_token: null,
      refresh_token_expires: null
    });
  }
}

module.exports = UserService;
