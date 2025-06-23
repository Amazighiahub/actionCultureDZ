// utils/errorHandler.js

/**
 * Classe d'erreur personnalisée pour l'API
 */
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Erreurs prédéfinies
 */
const Errors = {
  // 400 - Bad Request
  BAD_REQUEST: (message, details) => new ApiError(400, message || 'Requête invalide', details),
  INVALID_ID: (entity) => new ApiError(400, `ID ${entity} invalide`),
  MISSING_PARAMS: (params) => new ApiError(400, `Paramètres manquants: ${params.join(', ')}`),
  INVALID_HIERARCHY: (message) => new ApiError(400, message || 'Hiérarchie invalide'),
  
  // 401 - Unauthorized
  UNAUTHORIZED: () => new ApiError(401, 'Non authentifié'),
  INVALID_TOKEN: () => new ApiError(401, 'Token invalide ou expiré'),
  
  // 403 - Forbidden
  FORBIDDEN: () => new ApiError(403, 'Accès refusé'),
  PROFESSIONAL_ONLY: () => new ApiError(403, 'Accès réservé aux professionnels'),
  ADMIN_ONLY: () => new ApiError(403, 'Accès réservé aux administrateurs'),
  NOT_VALIDATED: () => new ApiError(403, 'Votre compte doit être validé'),
  
  // 404 - Not Found
  NOT_FOUND: (entity) => new ApiError(404, `${entity} non trouvé`),
  TYPE_NOT_FOUND: () => new ApiError(404, 'Type d\'œuvre non trouvé'),
  GENRE_NOT_FOUND: () => new ApiError(404, 'Genre non trouvé'),
  CATEGORY_NOT_FOUND: () => new ApiError(404, 'Catégorie non trouvée'),
  
  // 409 - Conflict
  ALREADY_EXISTS: (entity) => new ApiError(409, `${entity} existe déjà`),
  RELATION_EXISTS: () => new ApiError(409, 'Cette relation existe déjà'),
  
  // 422 - Unprocessable Entity
  VALIDATION_ERROR: (errors) => new ApiError(422, 'Erreur de validation', errors),
  
  // 500 - Internal Server Error
  INTERNAL_ERROR: (message) => new ApiError(500, message || 'Erreur interne du serveur')
};

/**
 * Middleware de gestion des erreurs
 */
const errorMiddleware = (err, req, res, next) => {
  let error = err;

  // Si ce n'est pas une ApiError, la convertir
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Erreur interne du serveur';
    error = new ApiError(statusCode, message);
  }

  // Log de l'erreur (en production, utiliser un service de logging)
  if (error.statusCode >= 500) {
    console.error('Erreur serveur:', {
      message: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      user: req.user?.id_user
    });
  }

  // Réponse
  res.status(error.statusCode).json({
    success: false,
    error: error.message,
    ...(error.details && { details: error.details }),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

/**
 * Wrapper pour les fonctions async dans les routes
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Validateur de paramètres
 */
const validateParams = (params) => {
  return (req, res, next) => {
    const missing = [];
    
    for (const param of params) {
      if (param.in === 'body' && !req.body[param.name]) {
        missing.push(param.name);
      } else if (param.in === 'params' && !req.params[param.name]) {
        missing.push(param.name);
      } else if (param.in === 'query' && !req.query[param.name]) {
        missing.push(param.name);
      }
    }
    
    if (missing.length > 0) {
      throw Errors.MISSING_PARAMS(missing);
    }
    
    // Validation des types
    for (const param of params) {
      let value;
      if (param.in === 'body') value = req.body[param.name];
      else if (param.in === 'params') value = req.params[param.name];
      else if (param.in === 'query') value = req.query[param.name];
      
      if (param.type === 'number' && value && isNaN(value)) {
        throw Errors.BAD_REQUEST(`${param.name} doit être un nombre`);
      }
      
      if (param.type === 'array' && value && !Array.isArray(value)) {
        throw Errors.BAD_REQUEST(`${param.name} doit être un tableau`);
      }
    }
    
    next();
  };
};

module.exports = {
  ApiError,
  Errors,
  errorMiddleware,
  asyncHandler,
  validateParams
};