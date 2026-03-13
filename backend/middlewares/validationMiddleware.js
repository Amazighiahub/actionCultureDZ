const { validationResult } = require('express-validator');

const validationMiddleware = {
  // Gestionnaire des erreurs de validation
  handleValidationErrors: (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      const sensitiveFields = ['password', 'mot_de_passe', 'token', 'refresh_token', 'secret'];
      const formattedErrors = errors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        ...(sensitiveFields.includes(error.path || error.param) ? {} : { value: error.value })
      }));

      return res.status(400).json({
        success: false,
        error: req.t ? req.t('validation.invalidData') : 'Validation errors',
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
        error: req.t ? req.t('validation.invalidData') : 'Invalid page number'
      });
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('validation.invalidLimit') : 'Invalid limit (must be between 1 and 100)'
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
          error: req.t ? req.t('validation.invalidStartDate') : 'Start date cannot be in the past'
        });
      }
      
      if (capacite_max && (capacite_max < 1 || capacite_max > 100000)) {
        return res.status(400).json({
          success: false,
          error: req.t ? req.t('validation.invalidData') : 'Capacity must be between 1 and 100,000'
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
          error: req.t ? req.t('validation.invalidData') : `Invalid creation year (between 1000 and ${currentYear})`
        });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  },

  validateStringLengths: (req, res, next) => {
    const maxLengths = {
      default: 10000,
      title: 500,
      titre: 500,
      nom: 255,
      prenom: 255,
      name: 255,
      email: 255,
      description: 50000,
      biographie: 50000,
      message: 50000
    };

    const checkValue = (value, key) => {
      const limit = maxLengths[key] || maxLengths.default;
      if (typeof value === 'string' && value.length > limit) {
        return false;
      }
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        for (const [, v] of Object.entries(value)) {
          if (typeof v === 'string' && v.length > maxLengths.default) return false;
        }
      }
      return true;
    };

    if (req.body) {
      for (const [key, value] of Object.entries(req.body)) {
        if (!checkValue(value, key)) {
          return res.status(400).json({
            success: false,
            error: req.t
              ? req.t('validation.fieldTooLong', { field: key })
              : `Field '${key}' exceeds maximum length`
          });
        }
      }
    }
    next();
  }
};

module.exports = validationMiddleware;