// 📁 securityMiddleware.js - NOUVEAU FICHIER
const securityMiddleware = {
  // Nettoyage des entrées utilisateur
  sanitizeInput: (req, res, next) => {
    const sanitizeString = (str) => {
      if (typeof str !== 'string') return str;
      
      return str
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<[\/\!]*?[^<>]*?>/gi, '')
        .trim();
    };

    const sanitizeObject = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = sanitizeString(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    };

    if (req.body) sanitizeObject(req.body);
    if (req.query) sanitizeObject(req.query);
    if (req.params) sanitizeObject(req.params);
    
    next();
  }
};

module.exports = securityMiddleware;