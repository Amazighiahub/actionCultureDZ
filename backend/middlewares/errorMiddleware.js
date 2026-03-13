const AppError = require('../utils/appError');
const logger = require('../utils/logger');

const errorMiddleware = {
  // Gestionnaire d'erreurs 404
  notFound: (req, res, next) => {
    // Ignorer silencieusement certaines routes automatiques
    const ignoredPaths = [
      '/.well-known',
      '/favicon.ico',
      '/apple-touch-icon',
      '/browserconfig.xml',
      '/.env',
      '/config.json'
    ];
    
    // Vérifier si c'est une route à ignorer
    const shouldIgnore = ignoredPaths.some(path => req.originalUrl.startsWith(path));
    
    if (shouldIgnore) {
      // Répondre avec un 404 simple sans créer d'erreur
      return res.status(404).json({
        success: false,
        error: 'Resource not found'
      });
    }
    
    // Pour les autres routes, créer une erreur
    const error = new Error(req.t ? req.t('common.notFound') : 'Route not found');
    error.status = 404;
    next(error);
  },

  // Gestionnaire d'erreurs global — normalise via AppError.fromError()
  errorHandler: (error, req, res, next) => {
    const isIgnoredPath = [
      '/.well-known',
      '/favicon.ico'
    ].some(p => req.originalUrl.startsWith(p));

    // Normalize all errors through AppError.fromError()
    const appError = AppError.fromError(error);

    // Preserve original HTTP status if set (e.g. from 404 handler)
    if (error.status && !error.statusCode) {
      appError.statusCode = error.status;
    }

    const logContext = {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      userId: req.user?.id_user
    };

    // Log based on severity
    if (appError.statusCode >= 500) {
      logger.error(appError.message, { ...logContext, stack: error.stack });
    } else if (!isIgnoredPath && appError.statusCode !== 404) {
      logger.warn(appError.message, logContext);
    }

    // Report 5xx to Sentry
    if (appError.statusCode >= 500) {
      try {
        const Sentry = require('@sentry/node');
        Sentry.withScope((scope) => {
          scope.setExtra('requestId', req.requestId);
          if (req.user) scope.setUser({ id: req.user.id_user });
          Sentry.captureException(error);
        });
      } catch (e) { /* Sentry not installed */ }
    }

    res.status(appError.statusCode).json({
      success: false,
      error: appError.message,
      code: appError.code,
      ...(appError.statusCode < 500 && appError.isOperational && appError.details && { details: appError.details }),
      ...(req.requestId && { requestId: req.requestId }),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

module.exports = errorMiddleware;