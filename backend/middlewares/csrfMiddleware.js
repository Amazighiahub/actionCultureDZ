'use strict';

const crypto = require('crypto');

/**
 * CSRF Protection — Double Submit Cookie pattern
 *
 * How it works:
 * 1. On every response, the server sets a non-httpOnly cookie `csrf_token`
 *    AND sends the same value in the `X-CSRF-Token` response header.
 * 2. The frontend JS reads the token (from the header or cookie) and sends it
 *    back as the `X-CSRF-Token` request header on every mutating request.
 * 3. The server verifies that the request header matches the cookie.
 *
 * Why this works:
 * - An attacker on a different origin cannot read the cookie value (same-origin policy)
 *   so they cannot forge the header.
 * - The cookie is sent automatically by the browser, but the header is not — it must
 *   be set explicitly by JS running on the same origin.
 */

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';
const TOKEN_LENGTH = 32; // 256 bits

/**
 * Generate a cryptographically secure CSRF token
 */
function generateToken() {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
}

/**
 * Middleware that sets the CSRF token cookie + response header on every response.
 * Must be mounted AFTER cookieParser().
 */
function csrfTokenProvider(req, res, next) {
  // Reuse existing token from cookie if present, otherwise generate a new one
  let token = req.cookies?.[CSRF_COOKIE];

  if (!token) {
    token = generateToken();
  }

  const isProduction = process.env.NODE_ENV === 'production';

  // Set non-httpOnly cookie so frontend JS can read it as a fallback
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,   // JS must be able to read it
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000, // 24h — matches access_token lifetime
  });

  // Also send in response header (preferred extraction method for the frontend)
  res.setHeader('X-CSRF-Token', token);

  next();
}

/**
 * Middleware that verifies the CSRF token on mutating requests (POST, PUT, PATCH, DELETE).
 * Skips safe methods (GET, HEAD, OPTIONS).
 * Must be mounted AFTER csrfTokenProvider.
 */
function csrfVerifier(req, res, next) {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];

  if (safeMethods.includes(req.method)) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER];

  if (!cookieToken || !headerToken) {
    return res.status(403).json({
      success: false,
      error: 'CSRF token missing',
      code: 'CSRF_MISSING',
    });
  }

  // Constant-time comparison to prevent timing attacks
  if (cookieToken.length !== headerToken.length ||
      !crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
    return res.status(403).json({
      success: false,
      error: 'CSRF token mismatch',
      code: 'CSRF_MISMATCH',
    });
  }

  next();
}

module.exports = { csrfTokenProvider, csrfVerifier };
