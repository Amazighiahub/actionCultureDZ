/**
 * BaseService - Classe de base pour tous les services
 * Fournit les opérations communes et la gestion des erreurs
 *
 * Pattern: Service Layer
 * - Contient la logique métier
 * - Orchestre les opérations entre repositories
 * - Gère les transactions
 * - Transforme les données via DTOs
 */

const logger = require('../../utils/logger');

class BaseService {
  constructor(repository, options = {}) {
    this.repository = repository;
    this.models = options.models;
    this.cache = options.cache;
    this.logger = logger;
  }

  /**
   * Récupère tous les éléments avec pagination
   * @param {Object} options - Options de pagination et filtrage
   * @returns {Promise<{data: Array, pagination: Object}>}
   */
  async findAll(options = {}) {
    try {
      return await this.repository.findAll(options);
    } catch (error) {
      this.logger.error(`${this.constructor.name}.findAll error:`, error);
      throw this._handleError(error);
    }
  }

  /**
   * Récupère un élément par ID
   * @param {number} id
   * @param {Object} options
   * @returns {Promise<Object|null>}
   */
  async findById(id, options = {}) {
    try {
      const entity = await this.repository.findById(id, options);
      if (!entity) {
        throw this._notFoundError(id);
      }
      return entity;
    } catch (error) {
      if (error.code === 'NOT_FOUND') throw error;
      this.logger.error(`${this.constructor.name}.findById error:`, error);
      throw this._handleError(error);
    }
  }

  /**
   * Crée un nouvel élément
   * @param {Object} data - Données de création
   * @returns {Promise<Object>}
   */
  async create(data) {
    try {
      return await this.repository.create(data);
    } catch (error) {
      this.logger.error(`${this.constructor.name}.create error:`, error);
      throw this._handleError(error);
    }
  }

  /**
   * Met à jour un élément
   * @param {number} id
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async update(id, data) {
    try {
      const entity = await this.repository.update(id, data);
      if (!entity) {
        throw this._notFoundError(id);
      }
      return entity;
    } catch (error) {
      if (error.code === 'NOT_FOUND') throw error;
      this.logger.error(`${this.constructor.name}.update error:`, error);
      throw this._handleError(error);
    }
  }

  /**
   * Supprime un élément
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    try {
      const result = await this.repository.delete(id);
      if (!result) {
        throw this._notFoundError(id);
      }
      return true;
    } catch (error) {
      if (error.code === 'NOT_FOUND') throw error;
      this.logger.error(`${this.constructor.name}.delete error:`, error);
      throw this._handleError(error);
    }
  }

  /**
   * Exécute une opération dans une transaction
   * @param {Function} callback
   * @returns {Promise<any>}
   */
  async withTransaction(callback) {
    return this.repository.withTransaction(callback);
  }

  /**
   * Invalide le cache pour une clé donnée
   * @param {string} key
   */
  async invalidateCache(key) {
    if (this.cache) {
      await this.cache.del(key);
    }
  }

  /**
   * Crée une erreur "non trouvé" standardisée
   * @private
   */
  _notFoundError(id) {
    const error = new Error(`Resource with id ${id} not found`);
    error.code = 'NOT_FOUND';
    error.statusCode = 404;
    return error;
  }

  /**
   * Crée une erreur de validation standardisée
   * @param {string} message
   * @param {Array} errors
   */
  _validationError(message, errors = []) {
    const error = new Error(message);
    error.code = 'VALIDATION_ERROR';
    error.statusCode = 400;
    error.errors = errors;
    return error;
  }

  /**
   * Crée une erreur de conflit (ex: email déjà utilisé)
   * @param {string} message
   */
  _conflictError(message) {
    const error = new Error(message);
    error.code = 'CONFLICT';
    error.statusCode = 409;
    return error;
  }

  /**
   * Crée une erreur d'autorisation
   * @param {string} message
   */
  _unauthorizedError(message = 'Non autorisé') {
    const error = new Error(message);
    error.code = 'UNAUTHORIZED';
    error.statusCode = 401;
    return error;
  }

  /**
   * Crée une erreur d'accès interdit
   * @param {string} message
   */
  _forbiddenError(message = 'Accès interdit') {
    const error = new Error(message);
    error.code = 'FORBIDDEN';
    error.statusCode = 403;
    return error;
  }

  /**
   * Transforme une erreur Sequelize en erreur standardisée
   * @private
   */
  _handleError(error) {
    // Erreur de validation Sequelize
    if (error.name === 'SequelizeValidationError') {
      return this._validationError(
        'Erreur de validation',
        error.errors.map(e => ({ field: e.path, message: e.message }))
      );
    }

    // Contrainte unique violée
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors?.[0]?.path || 'unknown';
      return this._conflictError(`La valeur pour ${field} existe déjà`);
    }

    // Clé étrangère invalide
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return this._validationError('Référence invalide');
    }

    // Erreur générique
    const genericError = new Error(error.message || 'Erreur serveur');
    genericError.code = 'INTERNAL_ERROR';
    genericError.statusCode = 500;
    return genericError;
  }
}

module.exports = BaseService;
