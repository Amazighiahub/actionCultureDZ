/**
 * Tests unitaires pour DashboardStatsService
 */

const DashboardStatsService = require('../../services/dashboard/statsService');

describe('DashboardStatsService', () => {
  let service;
  let mockModels;

  beforeEach(() => {
    mockModels = {
      User: { count: jest.fn().mockResolvedValue(100), findAll: jest.fn().mockResolvedValue([]) },
      Oeuvre: { count: jest.fn().mockResolvedValue(50), findAll: jest.fn().mockResolvedValue([]) },
      Evenement: { count: jest.fn().mockResolvedValue(20), findAll: jest.fn().mockResolvedValue([]) },
      Artisanat: { count: jest.fn().mockResolvedValue(10) },
      Signalement: { count: jest.fn().mockResolvedValue(5) },
      Lieu: { count: jest.fn().mockResolvedValue(30), findAll: jest.fn().mockResolvedValue([]) },
      Vue: { count: jest.fn().mockResolvedValue(200) },
      Commentaire: { findAll: jest.fn().mockResolvedValue([]) },
      Favori: {},
      Parcours: { count: jest.fn().mockResolvedValue(8) },
      sequelize: { fn: jest.fn(), col: jest.fn() }
    };

    service = new DashboardStatsService(mockModels);
  });

  // =========================================================================
  // generateOverviewStats
  // =========================================================================
  describe('generateOverviewStats', () => {
    it('should aggregate stats from all models', async () => {
      const result = await service.generateOverviewStats();

      expect(result.users).toBeDefined();
      expect(result.users.total).toBe(100);
      expect(result.content).toBeDefined();
      expect(result.content.oeuvres).toBe(50);
      expect(result.content.evenements).toBe(20);
      expect(result.content.artisanats).toBe(10);
      expect(result.moderation).toBeDefined();
      expect(result.patrimoine).toBeDefined();
    });

    it('should handle missing optional models', async () => {
      delete mockModels.Artisanat;
      delete mockModels.Signalement;
      delete mockModels.Lieu;
      delete mockModels.Vue;

      const result = await service.generateOverviewStats();

      expect(result.content.artisanats).toBe(0);
      expect(result.moderation.signalementsEnAttente).toBe(0);
      expect(result.patrimoine.sites).toBe(0);
      expect(result.engagement.vuesAujourdhui).toBe(0);
    });
  });

  // =========================================================================
  // getCached
  // =========================================================================
  describe('getCached', () => {
    it('should call generator on cache miss', async () => {
      const generator = jest.fn().mockResolvedValue('data');

      const result = await service.getCached('key1', generator, 300);

      expect(generator).toHaveBeenCalledTimes(1);
      expect(result).toBe('data');
    });

    it('should return cached value on cache hit', async () => {
      const generator = jest.fn().mockResolvedValue('data');

      await service.getCached('key1', generator, 300);
      const result = await service.getCached('key1', generator, 300);

      expect(generator).toHaveBeenCalledTimes(1);
      expect(result).toBe('data');
    });

    it('should fallback to generator on error', async () => {
      // Force cache.get to throw
      service.cache.get = jest.fn(() => { throw new Error('cache broken'); });
      const generator = jest.fn().mockResolvedValue('fallback');

      const result = await service.getCached('key1', generator, 300);

      expect(result).toBe('fallback');
    });
  });

  // =========================================================================
  // clearCache
  // =========================================================================
  describe('clearCache', () => {
    it('should clear all entries without pattern', async () => {
      await service.getCached('stats:a', () => 'a', 300);
      await service.getCached('stats:b', () => 'b', 300);

      service.clearCache();
      expect(service.cache.size).toBe(0);
    });

    it('should clear only matching entries with pattern', async () => {
      await service.getCached('stats:users', () => 'u', 300);
      await service.getCached('stats:oeuvres', () => 'o', 300);
      await service.getCached('other:key', () => 'x', 300);

      service.clearCache('stats:');
      expect(service.cache.size).toBe(1);
    });
  });

  // =========================================================================
  // getPendingValidationsCount
  // =========================================================================
  describe('getPendingValidationsCount', () => {
    it('should return pending users and oeuvres counts', async () => {
      mockModels.User.count.mockResolvedValue(7);
      mockModels.Oeuvre.count.mockResolvedValue(3);

      const result = await service.getPendingValidationsCount();

      expect(result.users).toBe(7);
      expect(result.oeuvres).toBe(3);
      expect(result.total).toBe(10);
    });
  });

  // =========================================================================
  // getDateLimit
  // =========================================================================
  describe('getDateLimit', () => {
    it('should return a Date for each period', () => {
      for (const period of ['day', 'week', 'month', 'year']) {
        const result = service.getDateLimit(period);
        expect(result).toBeInstanceOf(Date);
      }
    });

    it('should default to month for unknown period', () => {
      const result = service.getDateLimit('unknown');
      expect(result).toBeInstanceOf(Date);
    });
  });
});
