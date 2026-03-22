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
const AppError = require('../../utils/appError');

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
    return AppError.notFound(`Resource with id ${id}`);
  }

  /**
   * Crée une erreur de validation standardisée
   * @param {string} message
   * @param {Array} details
   */
  _validationError(message, details = []) {
    const error = AppError.badRequest(message, 'VALIDATION_ERROR', details.length ? details : undefined);
    if (details.length) error.errors = details;
    return error;
  }

  /**
   * Crée une erreur de conflit (ex: email déjà utilisé)
   * @param {string} message
   */
  _conflictError(message) {
    return AppError.conflict(message);
  }

  /**
   * Crée une erreur d'autorisation
   * @param {string} message
   */
  _unauthorizedError(message = 'Non autorisé') {
    return AppError.unauthorized(message);
  }

  /**
   * Crée une erreur d'accès interdit
   * @param {string} message
   */
  _forbiddenError(message = 'Accès interdit') {
    return AppError.forbidden(message);
  }

  /**
   * Transforme une erreur Sequelize/générique en AppError standardisée.
   * Délègue à AppError.fromError() pour un traitement unifié.
   * @private
   */
  _handleError(error) {
    return AppError.fromError(error);
  }
}

module.exports = BaseService;
