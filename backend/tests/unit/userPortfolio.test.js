/**
 * Portfolio public d'un professionnel : 404 si le profil n'est pas public
 */
const mockUserService = { getPublicPortfolio: jest.fn() };
jest.mock('../../services/serviceContainer', () => ({ userService: mockUserService }));

const controller = require('../../controllers/userProfileController');

describe('UserProfileController.getPortfolio', () => {
  let req, res;
  beforeEach(() => {
    jest.clearAllMocks();
    req = { params: { id: '17' }, lang: 'fr', t: (k) => k };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis() };
  });

  it('renvoie le portfolio d\'un professionnel public', async () => {
    mockUserService.getPublicPortfolio.mockResolvedValue({
      profil: { id_user: 17, nom: { fr: 'Benali', ar: 'بن علي' } },
      oeuvres: [], artisanats: [], evenements: [], services: [],
    });
    await controller.getPortfolio(req, res);
    expect(mockUserService.getPublicPortfolio).toHaveBeenCalledWith(17);
    expect(res.status).not.toHaveBeenCalled();
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    // Champs multilingues résolus dans la langue demandée
    expect(body.data.profil.nom).toBe('Benali');
  });

  it('404 si le compte n\'a pas de profil public (visiteur, en attente, privé...)', async () => {
    mockUserService.getPublicPortfolio.mockResolvedValue(null);
    await controller.getPortfolio(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
