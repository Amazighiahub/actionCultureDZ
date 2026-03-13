/**
 * BaseController - Classe de base pour tous les controllers
 * Architecture: BaseController → Controller → Service → Repository → Database
 *
 * Fournit :
 * - _handleError(res, error) : gestion d'erreur standardisée
 * - _paginate(req)           : extraction page/limit depuis query params
 * - _sendSuccess(res, data, statusCode)       : réponse succès simple
 * - _sendPaginated(res, data, pagination)     : réponse succès paginée
 * - _sendCreated(res, data, message)          : réponse 201
 * - _sendMessage(res, message)                : réponse succès avec message seul
 */

const IS_DEV_MODE = process.env.NODE_ENV === 'development';

class BaseController {
  // ============================================================================
  // RÉPONSES SUCCÈS
  // ============================================================================

  /**
   * Réponse succès générique
   * @param {object} res - Express response
   * @param {any} data - Données à retourner
   * @param {number} [statusCode=200]
   */
  _sendSuccess(res, data, statusCode = 200) {
    res.status(statusCode).json({ success: true, data });
  }

  /**
   * Réponse succès paginée
   * @param {object} res
   * @param {Array} data - Éléments de la page courante
   * @param {object} pagination - Objet pagination du repository/service
   */
  _sendPaginated(res, data, pagination) {
    res.json({ success: true, data, pagination });
  }

  /**
   * Réponse 201 Created
   * @param {object} res
   * @param {any} data
   * @param {string} [message]
   */
  _sendCreated(res, data, message) {
    const response = { success: true, data };
    if (message) response.message = message;
    res.status(201).json(response);
  }

  /**
   * Réponse succès avec message seul (delete, update sans body, etc.)
   * @param {object} res
   * @param {string} message
   */
  _sendMessage(res, message) {
    res.json({ success: true, message });
  }

  // ============================================================================
  // PAGINATION
  // ============================================================================

  /**
   * Extrait et valide les paramètres de pagination depuis req.query
   * @param {object} req - Express request
   * @param {object} [defaults] - Valeurs par défaut
   * @param {number} [defaults.page=1]
   * @param {number} [defaults.limit=20]
   * @returns {{ page: number, limit: number, offset: number }}
   */
  _paginate(req, defaults = {}) {
    const page = Math.max(1, parseInt(req.query.page) || defaults.page || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || defaults.limit || 20));
    const offset = (page - 1) * limit;
    return { page, limit, offset };
  }

  // ============================================================================
  // GESTION D'ERREURS
  // ============================================================================

  /**
   * Gestion d'erreur standardisée — remplace les try/catch ad-hoc
   * Compatible avec les erreurs émises par BaseService (_notFoundError, _validationError, etc.)
   * @param {object} res - Express response
   * @param {Error} error
   */
  _handleError(res, error) {
    const statusCode = error.statusCode || 500;
    const code = error.code || 'INTERNAL_ERROR';

    if (IS_DEV_MODE) {
      console.error(`[${this.constructor.name}] Error [${code}]:`, error.message);
      if (statusCode === 500) console.error(error.stack);
    }

    const response = {
      success: false,
      error: error.message || 'Internal server error',
      code
    };

    if (error.errors) response.errors = error.errors;
    if (IS_DEV_MODE && statusCode === 500) response.stack = error.stack;

    res.status(statusCode).json(response);
  }
}

module.exports = BaseController;
