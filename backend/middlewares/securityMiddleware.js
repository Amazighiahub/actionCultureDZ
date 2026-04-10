// securityMiddleware.js - Version améliorée
const logger = require('../utils/logger');

const securityMiddleware = {
  sanitizeInput: (req, res, next) => {
    // Configuration des patterns d'URLs autorisées
    const URL_PATTERNS = {
      uploads: /^\/uploads\/(images|documents|videos|audio)\/[\w\-]+\.(jpg|jpeg|png|gif|webp|pdf|doc|docx|mp4|mp3|wav)$/i,
      external: /^https?:\/\/([\w\-]+\.)+[\w\-]+(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/
    };

    // Champs à exclure de la sanitisation
    const EXCLUDED_FIELDS = [
      'photo_url',
      'image_url',
      'avatar_url',
      'file_url',
      'document_url',
      'video_url',
      'thumbnail_url',
      'cover_url'
    ];

    // Vérifier si c'est une URL valide et sûre
    const isValidUrl = (str) => {
      // Vérifier les tentatives de path traversal
      if (str.includes('..') || str.includes('//')) {
        return false;
      }
      
      // Vérifier contre les patterns autorisés
      return URL_PATTERNS.uploads.test(str) || 
             (process.env.ALLOW_EXTERNAL_URLS === 'true' && URL_PATTERNS.external.test(str));
    };

    // Décoder les entités HTML communes pour détecter les attaques encodées
    // Ex: &lt;script&gt; → <script> qui sera ensuite supprimé
    const decodeHtmlEntities = (str) => {
      return str
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#x27;|&apos;/gi, "'")
        .replace(/&#x2F;|&#47;/gi, '/')
        .replace(/&#x3C;|&#60;/gi, '<')
        .replace(/&#x3E;|&#62;/gi, '>')
        .replace(/&amp;/gi, '&'); // En dernier pour éviter le double-décodage
    };

    // Sanitiser une chaîne en préservant certains contenus
    const sanitizeString = (str, fieldName = '') => {
      if (typeof str !== 'string') return str;

      // Ne pas sanitiser les champs exclus avec des URLs valides
      if (EXCLUDED_FIELDS.includes(fieldName) && isValidUrl(str)) {
        return str.trim();
      }

      // Defense in depth : décoder les entités HTML AVANT le regex
      // Ainsi &lt;script&gt;alert(1)&lt;/script&gt; devient <script>alert(1)</script>
      // qui sera supprimé par le regex ci-dessous
      let decoded = decodeHtmlEntities(str);
      // Double-décoder au cas où l'attaquant aurait double-encodé
      decoded = decodeHtmlEntities(decoded);

      // Sanitisation standard
      // Utiliser [\s\S]*? au lieu de .*? pour matcher aussi les retours à la ligne
      // (le flag 's' n'est pas universellement supporté, [\s\S] est plus sûr)
      return decoded
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Supprimer les scripts (multi-ligne)
        .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '') // Supprimer les iframes (multi-ligne)
        .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '') // Supprimer les objects (multi-ligne)
        .replace(/<embed[^>]*>/gi, '') // Supprimer les embeds
        .replace(/javascript:/gi, '') // Supprimer les protocole javascript:
        .replace(/data:text\/html/gi, '') // Supprimer data: HTML
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Supprimer les event handlers (avec quotes)
        .replace(/on\w+\s*=\s*[^\s>]+/gi, '') // Event handlers sans quotes (onclick=foo)
        .replace(/<[\/\!]*?[^<>]*?>/gi, '') // Supprimer tous les autres tags HTML
        .trim();
    };

    // Sanitiser un objet récursivement
    const sanitizeObject = (obj, parentKey = '') => {
      for (const key in obj) {
        const fullKey = parentKey ? `${parentKey}.${key}` : key;
        
        if (obj[key] === null || obj[key] === undefined) {
          continue;
        }
        
        if (typeof obj[key] === 'string') {
          obj[key] = sanitizeString(obj[key], key);
        } else if (Array.isArray(obj[key])) {
          obj[key] = obj[key].map((item, index) => {
            if (typeof item === 'string') {
              return sanitizeString(item, `${key}[${index}]`);
            } else if (typeof item === 'object' && item !== null) {
              sanitizeObject(item, `${key}[${index}]`);
              return item;
            }
            return item;
          });
        } else if (typeof obj[key] === 'object') {
          sanitizeObject(obj[key], fullKey);
        }
      }
    };

    // Logger les tentatives suspectes (en développement)
    const logSuspiciousActivity = (location, original, sanitized) => {
      if (process.env.NODE_ENV === 'development' && original !== sanitized) {
        logger.warn(`Contenu suspect détecté dans ${location}`, {
          original: original.substring(0, 100),
          sanitized: sanitized.substring(0, 100)
        });
      }
    };

    // Sanitiser les différentes parties de la requête
    try {
      if (req.body) {
        const bodyBefore = JSON.stringify(req.body);
        sanitizeObject(req.body);
        const bodyAfter = JSON.stringify(req.body);
        if (bodyBefore !== bodyAfter) {
          logSuspiciousActivity('body', bodyBefore, bodyAfter);
        }
      }
      
      if (req.query) {
        const queryBefore = JSON.stringify(req.query);
        sanitizeObject(req.query);
        const queryAfter = JSON.stringify(req.query);
        if (queryBefore !== queryAfter) {
          logSuspiciousActivity('query', queryBefore, queryAfter);
        }
      }
      
      if (req.params) {
        const paramsBefore = JSON.stringify(req.params);
        sanitizeObject(req.params);
        const paramsAfter = JSON.stringify(req.params);
        if (paramsBefore !== paramsAfter) {
          logSuspiciousActivity('params', paramsBefore, paramsAfter);
        }
      }
      
      next();
    } catch (error) {
      logger.error('Erreur dans le middleware de sécurité:', error.message);
      // En cas d'erreur, on continue mais on log
      next();
    }
  }
  // Note: La validation des uploads est gérée par FileValidator.uploadValidator (utils/fileValidator.js)
  // qui vérifie les magic bytes, la taille configurable, et nettoie les fichiers invalides.
  // Les headers de sécurité (CSP, HSTS, X-Frame-Options, etc.) sont gérés
  // exclusivement par Helmet dans app.js. Ne pas ajouter de doublon ici.
};

module.exports = securityMiddleware;