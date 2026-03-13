/**
 * Tests unitaires pour DashboardMonitoringService
 */

const DashboardMonitoringService = require('../../services/dashboard/monitoringService');

describe('DashboardMonitoringService', () => {
  let service;
  let mockModels;
  let mockUserRepo;
  let mockOeuvreRepo;
  let mockSignalementRepo;

  beforeEach(() => {
    mockUserRepo = { count: jest.fn().mockResolvedValue(0) };
    mockOeuvreRepo = { count: jest.fn().mockResolvedValue(0) };
    mockSignalementRepo = { count: jest.fn().mockResolvedValue(0) };

    mockModels = {
      PerformanceLog: null
    };

    service = new DashboardMonitoringService(mockModels, {
      user: mockUserRepo,
      oeuvre: mockOeuvreRepo,
      signalement: mockSignalementRepo
    });
  });

  describe('generateAlerts', () => {
    it('should return empty array when all thresholds are OK', async () => {
      const alerts = await service.generateAlerts();
      expect(alerts).toEqual([]);
    });

    it('should generate users alert when pending users > 0', async () => {
      mockUserRepo.count.mockResolvedValue(3);

      const alerts = await service.generateAlerts();

      const userAlert = alerts.find(a => a.category === 'users');
      expect(userAlert).toBeDefined();
      expect(userAlert.type).toBe('warning');
      expect(userAlert.priority).toBe('high');
      expect(userAlert.message).toContain('3');
    });

    it('should NOT generate oeuvres alert when count <= 10', async () => {
      mockOeuvreRepo.count.mockResolvedValue(10);

      const alerts = await service.generateAlerts();

      expect(alerts.find(a => a.category === 'content')).toBeUndefined();
    });

    it('should generate oeuvres alert when count > 10', async () => {
      mockOeuvreRepo.count.mockResolvedValue(15);

      const alerts = await service.generateAlerts();

      const contentAlert = alerts.find(a => a.category === 'content');
      expect(contentAlert).toBeDefined();
      expect(contentAlert.priority).toBe('medium');
      expect(contentAlert.message).toContain('15');
    });

    it('should generate critical alert for urgent reports', async () => {
      mockSignalementRepo.count.mockResolvedValue(2);

      const alerts = await service.generateAlerts();

      const modAlert = alerts.find(a => a.category === 'moderation');
      expect(modAlert).toBeDefined();
      expect(modAlert.type).toBe('error');
      expect(modAlert.priority).toBe('critical');
    });

    it('should include timestamp on every alert', async () => {
      mockUserRepo.count.mockResolvedValue(1);
      mockSignalementRepo.count.mockResolvedValue(1);

      const alerts = await service.generateAlerts();

      alerts.forEach(alert => {
        expect(alert.timestamp).toBeInstanceOf(Date);
      });
    });

    it('should handle missing repositories gracefully', async () => {
      const bareService = new DashboardMonitoringService(mockModels, {});

      const alerts = await bareService.generateAlerts();
      // No repos → all counts default to 0 → no alerts (except disk/perf stubs)
      expect(alerts).toEqual([]);
    });
  });

  describe('checkDiskSpace', () => {
    it('should return stub values', async () => {
      const disk = await service.checkDiskSpace();
      expect(disk).toHaveProperty('percentUsed');
      expect(disk.percentUsed).toBe(50);
    });
  });

  describe('getAverageResponseTime', () => {
    it('should return 0 when PerformanceLog model is absent', async () => {
      const result = await service.getAverageResponseTime();
      expect(result).toBe(0);
    });

    it('should return avg from PerformanceLog', async () => {
      const mockFindOne = jest.fn().mockResolvedValue({ avg_time: 1500 });
      service.models.PerformanceLog = {
        findOne: mockFindOne,
        sequelize: { fn: jest.fn(), col: jest.fn() }
      };

      const result = await service.getAverageResponseTime();
      expect(result).toBe(1500);
    });

    it('should return 0 on query error', async () => {
      service.models.PerformanceLog = {
        findOne: jest.fn().mockRejectedValue(new Error('DB down')),
        sequelize: { fn: jest.fn(), col: jest.fn() }
      };

      const result = await service.getAverageResponseTime();
      expect(result).toBe(0);
    });
  });
});
