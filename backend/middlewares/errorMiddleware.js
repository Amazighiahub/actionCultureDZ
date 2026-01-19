const AppError = require('../utils/AppError');
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
    const error = new Error(`Route non trouvée - ${req.originalUrl}`);
    error.status = 404;
    next(error);
  },

  // Gestionnaire d'erreurs global
  errorHandler: (error, req, res, next) => {
    // Ne pas logger les erreurs 404 pour les chemins ignorés
    const isIgnoredPath = [
      '/.well-known',
      '/favicon.ico',
      '/robots.txt'
    ].some(path => req.originalUrl.startsWith(path));
    
    // If it's an AppError, use its structured format
    if (error instanceof AppError) {
      const payload = error.toJSON();
      logger.warn('AppError: %o', payload);
      return res.status(error.statusCode).json(payload);
    }

    let statusCode = error.status || error.statusCode || 500;
    let message = error.message || 'Erreur interne du serveur';

    // Erreurs Sequelize
    if (error.name === 'SequelizeValidationError') {
      statusCode = 400;
      message = 'Erreur de validation des données';
      const details = error.errors.map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      
      return res.status(statusCode).json({
        success: false,
        error: message,
        details
      });
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      statusCode = 409;
      message = 'Cette ressource existe déjà';
      const details = error.errors.map(err => ({
        field: err.path,
        message: `${err.path} doit être unique`,
        value: err.value
      }));
      
      return res.status(statusCode).json({
        success: false,
        error: message,
        details
      });
    }

    if (error.name === 'SequelizeForeignKeyConstraintError') {
      statusCode = 400;
      message = 'Référence invalide vers une ressource inexistante';
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
    }

    if (error.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Token expiré';
    }

    // Log de l'erreur en développement (sauf pour les 404 sur chemins ignorés)
    if (process.env.NODE_ENV === 'development' && !(statusCode === 404 && isIgnoredPath)) {
      logger.error('Erreur: %o', error);
    }

    res.status(statusCode).json({
      success: false,
      error: message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

module.exports = errorMiddleware;