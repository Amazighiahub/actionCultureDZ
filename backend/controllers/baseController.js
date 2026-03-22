/**
 * BaseController - Classe de base pour tous les controllers
 * Architecture: BaseController → Controller → Service → Repository → Database
 *
 * Fournit :
 * - wrap(methodName)          : asyncHandler auto — élimine les try/catch manuels
 * - _handleError(res, error)  : gestion d'erreur legacy (rétro-compatible)
 * - _paginate(req)            : extraction page/limit depuis query params
 * - _sendSuccess(res, data, statusCode)       : réponse succès simple
 * - _sendPaginated(res, data, pagination)     : réponse succès paginée
 * - _sendCreated(res, data, message)          : réponse 201
 * - _sendMessage(res, message)                : réponse succès avec message seul
 *
 * Usage dans les routes :
 *   router.get('/', controller.wrap('list'));
 *   // au lieu de : router.get('/', (req, res) => controller.list(req, res));
 *   // le try/catch dans list() peut alors être supprimé.
 */

const IS_DEV_MODE = process.env.NODE_ENV === 'development';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

class BaseController {
  // ============================================================================
  // ASYNC HANDLER WRAPPER
  // ============================================================================

  /**
   * Retourne un middleware Express qui appelle la méthode nommée et
   * forward toute erreur vers le error middleware global (next(err)).
   *
   * Cela élimine le pattern try/catch + _handleError dans chaque méthode.
   * Les erreurs AppError (statusCode, code) sont préservées par errorMiddleware.
   *
   * @param {string} methodName - Nom de la méthode du controller à wrapper
   * @returns {Function} Express middleware (req, res, next)
   */
  wrap(methodName) {
    const fn = this[methodName];
    if (typeof fn !== 'function') {
      throw new Error(`${this.constructor.name}.${methodName} is not a function`);
    }
    const bound = fn.bind(this);
    return (req, res, next) => {
      Promise.resolve(bound(req, res, next)).catch(next);
    };
  }
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
      error: (IS_PRODUCTION && statusCode === 500)
        ? 'Internal server error'
        : (error.message || 'Internal server error'),
      code
    };

    if (error.errors && !IS_PRODUCTION) response.errors = error.errors;
    if (IS_DEV_MODE && statusCode === 500) response.stack = error.stack;

    res.status(statusCode).json(response);
  }
}

module.exports = BaseController;
