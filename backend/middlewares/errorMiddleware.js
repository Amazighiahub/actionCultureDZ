const AppError = require('../utils/appError');
const logger = require('../utils/logger');

const errorMiddleware = {
  // Gestionnaire d'erreurs 404
  notFound: (req, res, next) => {
    // Ignorer silencieusement certaines routes automatiques
    const ignoredPaths = [
      '/.well-known',
      '/favicon.ico',
      '/robots.txt',
      '/sitemap.xml',
      '/apple-touch-icon',
      '/browserconfig.xml',
      '/.env',
      '/config.json'
    ];

    const shouldIgnore = ignoredPaths.some(path => req.originalUrl.startsWith(path));

    if (shouldIgnore) {
      return res.status(404).json({ success: false, error: 'Resource not found' });
    }

    const message = req.t ? req.t('common.notFound') : 'Route not found';
    const error = new Error(message);
    error.status = 404;
    next(error);
  },

  // Gestionnaire d'erreurs global
  errorHandler: (error, req, res, next) => {
    // Si la réponse a déjà été envoyée (ex: timeout middleware 408),
    // ne pas tenter d'envoyer une autre réponse — juste logger et déléguer à Express.
    if (res.headersSent) {
      logger.warn('errorHandler: headers already sent, skipping response', {
        error: error.message,
        path: req.originalUrl,
        method: req.method
      });
      return next(error);
    }

    const isIgnoredPath = [
      '/.well-known',
      '/favicon.ico',
      '/robots.txt'
    ].some(path => req.originalUrl.startsWith(path));

    // AppError — format plat avec code
    if (error instanceof AppError) {
      logger.warn('AppError: %o', { code: error.code, message: error.message, statusCode: error.statusCode });
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.code,
        ...(error.details && { details: error.details })
      });
    }

    let statusCode = error.status || error.statusCode || 500;
    let message = error.message || 'Erreur interne du serveur';
    let code;

    // Erreurs Sequelize
    if (error.name === 'SequelizeValidationError') {
      statusCode = 400;
      message = 'Erreur de validation des données';
      code = 'DB_VALIDATION_ERROR';
      const details = error.errors.map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      return res.status(statusCode).json({ success: false, error: message, code, details });
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      statusCode = 409;
      message = 'Cette ressource existe déjà';
      code = 'UNIQUE_CONSTRAINT';
      const details = error.errors.map(err => ({
        field: err.path,
        message: `${err.path} doit être unique`,
        value: err.value
      }));
      return res.status(statusCode).json({ success: false, error: message, code, details });
    }

    if (error.name === 'SequelizeForeignKeyConstraintError') {
      statusCode = 400;
      message = 'Référence invalide vers une ressource inexistante';
      code = 'FK_CONSTRAINT';
    }

    if (error.name === 'SequelizeDatabaseError') {
      statusCode = 500;
      message = 'Erreur de base de données';
      logger.error('Erreur de base de données: %o', error);
    }

    // Erreurs JWT
    if (error.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Token invalide';
      code = 'INVALID_TOKEN';
    }

    if (error.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Token expiré';
      code = 'TOKEN_EXPIRED';
    }

    // Toujours logger les erreurs 500 (pas seulement en dev)
    if (statusCode >= 500 && !(statusCode === 404 && isIgnoredPath)) {
      logger.error('Erreur serveur: %s | %s %s | %s', error.message, req.method, req.originalUrl, error.stack?.split('\n')[1]?.trim() || '');
    } else if (process.env.NODE_ENV === 'development') {
      logger.error('Erreur: %o', error);
    }

    res.status(statusCode).json({
      success: false,
      error: message,
      ...(code && { code }),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

module.exports = errorMiddleware;
