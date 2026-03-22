/**
 * Unit tests for ProfessionnelController
 */

const mockProfessionnelService = {
  getAllProfessionnels: jest.fn(),
  getProfessionnelById: jest.fn(),
  searchProfessionnels: jest.fn(),
  getMyProfile: jest.fn(),
  updateMyProfile: jest.fn(),
  updateProfessionalProfile: jest.fn(),
  getMesOeuvres: jest.fn(),
  getMyOeuvres: jest.fn(),
  getMyArtisanats: jest.fn(),
  getMesEvenements: jest.fn(),
  getMyEvenements: jest.fn(),
  getEventCalendar: jest.fn(),
  getMesStatistiques: jest.fn(),
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
  // getAllProfessionnels
  // =========================================================================

  describe('getAllProfessionnels', () => {
    it('should return paginated professionnels', async () => {
      const mockResult = {
        data: [{ id: 1, nom: 'Artiste' }],
        pagination: { page: 1, pages: 1, total: 1 },
      };
      mockProfessionnelService.getAllProfessionnels.mockResolvedValue(mockResult);

      await controller.getAllProfessionnels(req, res);

      expect(mockProfessionnelService.getAllProfessionnels).toHaveBeenCalledWith(
        expect.objectContaining({ page: expect.any(Number), limit: expect.any(Number), lang: 'fr' })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should handle errors', async () => {
      const error = new Error('DB error');
      error.statusCode = 500;
      mockProfessionnelService.getAllProfessionnels.mockRejectedValue(error);

      await controller.getAllProfessionnels(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // =========================================================================
  // getProfessionnelById
  // =========================================================================

  describe('getProfessionnelById', () => {
    it('should return a professionnel by id', async () => {
      req.params.id = '5';
      const mockProf = { id: 5, nom: 'Artisan' };
      mockProfessionnelService.getProfessionnelById.mockResolvedValue(mockProf);

      await controller.getProfessionnelById(req, res);

      expect(mockProfessionnelService.getProfessionnelById).toHaveBeenCalledWith('5');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: mockProf })
      );
    });

    it('should return 404 when not found', async () => {
      req.params.id = '999';
      mockProfessionnelService.getProfessionnelById.mockResolvedValue(null);

      await controller.getProfessionnelById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // =========================================================================
  // getMyProfile
  // =========================================================================

  describe('getMyProfile', () => {
    it('should return the user profile', async () => {
      const mockProfile = { id: 1, nom: 'Test' };
      mockProfessionnelService.getMyProfile.mockResolvedValue(mockProfile);

      await controller.getMyProfile(req, res);

      expect(mockProfessionnelService.getMyProfile).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: mockProfile })
      );
    });
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
