const cacheMiddleware = require('../../middlewares/cacheMiddleware');

describe('cacheMiddleware', () => {
  describe('conditionalCache', () => {
    let req, res, next;

    beforeEach(() => {
      // Clear internal cache between tests
      cacheMiddleware.clearCache('all');

      req = {
        method: 'GET',
        originalUrl: '/api/test',
        url: '/api/test'
      };
      res = {
        statusCode: 200,
        json: jest.fn()
      };
      next = jest.fn();
    });

    it('skips non-GET requests', () => {
      req.method = 'POST';
      const middleware = cacheMiddleware.conditionalCache(300);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('calls next() on cache miss', async () => {
      const middleware = cacheMiddleware.conditionalCache(300);
      middleware(req, res, next);

      // Give async store.get time to resolve
      await new Promise(r => setTimeout(r, 10));

      expect(next).toHaveBeenCalled();
    });

    it('caches successful responses and returns on second request', async () => {
      const middleware = cacheMiddleware.conditionalCache(300);

      // First request - cache miss
      middleware(req, res, next);
      await new Promise(r => setTimeout(r, 10));

      // Simulate controller sending response (this triggers the intercepted res.json)
      res.json({ success: true, data: 'test-data' });

      // Wait for async cache write
      await new Promise(r => setTimeout(r, 50));

      // Second request - should hit cache
      const res2 = { statusCode: 200, json: jest.fn() };
      const next2 = jest.fn();
      middleware(req, res2, next2);

      await new Promise(r => setTimeout(r, 50));

      // Should return cached data without calling next
      expect(res2.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: 'test-data' })
      );
    });
  });

  describe('userCache', () => {
    it('skips if no user on request', () => {
      const middleware = cacheMiddleware.userCache(300);
      const req = { method: 'GET', originalUrl: '/test' };
      const res = { json: jest.fn() };
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('skips non-GET requests', () => {
      const middleware = cacheMiddleware.userCache(300);
      const req = { method: 'POST', user: { id_user: 1 }, originalUrl: '/test' };
      const res = { json: jest.fn() };
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('invalidateOnChange', () => {
    it('returns a middleware function', () => {
      const middleware = cacheMiddleware.invalidateOnChange('oeuvres');
      expect(typeof middleware).toBe('function');
    });
  });

  describe('getStats', () => {
    it('returns cache statistics', () => {
      const stats = cacheMiddleware.getStats();

      expect(stats).toHaveProperty('backend');
      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('validEntries');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('redisConnected');
      expect(typeof stats.totalEntries).toBe('number');
    });
  });

  describe('cacheStrategy', () => {
    it('provides pre-configured cache strategies', () => {
      expect(cacheMiddleware.cacheStrategy).toBeDefined();
      expect(typeof cacheMiddleware.cacheStrategy.short).toBe('function');
      expect(typeof cacheMiddleware.cacheStrategy.medium).toBe('function');
      expect(typeof cacheMiddleware.cacheStrategy.long).toBe('function');
      expect(typeof cacheMiddleware.cacheStrategy.veryLong).toBe('function');
      expect(typeof cacheMiddleware.cacheStrategy.metadata).toBe('function');
    });
  });

  describe('clearCache', () => {
    it('clears all cache without error', () => {
      expect(() => cacheMiddleware.clearCache('all')).not.toThrow();
    });

    it('clears specific pattern without error', () => {
      expect(() => cacheMiddleware.clearCache('users')).not.toThrow();
    });
  });
});
