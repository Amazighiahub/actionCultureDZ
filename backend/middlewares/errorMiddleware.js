const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const { repondreSiConflit } = require('../utils/conflitSimultane');
const { reponseErreurSequelize } = require('../utils/erreurSequelize');

const { MESSAGE_SESSION } = AppError;

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

    const isProduction = process.env.NODE_ENV === 'production';

    // AppError — format plat avec code. Une AppError 500 est le plus souvent une erreur imprévue emballée
    // par un service (AppError.fromError, texte brut) : masquée en production comme toute 500
    if (error instanceof AppError) {
      const masquee = isProduction && error.statusCode === 500;
      if (masquee) logger.error('Erreur serveur: %s | %s %s', error.message, req.method, req.originalUrl);
      else logger.warn('AppError: %o', { code: error.code, message: error.message, statusCode: error.statusCode });
      return res.status(error.statusCode).json({
        success: false,
        error: masquee ? 'Erreur serveur' : error.message,
        code: masquee ? 'INTERNAL_ERROR' : error.code,
        // Champs refusés (champ + message seulement), aussi en production pour une erreur 4xx
        ...(error.details && (!isProduction || error.statusCode < 500) && {
          details: Array.isArray(error.details)
            ? error.details.slice(0, 50).map(e => (typeof e === 'string'
              ? e
              : { field: e?.field || e?.path || e?.param || null, message: e?.message || e?.msg || '' }))
            : (isProduction ? undefined : error.details)
        })
      });
    }

    let statusCode = error.status || error.statusCode || 500;
    let message = error.message || 'Erreur serveur';
    // Code de l'application (COMMANDE_DOUBLON…) gardé pour une erreur 4xx ; jamais un code système sur une 500
    let code = statusCode < 500 && typeof error.code === 'string' ? error.code : undefined;

    // Erreurs Sequelize : donnée refusée, valeur déjà utilisée, élément lié introuvable
    const sequelize = reponseErreurSequelize(error, isProduction);
    if (sequelize) return res.status(sequelize.statusCode).json(sequelize.corps);

    // Deux enregistrements simultanés sur les mêmes données : opération annulée, message clair (409)
    if (repondreSiConflit(error, req, res, logger)) return;

    if (error.name === 'SequelizeDatabaseError') {
      statusCode = 500;
      message = 'Erreur de base de données';
      // Ni la requête SQL ni ses valeurs (e-mails, empreintes de mot de passe, jetons) dans les journaux
      logger.error('Erreur de base de données', {
        name: error.name, code: error.parent?.code || error.original?.code,
        message: error.original?.sqlMessage || error.parent?.sqlMessage || error.message?.slice(0, 300),
      });
    }

    // Erreurs JWT
    if (error.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = MESSAGE_SESSION;
      code = 'INVALID_TOKEN';
    }

    if (error.name === 'TokenExpiredError') {
      statusCode = 401;
      message = MESSAGE_SESSION;
      code = 'TOKEN_EXPIRED';
    }

    // Toujours logger les erreurs 500 (pas seulement en dev)
    if (statusCode >= 500 && !(statusCode === 404 && isIgnoredPath)) {
      logger.error('Erreur serveur: %s | %s %s | %s', error.message, req.method, req.originalUrl, error.stack?.split('\n')[1]?.trim() || '');
    } else if (process.env.NODE_ENV === 'development') {
      logger.error('Erreur: %o', error);
    }

    // En production, ne jamais renvoyer le message technique d'une erreur 500
    // (noms de tables, chemins, détails internes) : il est journalisé ci-dessus.
    if (statusCode >= 500 && process.env.NODE_ENV === 'production') {
      message = 'Erreur serveur';
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
