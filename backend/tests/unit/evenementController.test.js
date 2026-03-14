/**
 * Tests unitaires — EvenementController (CRUD événements)
 * Priorité #2 : Cœur métier — listing, détail, création
 */

const mockEvenementService = {
  findPublished: jest.fn(),
  findUpcoming: jest.fn(),
  findWithFullDetails: jest.fn(),
  search: jest.fn(),
  create: jest.fn(),
};

jest.mock('../../services/serviceContainer', () => ({
  evenementService: mockEvenementService,
}));

const controller = require('../../controllers/evenementController');

describe('EvenementController', () => {
  let req, res;

  const mockEvenement = {
    id_evenement: 1,
    nom_evenement: { fr: 'Festival', ar: 'مهرجان' },
    toCardJSON: jest.fn((lang) => ({ id: 1, titre: 'Festival' })),
    toDetailJSON: jest.fn((lang) => ({ id: 1, titre: 'Festival', description: 'Test' })),
  };

  beforeEach(() => {
    // controller est un singleton
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    req = {
      query: {},
      params: {},
      body: {},
      lang: 'fr',
      user: { id_user: 1 },
      t: jest.fn((key) => `translated:${key}`),
    };
  });

  describe('list', () => {
    it('doit retourner les événements publiés avec pagination', async () => {
      mockEvenementService.findPublished.mockResolvedValue({
        data: [mockEvenement],
        pagination: { total: 1, page: 1, limit: 20 },
      });

      await controller.list(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
          pagination: expect.objectContaining({ total: 1 }),
        })
      );
    });

    it('doit retourner les événements à venir si upcoming=true', async () => {
      mockEvenementService.findUpcoming.mockResolvedValue({
        data: [mockEvenement],
        pagination: { total: 1, page: 1, limit: 20 },
      });
      req.query = { upcoming: 'true' };

      await controller.list(req, res);

      expect(mockEvenementService.findUpcoming).toHaveBeenCalled();
      expect(mockEvenementService.findPublished).not.toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('doit retourner le détail d\'un événement', async () => {
      mockEvenementService.findWithFullDetails.mockResolvedValue(mockEvenement);
      req.params = { id: '1' };

      await controller.getById(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
      expect(mockEvenement.toDetailJSON).toHaveBeenCalledWith('fr');
    });

    it('doit retourner 404 si l\'événement n\'existe pas', async () => {
      const error = new Error('Not found');
      error.statusCode = 404;
      mockEvenementService.findWithFullDetails.mockRejectedValue(error);
      req.params = { id: '999' };

      await controller.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('search', () => {
    it('doit retourner les résultats de recherche', async () => {
      mockEvenementService.search.mockResolvedValue({
        data: [mockEvenement],
        pagination: { total: 1, page: 1, limit: 20 },
      });
      req.query = { q: 'festival' };

      await controller.search(req, res);

      expect(mockEvenementService.search).toHaveBeenCalledWith('festival', expect.any(Object));
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });
});
