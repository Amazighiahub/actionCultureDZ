/**
 * AuthCookieService
 *
 * Centralise toute la manipulation des cookies d'authentification
 * (access_token + refresh_token) et le parsing des durees JWT.
 *
 * Extrait des helpers prives de userController pour :
 *  - eliminer la duplication entre AuthController / refresh / logout / delete
 *  - garantir que la config cookie (httpOnly, secure, sameSite, path, maxAge)
 *    reste unique et auditable en un seul endroit.
 *
 * Convention d'expiration :
 *   JWT_EXPIRATION prime sur JWT_EXPIRES_IN (cf. jwtHelper).
 *   Fallback : 1h.
 *
 * Refresh token :
 *   TTL fixe cote cookie : 7 jours.
 *   Path scopa a /api/users/refresh-token pour limiter l'exposition.
 */

const UNIT_TO_MS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
const DEFAULT_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const REFRESH_COOKIE_PATH = '/api/users/refresh-token';
const ACCESS_COOKIE_PATH = '/';

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

/**
 * Parse une duree style JWT ('15m', '1h', '7d', '30s') en millisecondes.
 * @param {string|number} exp
 * @returns {number} ms
 */
function parseExpToMs(exp) {
  const match = String(exp).match(/^(\d+)\s*(s|m|h|d)$/i);
  if (!match) return DEFAULT_MAX_AGE_MS;
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  return value * (UNIT_TO_MS[unit] || UNIT_TO_MS.m);
}

/**
 * Retourne la duree d'expiration courante du JWT en secondes.
 * Utile pour exposer expiresIn au client sans divulguer le secret.
 * @returns {number} secondes
 */
function getTokenExpirySeconds() {
  const jwtExp = process.env.JWT_EXPIRATION || process.env.JWT_EXPIRES_IN || '1h';
  return Math.floor(parseExpToMs(jwtExp) / 1000);
}

/**
 * Pose le cookie access_token aligne sur l'expiration JWT courante.
 * @param {import('express').Response} res
 * @param {string} token
 */
function setAccessTokenCookie(res, token) {
  const jwtExp = process.env.JWT_EXPIRATION || process.env.JWT_EXPIRES_IN || '1h';
  res.cookie('access_token', token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    maxAge: parseExpToMs(jwtExp),
    path: ACCESS_COOKIE_PATH
  });
}

/**
 * Pose le cookie refresh_token scopa au endpoint de refresh uniquement.
 * @param {import('express').Response} res
 * @param {string} refreshToken
 */
function setRefreshTokenCookie(res, refreshToken) {
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_COOKIE_MAX_AGE_MS
  });
}

/**
 * Pose access + refresh en une seule operation (pratique courante :
 * register / login / refresh).
 * @param {import('express').Response} res
 * @param {{ token: string, refreshToken: string }} tokens
 */
function setAuthCookies(res, { token, refreshToken }) {
  setAccessTokenCookie(res, token);
  setRefreshTokenCookie(res, refreshToken);
}

/**
 * Efface les deux cookies d'authentification, avec les bons paths
 * (sinon le navigateur ne supprime pas le cookie).
 * @param {import('express').Response} res
 */
function clearAuthCookies(res) {
  res.clearCookie('access_token', { path: ACCESS_COOKIE_PATH });
  res.clearCookie('refresh_token', { path: REFRESH_COOKIE_PATH });
}

module.exports = {
  parseExpToMs,
  getTokenExpirySeconds,
  setAccessTokenCookie,
  setRefreshTokenCookie,
  setAuthCookies,
  clearAuthCookies,
  ACCESS_COOKIE_PATH,
  REFRESH_COOKIE_PATH,
  REFRESH_COOKIE_MAX_AGE_MS
};
