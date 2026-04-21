/**
 * AuthController - Authentification et cycle de vie du token
 *
 * Scope :
 *   register, login, logout, refreshToken,
 *   checkEmail, verifyEmail, getTypes.
 *
 * Les cookies d'auth sont geres exclusivement via AuthCookieService.
 * La logique metier est deleguee a userService (DI container).
 * Le logout gere le blacklist cote Redis (fail-open) via jwtHelper.
 */

const BaseController = require('./baseController');
const container = require('../services/serviceContainer');
const authCookies = require('../services/auth/authCookieService');
const { accountRateLimiter } = require('../middlewares/rateLimitMiddleware');
const logger = require('../utils/logger');

// Table des types utilisateur (expose pour l'UI register).
// Garde ici pour ne pas dependre de l'ordre d'init du container.
const TYPE_USER_IDS = {
  VISITEUR: 1, ECRIVAIN: 2, JOURNALISTE: 3, SCIENTIFIQUE: 4,
  ACTEUR: 5, ARTISTE: 6, ARTISAN: 7, REALISATEUR: 8,
  MUSICIEN: 9, PHOTOGRAPHE: 10, DANSEUR: 11, SCULPTEUR: 12, AUTRE: 13
};

class AuthController extends BaseController {
  get userService() {
    return container.userService;
  }

  _translateUser(userDTO, lang = 'fr') {
    if (!userDTO) return null;
    return userDTO.toJSON(lang);
  }

  // ============================================================================
  // INSCRIPTION
  // ============================================================================

  async register(req, res) {
    try {
      const result = await this.userService.register(req.body, req.ip);

      authCookies.setAuthCookies(res, {
        token: result.token,
        refreshToken: result.refreshToken
      });

      res.status(201).json({
        success: true,
        message: req.t('auth.registerSuccess'),
        data: {
          user: this._translateUser(result.user, req.lang),
          expiresIn: authCookies.getTokenExpirySeconds()
        }
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // LOGIN
  // ============================================================================

  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: req.t('auth.emailPasswordRequired')
        });
      }

      const result = await this.userService.login(email, password);

      await accountRateLimiter.resetAttempts(email);

      authCookies.setAuthCookies(res, {
        token: result.token,
        refreshToken: result.refreshToken
      });

      res.json({
        success: true,
        message: req.t('auth.loginSuccess'),
        data: {
          user: this._translateUser(result.user, req.lang),
          expiresIn: authCookies.getTokenExpirySeconds()
        }
      });
    } catch (error) {
      if (req.body?.email) {
        try {
          await accountRateLimiter.recordFailedAttempt(req.body.email);
        } catch (limiterError) {
          // Ne masque jamais l'erreur d'origine si le limiter echoue.
          logger.warn('accountRateLimiter.recordFailedAttempt failed', {
            error: limiterError.message
          });
        }
      }
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // LOGOUT
  // ============================================================================

  async logout(req, res) {
    // 1) Revocation refresh token + invalidation cache session (best-effort).
    try {
      if (req.user?.id_user) {
        await this.userService.revokeRefreshToken(req.user.id_user);
        const authMw = require('../middlewares/authMiddleware')(require('../models'));
        await authMw.invalidateUserCache(req.user.id_user).catch(() => {});
      }
    } catch (_) {
      // Best-effort : on continue meme si revoke/invalidate echoue.
    }

    // 2) Blacklist access token (clef = jti si present, sinon token entier
    // pour retro-compat avec les anciennes sessions en vol).
    try {
      const jwt = require('jsonwebtoken');
      const { getClient } = require('../utils/redisClient');
      const { buildBlacklistKey } = require('../utils/jwtHelper');

      const token = req.cookies?.access_token
        || (req.headers.authorization?.startsWith('Bearer ')
          ? req.headers.authorization.substring(7)
          : null);

      if (token) {
        const decoded = jwt.decode(token);
        if (decoded?.exp) {
          const ttl = decoded.exp - Math.floor(Date.now() / 1000);
          if (ttl > 0) {
            const redis = getClient();
            if (!redis) {
              logger.warn('logout: Redis unavailable, token not blacklisted');
            } else {
              const key = buildBlacklistKey({ jti: decoded.jti, token });
              if (key) await redis.setEx(key, ttl, '1');
            }
          }
        }
      }
    } catch (blacklistErr) {
      logger.warn('logout: best-effort blacklist failed:', blacklistErr.message);
    }

    authCookies.clearAuthCookies(res);

    res.json({
      success: true,
      message: req.t('auth.logoutSuccess')
    });
  }

  // ============================================================================
  // REFRESH TOKEN
  // ============================================================================

  async refreshToken(req, res) {
    try {
      const incomingRefreshToken = req.cookies?.refresh_token || req.body.refreshToken;

      const result = await this.userService.refreshToken(incomingRefreshToken);

      authCookies.setAuthCookies(res, {
        token: result.token,
        refreshToken: result.refreshToken
      });

      res.json({
        success: true,
        data: {
          user: this._translateUser(result.user, req.lang),
          expiresIn: authCookies.getTokenExpirySeconds()
        }
      });
    } catch (error) {
      authCookies.clearAuthCookies(res);
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // VERIFS EMAIL / METADATA INSCRIPTION
  // ============================================================================

  async checkEmail(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({
          success: false,
          error: req.t('auth.emailPasswordRequired')
        });
      }
      const exists = await this.userService.checkEmailExists(email);
      res.json({ success: true, available: !exists });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async verifyEmail(req, res) {
    try {
      const result = await this.userService.verifyEmail(req.params.token);
      res.json({
        success: true,
        message: req.t('email.verified'),
        data: result
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getTypes(req, res) {
    const types = Object.entries(TYPE_USER_IDS).map(([key, value]) => ({
      id: value,
      key: key.toLowerCase(),
      label: key.charAt(0) + key.slice(1).toLowerCase().replace('_', ' ')
    }));
    res.json({ success: true, data: types });
  }
}

module.exports = new AuthController();
