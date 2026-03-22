/**
 * Unit tests for DashboardController
 * DashboardController uses mixin methods that access container.statsService
 * and container.analyticsService directly.
 */

const mockStatsService = {
  generateOverviewStats: jest.fn(),
  generateDetailedStats: jest.fn(),
  generatePatrimoineStats: jest.fn(),
  generateQRStats: jest.fn(),
};

const mockAnalyticsService = {
  generateAdvancedAnalytics: jest.fn(),
  getAuditLogs: jest.fn(),
  generateReport: jest.fn(),
};

jest.mock('../../services/serviceContainer', () => ({
  statsService: mockStatsService,
  analyticsService: mockAnalyticsService,
}));

jest.mock('../../constants/dashboardPermissions', () => ({
  DASHBOARD_PERMISSIONS: {},
}));

jest.mock('../../utils/LRUCache', () => {
  return class MockLRUCache {
    constructor() { this._store = new Map(); }
    get(key) { return this._store.get(key); }
    set(key, val) { this._store.set(key, val); }
    keys() { return this._store.keys(); }
    delete(key) { this._store.delete(key); }
    clear() { this._store.clear(); }
  };
});

jest.mock('date-fns', () => ({
  subDays: jest.fn(() => new Date('2026-01-01')),
  subMonths: jest.fn(() => new Date('2026-02-01')),
}));

const DashboardController = require('../../controllers/dashboardController');

describe('DashboardController', () => {
  let controller;
  let req, res;

  beforeEach(() => {
    controller = DashboardController;
    req = {
      t: jest.fn((key) => 'translated:' + key),
      lang: 'fr',
      params: {},
      query: {},
      body: {},
      user: { id_user: 1, isAdmin: true },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  // =========================================================================
  // getOverview (from analyticsMethods)
  // =========================================================================

  describe('getOverview', () => {
    it('should return overview stats', async () => {
      const mockStats = { users: 100, events: 50 };
      mockStatsService.generateOverviewStats.mockResolvedValue(mockStats);

      await controller.getOverview(req, res);

      expect(mockStatsService.generateOverviewStats).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats,
      });
    });

    it('should return 500 on error', async () => {
      mockStatsService.generateOverviewStats.mockRejectedValue(new Error('DB down'));

      await controller.getOverview(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  // =========================================================================
  // getDetailedStats (from analyticsMethods)
  // =========================================================================

  describe('getDetailedStats', () => {
    it('should return detailed stats for given period', async () => {
      req.query.period = 'week';
      const mockStats = { growth: 10 };
      mockStatsService.generateDetailedStats.mockResolvedValue(mockStats);

      await controller.getDetailedStats(req, res);

      expect(mockStatsService.generateDetailedStats).toHaveBeenCalledWith('week');
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockStats });
    });

    it('should default to month period', async () => {
      const mockStats = { growth: 5 };
      mockStatsService.generateDetailedStats.mockResolvedValue(mockStats);

      await controller.getDetailedStats(req, res);

      expect(mockStatsService.generateDetailedStats).toHaveBeenCalledWith('month');
    });
  });

  // =========================================================================
  // getAdvancedAnalytics (from analyticsMethods)
  // =========================================================================

  describe('getAdvancedAnalytics', () => {
    it('should return advanced analytics', async () => {
      req.query.period = '7';
      const mockData = { trends: [] };
      mockAnalyticsService.generateAdvancedAnalytics.mockResolvedValue(mockData);

      await controller.getAdvancedAnalytics(req, res);

      expect(mockAnalyticsService.generateAdvancedAnalytics).toHaveBeenCalledWith('7');
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockData });
    });
  });

  // =========================================================================
  // getCachedData
  // =========================================================================

  describe('getCachedData', () => {
    it('should cache data and return from cache on second call', async () => {
      const generator = jest.fn().mockResolvedValue({ value: 42 });

      const result1 = await controller.getCachedData('test-key', generator, 300);
      expect(result1).toEqual({ value: 42 });
      expect(generator).toHaveBeenCalledTimes(1);

      const result2 = await controller.getCachedData('test-key', generator, 300);
      expect(result2).toEqual({ value: 42 });
      expect(generator).toHaveBeenCalledTimes(1);
    });
  });
});
