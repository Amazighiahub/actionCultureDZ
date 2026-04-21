/**
 * backend/utils/jwtHelper.js
 *
 * Helper central de signature/verification JWT.
 *
 * Ajoute `jti` (UUID v4), `issuer` et `audience` a tous les tokens emis,
 * et verifie ces champs a la lecture. Centralise aussi la config afin que
 * userService, authMiddleware et le bridge Socket.IO utilisent exactement
 * les memes options (algorithms, expiresIn, iss, aud).
 *
 * La blacklist est indexee par `jti` (cles Redis courtes) : voir
 * buildBlacklistKey() et readJti() pour la compat retrocompatible avec les
 * anciens tokens emis sans jti (cles par token complet).
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET;
// Harmonisation JWT_EXPIRATION (legacy) / JWT_EXPIRES_IN (docs/adapter).
// Le premier defini gagne ; si aucun, fallback 1h.
const JWT_EXPIRATION = process.env.JWT_EXPIRATION
  || process.env.JWT_EXPIRES_IN
  || '1h';
const JWT_ISSUER = process.env.JWT_ISSUER || 'eventculture-api';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'eventculture-web';
const JWT_ALGORITHM = 'HS256';

// Par defaut : fail-open en dev (facilite le dev quand Redis n'est pas la),
// fail-closed en prod (exigence audit §4.2.1). On peut forcer via env.
const envFlag = process.env.JWT_BLACKLIST_FAIL_CLOSED;
const JWT_BLACKLIST_FAIL_CLOSED = envFlag === undefined
  ? process.env.NODE_ENV === 'production'
  : envFlag === 'true';

function ensureSecret() {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET must be configured. Set it in your .env file.');
  }
}

/**
 * Signe un access token.
 *
 * @param {Object} payload  - claims metier (userId, email, typeUser, pwdAt...)
 * @param {Object} [opts]
 * @param {string} [opts.expiresIn]  - override ponctuel de la duree
 * @param {string} [opts.subject]    - sub JWT (souvent userId en string)
 * @returns {{ token: string, jti: string, expiresIn: string }}
 */
function signAccessToken(payload, opts = {}) {
  ensureSecret();
  const jti = crypto.randomUUID();
  const signOptions = {
    algorithm: JWT_ALGORITHM,
    expiresIn: opts.expiresIn || JWT_EXPIRATION,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    jwtid: jti,
  };
  if (opts.subject) signOptions.subject = String(opts.subject);
  const token = jwt.sign(payload, JWT_SECRET, signOptions);
  return { token, jti, expiresIn: signOptions.expiresIn };
}

/**
 * Verifie un access token.
 *
 * En periode de transition, un ancien token sans iss/aud doit continuer a
 * fonctionner (sinon on invalide toutes les sessions deja actives au deploy).
 * On autorise donc un mode soft : si la verif stricte echoue avec
 * "jwt issuer invalid" ou "jwt audience invalid", on retente sans iss/aud.
 * Ce mode est controle par JWT_VERIFY_STRICT (defaut false pendant la
 * transition ; passer a true apres quelques heures pour durcir).
 *
 * @param {string} token
 * @returns {Object|null}  payload decode, ou null si invalide
 */
function verifyAccessToken(token) {
  ensureSecret();
  try {
    return jwt.verify(token, JWT_SECRET, {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  } catch (err) {
    const isIssAudErr = err
      && (err.message === 'jwt issuer invalid. expected: ' + JWT_ISSUER
        || err.message === 'jwt audience invalid. expected: ' + JWT_AUDIENCE
        || /jwt (issuer|audience) invalid/i.test(err.message || ''));

    const strict = process.env.JWT_VERIFY_STRICT === 'true';
    if (!strict && isIssAudErr) {
      try {
        return jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] });
      } catch (_) {
        return null;
      }
    }
    return null;
  }
}

/**
 * Extrait le jti d'un token (sans verification signature).
 * Utilise par logout pour blacklister meme si le token est expire ou
 * si le secret a tourne.
 */
function readJti(token) {
  try {
    const decoded = jwt.decode(token);
    return decoded && typeof decoded === 'object' ? (decoded.jti || null) : null;
  } catch (_) {
    return null;
  }
}

/**
 * Cle Redis de blacklist. Priorite au jti (court, stable). Retrocompat :
 * si jti absent (ancien token), on blackliste le token entier.
 *
 * @param {{ jti?: string, token?: string }} param
 * @returns {string|null}
 */
function buildBlacklistKey({ jti, token } = {}) {
  if (jti) return `jwt:blacklist:jti:${jti}`;
  if (token) return `jwt:blacklist:${token}`;
  return null;
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  readJti,
  buildBlacklistKey,
  // Re-export config (lecture seule)
  JWT_EXPIRATION,
  JWT_ISSUER,
  JWT_AUDIENCE,
  JWT_ALGORITHM,
  JWT_BLACKLIST_FAIL_CLOSED,
};
