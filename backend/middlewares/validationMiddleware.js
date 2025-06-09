const { validationResult } = require('express-validator');

const validationMiddleware = {
  // Gestionnaire des erreurs de validation
  handleValidationErrors: (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value
      }));

      return res.status(400).json({
        success: false,
        error: 'Erreurs de validation',
        details: formattedErrors
      });
    }
    
    next();
  },

  // Middleware pour valider les IDs numériques
  validateId: (paramName = 'id') => {
    return (req, res, next) => {
      const id = parseInt(req.params[paramName]);
      
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          error: `ID ${paramName} invalide`
        });
      }
      
      req.params[paramName] = id;
      next();
    };
  },

  // Middleware pour valider la pagination
  validatePagination: (req, res, next) => {
    const { page = 1, limit = 10 } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        error: 'Numéro de page invalide'
      });
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: 'Limite invalide (doit être entre 1 et 100)'
      });
    }
    
    req.query.page = pageNum;
    req.query.limit = limitNum;
    next();
  },
  validateEventCreation: async (req, res, next) => {
    try {
      const { date_debut, date_fin, capacite_max } = req.body;
      
      if (new Date(date_debut) < new Date()) {
        return res.status(400).json({
          success: false,
          error: 'La date de début ne peut pas être dans le passé'
        });
      }
      
      if (capacite_max && (capacite_max < 1 || capacite_max > 100000)) {
        return res.status(400).json({
          success: false,
          error: 'Capacité doit être entre 1 et 100 000'
        });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  },

  validateWorkSubmission: async (req, res, next) => {
    try {
      const { annee_creation } = req.body;
      const currentYear = new Date().getFullYear();
      
      if (annee_creation && (annee_creation < 1000 || annee_creation > currentYear)) {
        return res.status(400).json({
          success: false,
          error: `Année de création invalide (entre 1000 et ${currentYear})`
        });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  }
};

module.exports = validationMiddleware;