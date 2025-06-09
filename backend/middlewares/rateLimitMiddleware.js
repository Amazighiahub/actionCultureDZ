const rateLimit = require('express-rate-limit');

const rateLimitMiddleware = {
  // Limite générale pour l'API
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // max 1000 requêtes par fenêtre
    message: {
      success: false,
      error: 'Trop de requêtes, veuillez réessayer plus tard'
    },
    standardHeaders: true,
    legacyHeaders: false
  }),

  // Limite stricte pour l'authentification
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // max 5 tentatives de connexion par fenêtre
    message: {
      success: false,
      error: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes'
    },
    skipSuccessfulRequests: true
  }),

  // Limite pour la création de contenu
  creation: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 50, // max 50 créations par heure
    message: {
      success: false,
      error: 'Limite de création atteinte, veuillez réessayer plus tard'
    }
  }),

  adaptive: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: (req) => {
      if (req.user?.isAdmin) return 10000;
      if (req.user?.isProfessionnel) return 5000;
      return 1000;
    },
    keyGenerator: (req) => {
      return req.user?.id_user || req.ip;
    },
    message: (req) => ({
      success: false,
      error: `Limite atteinte pour votre niveau (${req.user?.type_user || 'anonyme'})`
    })
  }),

  // 🆕 NOUVEAU : Actions sensibles
  sensitiveActions: rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: {
      success: false,
      error: 'Limite d\'actions sensibles atteinte'
    }
  })
};

module.exports = rateLimitMiddleware;