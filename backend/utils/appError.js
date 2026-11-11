/**
 * Classe personnalisée pour les erreurs d'application
 * Permet une gestion cohérente et prévisible des erreurs
 */

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.timestamp = new Date().toISOString();
    this.isOperational = true; // Erreur gérée vs bug non géré

    // Capture la trace d'erreur
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Crée une erreur de validation (400)
   */
  static badRequest(message, code = 'VALIDATION_ERROR', details = null) {
    const error = new AppError(message, 400, code);
    if (details) error.details = details;
    return error;
  }

  /**
   * Crée une erreur d'authentification (401)
   */
  static unauthorized(message = 'Authentification requise', code = 'AUTH_REQUIRED') {
    return new AppError(message, 401, code);
  }

  /**
   * Crée une erreur d'autorisation (403)
   */
  static forbidden(message = 'Accès refusé', code = 'FORBIDDEN') {
    return new AppError(message, 403, code);
  }

  /**
   * Crée une erreur ressource non trouvée (404)
   */
  static notFound(resource = 'Ressource', code = 'NOT_FOUND') {
    return new AppError(`${resource} non trouvé(e)`, 404, code);
  }

  /**
   * Crée une erreur de conflit (409)
   */
  static conflict(message, code = 'CONFLICT') {
    return new AppError(message, 409, code);
  }

  /**
   * Crée une erreur de serveur interne (500)
   */
  static internalError(message = 'Erreur serveur interne', code = 'INTERNAL_ERROR') {
    return new AppError(message, 500, code);
  }

  /**
   * Crée une erreur de limite atteinte (429)
   */
  static tooManyRequests(message = 'Trop de requêtes', code = 'RATE_LIMITED') {
    return new AppError(message, 429, code);
  }

  /**
   * Convertit une erreur Node en AppError
   */
  static fromError(error) {
    // Si c'est déjà une AppError, la retourner
    if (error instanceof AppError) {
      return error;
    }
    const { messageValidationBase, MESSAGE_REFERENCE, MESSAGE_SESSION } = AppError;

    // Erreurs de base de données Sequelize
    if (error.name === 'SequelizeValidationError') {
      // Pas le texte anglais de Sequelize (noms de colonnes) : phrase courte par champ
      const details = (error.errors || []).map(e => ({ field: e.path, message: messageValidationBase(e) }));
      return AppError.badRequest('Données invalides', 'DB_VALIDATION_ERROR', details);
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.fields ? Object.keys(error.fields)[0] : null;
      const conflit = AppError.conflict('Cette valeur est déjà utilisée', 'UNIQUE_CONSTRAINT');
      if (field) conflit.details = [{ field, message: 'Cette valeur est déjà utilisée' }];
      return conflit;
    }

    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return AppError.badRequest(MESSAGE_REFERENCE, 'FK_CONSTRAINT');
    }

    // Erreurs JWT
    if (error.name === 'JsonWebTokenError') {
      return AppError.unauthorized(MESSAGE_SESSION, 'INVALID_TOKEN');
    }

    if (error.name === 'TokenExpiredError') {
      return AppError.unauthorized(MESSAGE_SESSION, 'TOKEN_EXPIRED');
    }

    // Erreurs Multer (uploads)
    if (error.code === 'LIMIT_FILE_SIZE') {
      return AppError.badRequest('Fichier trop volumineux', 'FILE_TOO_LARGE');
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      return AppError.badRequest('Trop de fichiers', 'TOO_MANY_FILES');
    }

    // Erreur générique
    return AppError.internalError(error.message || 'Une erreur inattendue s\'est produite');
  }

  /**
   * Convertit l'erreur en objet de réponse
   */
  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        ...(this.details && { details: this.details }),
        timestamp: this.timestamp
      }
    };
  }
}

// Phrases communes à AppError.fromError et à middlewares/errorMiddleware.js (traduites par
// i18n/serveur) : jamais le texte technique de Sequelize ou de JWT (audit V11 FRM-17)
AppError.MESSAGE_SESSION = 'Votre session a expiré : reconnectez-vous.';
AppError.MESSAGE_REFERENCE = 'Un des éléments choisis n’existe plus : rechargez la page, puis réessayez.';
/** Phrase courte pour un champ refusé par le modèle (au lieu de « notNull Violation: Evenement.nom… ») */
AppError.messageValidationBase = (item) => {
  const cle = item?.validatorKey;
  if (cle === 'len') return 'Texte trop long';
  if (cle === 'isEmail') return 'Format d\'email invalide';
  if (cle === 'is_null' || cle === 'notEmpty' || /notNull/i.test(item?.type || '')) return 'Ce champ est requis';
  return 'Valeur invalide';
};

module.exports = AppError;
