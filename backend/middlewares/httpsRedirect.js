// middlewares/httpsRedirect.js
// Middleware pour rediriger HTTP vers HTTPS en production

/**
 * Middleware de redirection HTTPS
 * - En production: redirige toutes les requêtes HTTP vers HTTPS
 * - En développement: ne fait rien (pass-through)
 */
const httpsRedirect = (req, res, next) => {
  // Ne pas rediriger en développement ou si bypass activé pour tests locaux
  if (process.env.NODE_ENV !== 'production' || process.env.SKIP_PRODUCTION_CHECKS === 'true') {
    return next();
  }

  const hostHeader = (req.headers.host || '').split(':')[0].toLowerCase();
  const isLocalhost = hostHeader === 'localhost' || hostHeader === '127.0.0.1' || hostHeader === '::1';
  if (isLocalhost) {
    return next();
  }

  // Vérifier si la requête est déjà en HTTPS
  // Note: Derrière un reverse proxy (nginx, cloudflare), vérifier X-Forwarded-Proto
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';

  if (!isSecure) {
    // Construire l'URL HTTPS
    const httpsUrl = `https://${req.headers.host}${req.url}`;

    // Redirection permanente (301) pour le SEO
    return res.redirect(301, httpsUrl);
  }

  next();
};

/**
 * Middleware HSTS (HTTP Strict Transport Security)
 * Force les navigateurs à utiliser HTTPS pendant une durée définie
 */
const hstsMiddleware = (req, res, next) => {
  // Seulement en production et si HTTPS
  if (process.env.NODE_ENV === 'production') {
    const hostHeader = (req.headers.host || '').split(':')[0].toLowerCase();
    const isLocalhost = hostHeader === 'localhost' || hostHeader === '127.0.0.1' || hostHeader === '::1';
    if (isLocalhost) {
      return next();
    }
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';

    if (isSecure) {
      // max-age: 1 an (31536000 secondes)
      // includeSubDomains: applique aussi aux sous-domaines
      // preload: permet l'inclusion dans les listes de préchargement HSTS des navigateurs
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
    }
  }

  next();
};

module.exports = {
  httpsRedirect,
  hstsMiddleware
};
