/**
 * Portfolio public d'un professionnel et son QR code
 */
const mockUserService = { getPublicPortfolio: jest.fn(), getPublicProfessional: jest.fn() };
jest.mock('../../services/serviceContainer', () => ({ userService: mockUserService }));

const controller = require('../../controllers/userProfileController');

describe('UserProfileController.getPortfolio', () => {
  let req, res;
  beforeEach(() => {
    jest.clearAllMocks();
    req = { params: { id: '17' }, query: {}, lang: 'fr', t: (k) => k };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(), send: jest.fn().mockReturnThis() };
  });

  const portfolio = () => ({
    profil: { id_user: 17, nom: { fr: 'Benali', ar: 'بن علي' } },
    oeuvres: [], artisanats: [], evenements: [], services: [],
  });

  it('renvoie le portfolio d\'un professionnel validé, en cache public', async () => {
    mockUserService.getPublicPortfolio.mockResolvedValue(portfolio());
    await controller.getPortfolio(req, res);
    expect(mockUserService.getPublicPortfolio).toHaveBeenCalledWith(17);
    expect(res.set).toHaveBeenCalledWith('Cache-Control', expect.stringContaining('public'));
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.data.estProprietaire).toBe(false);
    // Champs multilingues résolus dans la langue demandée
    expect(body.data.profil.nom).toBe('Benali');
  });

  it('404 si le compte n\'est pas un professionnel validé', async () => {
    mockUserService.getPublicPortfolio.mockResolvedValue(null);
    await controller.getPortfolio(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('le propriétaire connecté est reconnu, sans cache partagé', async () => {
    req.user = { id_user: 17 };
    mockUserService.getPublicPortfolio.mockResolvedValue(portfolio());
    await controller.getPortfolio(req, res);
    expect(res.json.mock.calls[0][0].data.estProprietaire).toBe(true);
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
  });
});

describe('UserProfileController.getPortfolioQRCode', () => {
  let req, res;
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.FRONTEND_URL;
    req = { params: { id: '17' }, query: {}, lang: 'fr', t: (k) => k };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(), send: jest.fn().mockReturnThis() };
    mockUserService.getPublicProfessional.mockResolvedValue({ id_user: 17, prenom: 'Amina', nom: 'Bénali' });
  });

  it('QR code menant à l\'adresse lisible du portfolio', async () => {
    await controller.getPortfolioQRCode(req, res);
    const { data } = res.json.mock.calls[0][0];
    expect(data.portfolio_url).toBe('https://taladz.com/professionnels/17-amina-benali');
    expect(data.qr_data_url).toMatch(/^data:image\/png;base64,/);
  });

  it.each([
    ['png', 'image/png', 'taladz-portfolio-17.png'],
    ['svg', 'image/svg+xml', 'taladz-portfolio-17.svg'],
  ])('fichier %s à télécharger', async (format, type, filename) => {
    req.query.format = format;
    await controller.getPortfolioQRCode(req, res);
    expect(res.set).toHaveBeenCalledWith('Content-Type', type);
    expect(res.set).toHaveBeenCalledWith('Content-Disposition', `attachment; filename="${filename}"`);
    expect(res.send).toHaveBeenCalled();
  });

  it('404 si le compte n\'est pas un professionnel validé', async () => {
    mockUserService.getPublicProfessional.mockResolvedValue(null);
    await controller.getPortfolioQRCode(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
