/**
 * Unit tests for ProfessionnelController
 */

const mockProfessionnelService = {
  updateProfessionalProfile: jest.fn(),
  getMyOeuvres: jest.fn(),
  getMyArtisanats: jest.fn(),
  getMyEvenements: jest.fn(),
  getEventCalendar: jest.fn(),
  getOeuvreStats: jest.fn(),
  getEvenementStats: jest.fn(),
  getAnalyticsOverview: jest.fn(),
  getDashboard: jest.fn(),
  manageParticipants: jest.fn(),
  getExportData: jest.fn(),
  getNotifications: jest.fn(),
};

jest.mock('../../services/serviceContainer', () => ({
  professionnelService: mockProfessionnelService,
}));

jest.mock('../../helpers/i18n', () => ({
  translateDeep: jest.fn((data) => data),
}));

const ProfessionnelController = require('../../controllers/professionnelController');

describe('ProfessionnelController', () => {
  let controller;
  let req, res;

  beforeEach(() => {
    controller = ProfessionnelController;
    req = {
      t: jest.fn((key) => 'translated:' + key),
      lang: 'fr',
      params: {},
      query: {},
      body: {},
      user: { id_user: 1 },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    jest.clearAllMocks();
  });

  // =========================================================================
  // getDashboard
  // =========================================================================

  describe('getDashboard', () => {
    it('should return dashboard data', async () => {
      const mockData = {
        stats: { oeuvres: 10 },
        recent: { oeuvres: [{ id: 1 }], evenements: [{ id: 2 }] },
      };
      mockProfessionnelService.getDashboard.mockResolvedValue(mockData);

      await controller.getDashboard(req, res);

      expect(mockProfessionnelService.getDashboard).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should handle errors', async () => {
      const error = new Error('Service down');
      error.statusCode = 500;
      mockProfessionnelService.getDashboard.mockRejectedValue(error);

      await controller.getDashboard(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
