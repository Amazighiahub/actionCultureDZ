/**
 * Tests unitaires pour rateLimitMiddleware – AccountRateLimiter
 */

jest.mock('express-rate-limit', () => {
  return jest.fn(() => jest.fn((req, res, next) => next()));
});

jest.mock('rate-limit-redis', () => ({
  RedisStore: jest.fn()
}));

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    call: jest.fn()
  }));
});

jest.mock('express-slow-down', () => {
  return jest.fn(() => jest.fn((req, res, next) => next()));
});

describe('AccountRateLimiter', () => {
  let AccountRateLimiter;
  let limiter;

  beforeEach(() => {
    jest.isolateModules(() => {
      const mod = require('../../middlewares/rateLimitMiddleware');
      AccountRateLimiter = mod.accountRateLimiter.constructor;
    });

    limiter = new AccountRateLimiter({
      maxAttempts: 3,
      lockoutDuration: 1000,
      cleanupInterval: 60000
    });
  });

  afterEach(() => {
    limiter.localStore.clear();
  });

  // =========================================================================
  // checkAccountLock – not locked
  // =========================================================================
  describe('checkAccountLock', () => {
    it('should allow login when account is not locked', (done) => {
      const req = {
        body: { email: 'user@test.com' },
        t: jest.fn((key) => `translated:${key}`)
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      limiter.checkAccountLock(req, res, (err) => {
        expect(err).toBeUndefined();
        expect(res.status).not.toHaveBeenCalled();
        done();
      });
    });

    it('should call next when no email is provided', (done) => {
      const req = { body: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      limiter.checkAccountLock(req, res, () => {
        expect(res.status).not.toHaveBeenCalled();
        done();
      });
    });

    it('should return 429 when account is locked', async () => {
      const email = 'locked@test.com';

      for (let i = 0; i < 3; i++) {
        await limiter.recordFailedAttempt(email);
      }

      const req = {
        body: { email },
        t: jest.fn((key) => `translated:${key}`)
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await new Promise((resolve) => {
        limiter.checkAccountLock(req, res, next);
        setTimeout(resolve, 50);
      });

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'ACCOUNT_LOCKED'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should be case insensitive for email', async () => {
      for (let i = 0; i < 3; i++) {
        await limiter.recordFailedAttempt('USER@TEST.COM');
      }

      const req = {
        body: { email: 'user@test.com' },
        t: jest.fn((key) => `translated:${key}`)
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await new Promise((resolve) => {
        limiter.checkAccountLock(req, res, next);
        setTimeout(resolve, 50);
      });

      expect(res.status).toHaveBeenCalledWith(429);
    });
  });

  // =========================================================================
  // recordFailedAttempt
  // =========================================================================
  describe('recordFailedAttempt', () => {
    it('should increment attempt count', async () => {
      await limiter.recordFailedAttempt('test@test.com');
      const status = await limiter.getAttemptStatus('test@test.com');

      expect(status.count).toBe(1);
      expect(status.lockoutUntil).toBe(0);
    });

    it('should lock after maxAttempts failures', async () => {
      for (let i = 0; i < 3; i++) {
        await limiter.recordFailedAttempt('test@test.com');
      }

      const status = await limiter.getAttemptStatus('test@test.com');

      expect(status.count).toBe(3);
      expect(status.lockoutUntil).toBeGreaterThan(Date.now() - 100);
    });

    it('should not lock before reaching maxAttempts', async () => {
      await limiter.recordFailedAttempt('test@test.com');
      await limiter.recordFailedAttempt('test@test.com');

      const status = await limiter.getAttemptStatus('test@test.com');

      expect(status.count).toBe(2);
      expect(status.lockoutUntil).toBe(0);
    });

    it('should handle null email gracefully', async () => {
      const result = await limiter.recordFailedAttempt(null);
      expect(result).toBeUndefined();
    });
  });

  // =========================================================================
  // resetAttempts
  // =========================================================================
  describe('resetAttempts', () => {
    it('should clear attempts after successful login', async () => {
      await limiter.recordFailedAttempt('test@test.com');
      await limiter.recordFailedAttempt('test@test.com');

      await limiter.resetAttempts('test@test.com');

      const status = await limiter.getAttemptStatus('test@test.com');
      expect(status).toBeNull();
    });

    it('should clear attempts even when account was locked', async () => {
      for (let i = 0; i < 3; i++) {
        await limiter.recordFailedAttempt('test@test.com');
      }

      await limiter.resetAttempts('test@test.com');

      const status = await limiter.getAttemptStatus('test@test.com');
      expect(status).toBeNull();
    });

    it('should handle null email gracefully', async () => {
      await expect(limiter.resetAttempts(null)).resolves.toBeUndefined();
    });
  });

  // =========================================================================
  // Unlock after timeout
  // =========================================================================
  describe('unlock after timeout', () => {
    it('should allow login after lockout duration expires', async () => {
      const shortLimiter = new AccountRateLimiter({
        maxAttempts: 2,
        lockoutDuration: 100,
        cleanupInterval: 60000
      });

      await shortLimiter.recordFailedAttempt('timeout@test.com');
      await shortLimiter.recordFailedAttempt('timeout@test.com');

      const statusBefore = await shortLimiter.getAttemptStatus('timeout@test.com');
      expect(statusBefore.lockoutUntil).toBeGreaterThan(0);

      await new Promise((resolve) => setTimeout(resolve, 150));

      const req = {
        body: { email: 'timeout@test.com' },
        t: jest.fn((key) => `translated:${key}`)
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await new Promise((resolve) => {
        shortLimiter.checkAccountLock(req, res, () => {
          next();
          resolve();
        });
        setTimeout(resolve, 200);
      });

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // getAttemptStatus
  // =========================================================================
  describe('getAttemptStatus', () => {
    it('should return null for unknown email', async () => {
      const status = await limiter.getAttemptStatus('unknown@test.com');
      expect(status).toBeNull();
    });

    it('should return attempt data for known email', async () => {
      await limiter.recordFailedAttempt('known@test.com');

      const status = await limiter.getAttemptStatus('known@test.com');

      expect(status).toEqual(
        expect.objectContaining({
          count: 1,
          lastAttempt: expect.any(Number)
        })
      );
    });

    it('should return null for null email', async () => {
      const status = await limiter.getAttemptStatus(null);
      expect(status).toBeNull();
    });
  });

  // =========================================================================
  // Module exports
  // =========================================================================
  describe('module exports', () => {
    it('should export all expected rate limiters', () => {
      let mod;
      jest.isolateModules(() => {
        mod = require('../../middlewares/rateLimitMiddleware');
      });

      expect(mod.globalLimiter).toBeDefined();
      expect(mod.strictLimiter).toBeDefined();
      expect(mod.createContentLimiter).toBeDefined();
      expect(mod.accountRateLimiter).toBeDefined();
      expect(mod.endpointLimiters).toBeDefined();
      expect(mod.endpointLimiters.login).toBeDefined();
      expect(mod.endpointLimiters.register).toBeDefined();
      expect(mod.endpointLimiters.forgotPassword).toBeDefined();
    });

    it('should export convenience arrays for app.js', () => {
      let mod;
      jest.isolateModules(() => {
        mod = require('../../middlewares/rateLimitMiddleware');
      });

      expect(Array.isArray(mod.auth)).toBe(true);
      expect(Array.isArray(mod.creation)).toBe(true);
      expect(Array.isArray(mod.sensitiveActions)).toBe(true);
      expect(Array.isArray(mod.general)).toBe(true);
    });
  });
});
