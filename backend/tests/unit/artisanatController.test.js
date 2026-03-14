/**
 * Unit tests for ArtisanatController
 * NOTE: artisanatController exports a SINGLETON (new ArtisanatController()),
 * so the mock must be set up BEFORE requiring the controller.
 */

const mockArtisanatService = {
  findPublished: jest.fn(),
  search: jest.fn(),
  findWithFullDetails: jest.fn(),
  findByArtisan: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  getStats: jest.fn(),
  getArtisansByRegion: jest.fn(),
};

jest.mock('../../services/serviceContainer', () => ({
  artisanatService: mockArtisanatService,
}));

const controller = require('../../controllers/artisanatController');

describe('ArtisanatController', () => {
  let req, res;

  beforeEach(() => {
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
    };
    jest.clearAllMocks();
  });

  // =========================================================================
  // list
  // =========================================================================

  describe('list', () => {
    it('should return paginated artisanats with toCardJSON', async () => {
      const mockItems = [
        { toCardJSON: jest.fn(() => ({ id: 1, nom: 'Tapis' })) },
        { toCardJSON: jest.fn(() => ({ id: 2, nom: 'Poterie' })) },
      ];
      mockArtisanatService.findPublished.mockResolvedValue({
        data: mockItems,
        pagination: { page: 1, pages: 1, total: 2 },
      });

      await controller.list(req, res);

      expect(mockArtisanatService.findPublished).toHaveBeenCalledWith(
        expect.objectContaining({ page: expect.any(Number), limit: expect.any(Number) })
      );
      expect(mockItems[0].toCardJSON).toHaveBeenCalledWith('fr');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: [{ id: 1, nom: 'Tapis' }, { id: 2, nom: 'Poterie' }],
        })
      );
    });

    it('should handle errors', async () => {
      const error = new Error('DB error');
      error.statusCode = 500;
      mockArtisanatService.findPublished.mockRejectedValue(error);

      await controller.list(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // =========================================================================
  // getById
  // =========================================================================

  describe('getById', () => {
    it('should return artisanat detail with toDetailJSON', async () => {
      req.params.id = '5';
      const mockItem = {
        toDetailJSON: jest.fn(() => ({ id: 5, nom: 'Tapis', description: 'A rug' })),
      };
      mockArtisanatService.findWithFullDetails.mockResolvedValue(mockItem);

      await controller.getById(req, res);

      expect(mockArtisanatService.findWithFullDetails).toHaveBeenCalledWith(5);
      expect(mockItem.toDetailJSON).toHaveBeenCalledWith('fr');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { id: 5, nom: 'Tapis', description: 'A rug' },
      });
    });

    it('should handle not found errors', async () => {
      req.params.id = '999';
      const error = new Error('Not found');
      error.statusCode = 404;
      mockArtisanatService.findWithFullDetails.mockRejectedValue(error);

      await controller.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // =========================================================================
  // create
  // =========================================================================

  describe('create', () => {
    it('should create artisanat and return 201', async () => {
      req.body = { nom: 'Bijou', materiau: 1 };
      const mockItem = {
        toDetailJSON: jest.fn(() => ({ id: 10, nom: 'Bijou' })),
      };
      mockArtisanatService.create.mockResolvedValue(mockItem);

      await controller.create(req, res);

      expect(mockArtisanatService.create).toHaveBeenCalledWith(req.body, 1);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  // =========================================================================
  // getStats
  // =========================================================================

  describe('getStats', () => {
    it('should return stats', async () => {
      const mockStats = { total: 50, byCategory: {} };
      mockArtisanatService.getStats.mockResolvedValue(mockStats);

      await controller.getStats(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats,
      });
    });
  });
});
