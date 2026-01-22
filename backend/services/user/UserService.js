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

const BaseService = require('../core/BaseService');
const UserDTO = require('../../dto/user/UserDTO');
const CreateUserDTO = require('../../dto/user/CreateUserDTO');
const UpdateUserDTO = require('../../dto/user/UpdateUserDTO');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class UserService extends BaseService {
  constructor(userRepository, options = {}) {
    super(userRepository, options);
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret';
    this.jwtExpiration = process.env.JWT_EXPIRATION || '24h';
    this.bcryptRounds = 10;
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
    const hashedPassword = await bcrypt.hash(createDTO.motDePasse, this.bcryptRounds);

    // 5. Préparer les données pour la base
    const entityData = createDTO.toEntity();
    entityData.mot_de_passe = hashedPassword;

    // 6. Créer l'utilisateur
    const newUser = await this.repository.create(entityData);

    // 7. Générer le token
    const token = this._generateToken(newUser);

    // 8. Transformer en DTO de réponse
    const userDTO = UserDTO.fromEntity(newUser);

    this.logger.info(`Nouvel utilisateur inscrit: ${newUser.id_user}`);

    return {
      user: userDTO,
      token
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
    if (!user.est_actif) {
      throw this._forbiddenError('Votre compte est désactivé');
    }

    if (user.est_suspendu) {
      throw this._forbiddenError('Votre compte est suspendu');
    }

    // 3. Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(motDePasse, user.mot_de_passe);
    if (!isValidPassword) {
      throw this._unauthorizedError('Email ou mot de passe incorrect');
    }

    // 4. Mettre à jour la dernière connexion
    await this.repository.updateLastLogin(user.id_user);

    // 5. Générer le token
    const token = this._generateToken(user);

    // 6. Transformer en DTO
    const userDTO = UserDTO.fromEntity(user);

    this.logger.info(`Connexion réussie: ${user.id_user}`);

    return {
      user: userDTO,
      token
    };
  }

  /**
   * Vérifie un token JWT
   * @param {string} token
   * @returns {Promise<UserDTO>}
   */
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
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
      if (!currentUser || currentUser.type_user !== 'admin') {
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
    const isValid = await bcrypt.compare(ancienMotDePasse, user.mot_de_passe);
    if (!isValid) {
      throw this._validationError('Mot de passe actuel incorrect');
    }

    // Valider le nouveau mot de passe
    if (!nouveauMotDePasse || nouveauMotDePasse.length < 8) {
      throw this._validationError('Le nouveau mot de passe doit contenir au moins 8 caractères');
    }

    // Hasher et mettre à jour
    const hashedPassword = await bcrypt.hash(nouveauMotDePasse, this.bcryptRounds);
    await this.repository.update(userId, { mot_de_passe: hashedPassword });

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

    if (user.statut_validation === 'valide') {
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

    if (user.est_suspendu) {
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

    if (user.est_actif && !user.est_suspendu) {
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
   * Génère un token JWT
   * @private
   */
  _generateToken(user) {
    return jwt.sign(
      {
        userId: user.id_user,
        email: user.email,
        typeUser: user.type_user
      },
      this.jwtSecret,
      { expiresIn: this.jwtExpiration }
    );
  }
}

module.exports = UserService;
