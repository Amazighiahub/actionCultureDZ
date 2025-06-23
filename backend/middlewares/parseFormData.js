// middleware/parseFormData.js
module.exports = function parseFormData(req, res, next) {
  // Si on a un champ 'data' dans le body
  if (req.body && req.body.data) {
    try {
      // Parser le JSON
      const parsedData = JSON.parse(req.body.data);
      
      // Merger avec req.body
      Object.assign(req.body, parsedData);
      
      // Optionnel: supprimer le champ 'data' original
      delete req.body.data;
      
      console.log('✅ FormData parsé avec succès');
    } catch (error) {
      console.error('❌ Erreur parsing FormData:', error);
      return res.status(400).json({
        success: false,
        error: 'Format de données invalide'
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
        console.warn(`Impossible de parser ${field}`);
      }
    }
  });
  
  next();
};