const { validationResult } = require('express-validator');
const { isValidLatitude, isValidLongitude } = require('../services/utils/geoUtils');

/** Jour (AAAA-MM-JJ) d'une date en heure d'Algérie */
const jourAlger = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Algiers' }).format(new Date(d));

/** La date de début envoyée tombe-t-elle le même jour que celle déjà enregistrée ? */
async function memeJourQueLeDebutActuel(id, dateDebut) {
  if (!id) return false;
  const { Evenement } = require('../models');
  const actuel = await Evenement.findByPk(id, { attributes: ['date_debut'] });
  return !!actuel?.date_debut && jourAlger(actuel.date_debut) === jourAlger(dateDebut);
}

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
        // Sans le nom technique du paramètre (avant : « ID userId invalide »)
        return res.status(400).json({
          success: false,
          error: req.t ? req.t('validation.lienInvalide') : 'Ce lien est incomplet ou erroné',
          code: 'INVALID_ID'
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

    // Limiter l'offset max pour éviter les DoS via pagination profonde
    const maxOffset = 10000;
    const offset = (pageNum - 1) * limitNum;
    if (offset > maxOffset) {
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('validation.paginationTooDeep') : 'Pagination too deep (max offset: 10000)'
      });
    }

    req.query.page = pageNum;
    req.query.limit = limitNum;
    next();
  },
  validateEventCreation: async (req, res, next) => {
    try {
      const { date_debut, date_fin, capacite_max } = req.body;
      
      // Comparaison par jour, en heure d'Algérie : « 2026-10-29 » vaut minuit UTC, déjà passé le jour
      // même ; un événement de ce soir doit pouvoir être créé. En modification (PUT), seule une date
      // de début changée est contrôlée : un événement en cours doit rester modifiable (lieu, contact…)
      const debutPasse = date_debut && jourAlger(date_debut) < jourAlger(new Date())
        && !(req.method === 'PUT' && await memeJourQueLeDebutActuel(req.params.id, date_debut));
      if (debutPasse) {
        return res.status(400).json({
          success: false,
          error: req.t ? req.t('validation.invalidStartDate') : 'Start date cannot be in the past'
        });
      }

      if (date_debut && date_fin && new Date(date_fin) < new Date(date_debut)) {
        return res.status(400).json({
          success: false,
          error: req.t ? req.t('validation.endDateAfterStart') : 'End date must be after start date'
        });
      }

      const tarif = parseFloat(req.body.tarif);
      if (req.body.tarif !== undefined && (isNaN(tarif) || tarif < 0)) {
        return res.status(400).json({
          success: false,
          error: req.t ? req.t('validation.invalidPrice') : 'Price must be 0 or greater'
        });
      }

      const cap = parseInt(capacite_max);
      // Vide : pas de limite de places (le formulaire de modification envoie les champs vidés)
      if (capacite_max !== undefined && capacite_max !== '' && (isNaN(cap) || cap < 0 || cap > 100000)) {
        return res.status(400).json({
          success: false,
          error: req.t ? req.t('validation.invalidCapacity') : 'Capacity must be between 0 and 100,000'
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
      // Année prochaine permise (livre annoncé), comme le formulaire et la validation des routes
      const currentYear = new Date().getFullYear() + 1;
      
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

    // Limite dépassée (nombre de caractères), ou 0 si la valeur convient
    const limiteDepassee = (value, key) => {
      const limit = maxLengths[key] || maxLengths.default;
      if (typeof value === 'string' && value.length > limit) {
        return limit;
      }
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        for (const [, v] of Object.entries(value)) {
          if (typeof v === 'string' && v.length > maxLengths.default) return maxLengths.default;
        }
      }
      return 0;
    };

    if (req.body) {
      for (const [key, value] of Object.entries(req.body)) {
        const max = limiteDepassee(value, key);
        if (max) {
          // Sans le nom technique du champ (avant : « Le champ nom_evenement est trop long ») ; le champ
          // est dans « details » pour que le formulaire place le message au bon endroit
          const message = req.t
            ? req.t('validation.texteTropLong', { max })
            : `Ce texte est trop long (${max} caractères au plus)`;
          return res.status(400).json({
            success: false,
            error: message,
            code: 'TEXT_TOO_LONG',
            details: [{ field: key, message }]
          });
        }
      }
    }
    next();
  },

  // Middleware pour valider les coordonnées GPS (latitude/longitude)
  validateGPS: (req, res, next) => {
    const { latitude, longitude } = req.body;

    if (latitude !== undefined && latitude !== null && latitude !== '') {
      if (!isValidLatitude(latitude)) {
        return res.status(400).json({
          success: false,
          error: req.t ? req.t('validation.invalidGPS') : 'Coordonnées GPS invalides (latitude : -90 à 90)'
        });
      }
    }

    if (longitude !== undefined && longitude !== null && longitude !== '') {
      if (!isValidLongitude(longitude)) {
        return res.status(400).json({
          success: false,
          error: req.t ? req.t('validation.invalidGPS') : 'Coordonnées GPS invalides (longitude : -180 à 180)'
        });
      }
    }

    next();
  }
};

module.exports = validationMiddleware;