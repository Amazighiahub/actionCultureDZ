/**
 * Tests unitaires — PatrimoineController
 * Priorité #3 : Second module métier le plus important
 */

const mockPatrimoineService = {
  findAllSites: jest.fn(),
  findWithFullDetails: jest.fn(),
  findByWilaya: jest.fn(),
  getTypesPatrimoine: jest.fn(),
  search: jest.fn(),
};

jest.mock('../../services/serviceContainer', () => ({
  patrimoineService: mockPatrimoineService,
}));

const controller = require('../../controllers/patrimoineController');

describe('PatrimoineController', () => {
  let req, res;

  const mockSite = {
    id_patrimoine: 1,
    nom: { fr: 'Casbah d\'Alger' },
    toCardJSON: jest.fn(() => ({ id: 1, titre: 'Casbah d\'Alger' })),
    toDetailJSON: jest.fn(() => ({ id: 1, titre: 'Casbah d\'Alger', description: 'Site historique' })),
  };

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    req = {
      query: {},
      params: {},
      lang: 'fr',
      t: jest.fn((key) => `translated:${key}`),
    };
  });

  describe('list', () => {
    it('doit retourner les sites patrimoniaux publiés', async () => {
      mockPatrimoineService.findAllSites.mockResolvedValue({
        data: [mockSite],
        pagination: { total: 1, page: 1 },
      });

      await controller.list(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.any(Array) })
      );
    });
  });

  describe('getById : sites non publiés', () => {
    const draftSite = () => ({
      _raw: { statut: 'brouillon', id_createur: 7 },
      toDetailJSON: jest.fn(() => ({ id: 2, nom: 'Brouillon' })),
    });

    it.each([
      ['un visiteur', undefined],
      ['un autre utilisateur', { id_user: 99 }],
    ])('404 pour %s (fiche, galerie, carte de visite)', async (_, user) => {
      req.params = { id: '2' };
      req.user = user;
      for (const method of ['getById', 'getGalerie', 'getCarteVisite']) {
        res.status.mockClear();
        const site = draftSite();
        mockPatrimoineService.findWithFullDetails.mockResolvedValue(site);
        await controller[method](req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(site.toDetailJSON).not.toHaveBeenCalled();
      }
    });

    it.each([
      ['son créateur', { id_user: 7 }],
      ['un administrateur', { id_user: 1, isAdmin: true }],
    ])('visible pour %s', async (_, user) => {
      req.params = { id: '2' };
      req.user = user;
      mockPatrimoineService.findWithFullDetails.mockResolvedValue(draftSite());
      await controller.getById(req, res);
      expect(res.status).not.toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('site publié visible par tous', async () => {
      req.params = { id: '3' };
      req.user = undefined;
      mockPatrimoineService.findWithFullDetails.mockResolvedValue({ ...draftSite(), _raw: { statut: 'publie', id_createur: 7 } });
      await controller.getById(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getById', () => {
    it('doit retourner le détail d\'un site', async () => {
      mockPatrimoineService.findWithFullDetails.mockResolvedValue(mockSite);
      req.params = { id: '1' };

      await controller.getById(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('doit retourner 404 si le site n\'existe pas', async () => {
      const error = new Error('Not found');
      error.statusCode = 404;
      mockPatrimoineService.findWithFullDetails.mockRejectedValue(error);
      req.params = { id: '999' };

      await controller.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
