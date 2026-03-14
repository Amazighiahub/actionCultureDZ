/**
 * Unit tests for FavoriController
 */

const mockFavoriService = {
  getUserFavoris: jest.fn(),
  enrichirFavoris: jest.fn(),
  checkFavori: jest.fn(),
  getUserFavorisStats: jest.fn(),
  getPopularFavorites: jest.fn(),
  addFavori: jest.fn(),
  removeFavori: jest.fn(),
  removeFavoriByEntity: jest.fn(),
};

jest.mock('../../services/serviceContainer', () => ({
  favoriService: mockFavoriService,
}));

jest.mock('../../helpers/i18n', () => ({
  translateDeep: jest.fn((data) => data),
}));

const FavoriController = require('../../controllers/favoriController');

describe('FavoriController', () => {
  let controller;
  let req, res;

  beforeEach(() => {
    controller = new FavoriController();
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
  // getUserFavoris
  // =========================================================================

  describe('getUserFavoris', () => {
    it('should return paginated favoris', async () => {
      const mockRows = [{ id: 1 }, { id: 2 }];
      const mockPagination = { total: 2, page: 1, pages: 1 };
      mockFavoriService.getUserFavoris.mockResolvedValue({
        rows: mockRows,
        pagination: mockPagination,
      });
      mockFavoriService.enrichirFavoris.mockResolvedValue(mockRows);

      await controller.getUserFavoris(req, res);

      expect(mockFavoriService.getUserFavoris).toHaveBeenCalled();
      expect(mockFavoriService.enrichirFavoris).toHaveBeenCalledWith(mockRows);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should handle errors', async () => {
      const error = new Error('DB error');
      error.statusCode = 500;
      mockFavoriService.getUserFavoris.mockRejectedValue(error);

      await controller.getUserFavoris(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // =========================================================================
  // checkFavori
  // =========================================================================

  describe('checkFavori', () => {
    it('should return isFavorite status', async () => {
      req.params = { type: 'oeuvre', id: '5' };
      mockFavoriService.checkFavori.mockResolvedValue({ isFavorite: true, favori: { id: 1 } });

      await controller.checkFavori(req, res);

      expect(mockFavoriService.checkFavori).toHaveBeenCalledWith(1, 'oeuvre', '5');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { isFavorite: true, favori: { id: 1 } },
      });
    });
  });

  // =========================================================================
  // addFavori
  // =========================================================================

  describe('addFavori', () => {
    it('should create a favori and return 201', async () => {
      req.body = { type_entite: 'oeuvre', id_entite: 5 };
      mockFavoriService.addFavori.mockResolvedValue({
        favori: { id: 10 },
        entite: { nom: 'Test' },
      });

      await controller.addFavori(req, res);

      expect(mockFavoriService.addFavori).toHaveBeenCalledWith(1, 'oeuvre', 5);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 409 for duplicate favori', async () => {
      req.body = { type_entite: 'oeuvre', id_entite: 5 };
      mockFavoriService.addFavori.mockResolvedValue({ error: 'duplicate' });

      await controller.addFavori(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('should return 404 when entity not found', async () => {
      req.body = { type_entite: 'oeuvre', id_entite: 999 };
      mockFavoriService.addFavori.mockResolvedValue({ error: 'entityNotFound' });

      await controller.addFavori(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // =========================================================================
  // removeFavori
  // =========================================================================

  describe('removeFavori', () => {
    it('should remove a favori successfully', async () => {
      req.params.id = '10';
      mockFavoriService.removeFavori.mockResolvedValue({ success: true });

      await controller.removeFavori(req, res);

      expect(mockFavoriService.removeFavori).toHaveBeenCalledWith('10', 1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'translated:favori.removed',
      });
    });

    it('should return 404 when favori not found', async () => {
      req.params.id = '999';
      mockFavoriService.removeFavori.mockResolvedValue({ error: 'notFound' });

      await controller.removeFavori(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
