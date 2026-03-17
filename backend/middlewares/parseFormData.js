// middleware/parseFormData.js
const logger = require('../utils/logger');

module.exports = function parseFormData(req, res, next) {
  // Si on a un champ 'data' dans le body
  if (req.body && req.body.data) {
    try {
      // Parser le JSON
      const parsedData = JSON.parse(req.body.data);
      
      // Merger avec req.body (filtrer les clés dangereuses)
      delete parsedData.__proto__;
      delete parsedData.constructor;
      delete parsedData.prototype;
      Object.assign(req.body, parsedData);
      
      // Optionnel: supprimer le champ 'data' original
      delete req.body.data;
      
      logger.debug('FormData parsé avec succès');
    } catch (error) {
      logger.warn('Erreur parsing FormData:', error.message);
      return res.status(400).json({
        success: false,
        error: req.t ? req.t('validation.invalidData') : 'Invalid data format'
      });
    }
  }
  
  // Parser aussi les champs JSON stringifiés
  ['categories', 'tags', 'editeurs', 'utilisateurs_inscrits', 
   'intervenants_non_inscrits', 'nouveaux_intervenants', 
   'details_specifiques'].forEach(field => {
    if (req.body[field] && typeof req.body[field] === 'string') {
      try {
        req.body[field] = JSON.parse(req.body[field]);
      } catch (e) {
        logger.debug(`Impossible de parser ${field}`);
      }
    }
  });
  
  next();
};