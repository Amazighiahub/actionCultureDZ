/**
 * Compteur de vues : revoir un contenu dans la même session n'est pas recompté et ne provoque
 * plus d'erreur 500 (l'index unique type_entite + id_entite + session_id couvre toutes les lignes).
 */
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));

const mockVueService = {
  findExistingView: jest.fn(),
  createView: jest.fn(),
  updateEntityViewCount: jest.fn(),
  detectSource: jest.fn(() => 'direct'),
  detectDeviceType: jest.fn(() => 'desktop')
};
jest.mock('../../services/serviceContainer', () => ({ vueService: mockVueService }));

const vueController = require('../../controllers/vueController');

const requete = () => ({
  body: { type_entite: 'oeuvre', id_entite: 62 },
  cookies: { sessionId: 'session-1' },
  headers: {},
  get: () => '',
  ip: '192.168.1.42',
  t: (k) => k
});
const reponse = () => {
  const res = { cookie: jest.fn() };
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('VueController.trackView', () => {
  beforeEach(() => jest.clearAllMocks());

  it('première vue de la session : enregistrée et comptée', async () => {
    mockVueService.findExistingView.mockResolvedValue(null);
    mockVueService.createView.mockResolvedValue({ id_vue: 5, is_unique: true });
    const res = reponse();
    await vueController.trackView(requete(), res);
    expect(mockVueService.createView).toHaveBeenCalledWith(expect.objectContaining({ session_id: 'session-1', is_unique: true, ip_address: '192.168.1.0' }));
    expect(mockVueService.updateEntityViewCount).toHaveBeenCalledWith('oeuvre', 62);
    expect(res.status).not.toHaveBeenCalledWith(500);
  });

  it('même contenu revu dans la session : ni nouvelle ligne, ni recomptage, ni erreur', async () => {
    mockVueService.findExistingView.mockResolvedValue({ id_vue: 5 });
    const res = reponse();
    await vueController.trackView(requete(), res);
    expect(mockVueService.createView).not.toHaveBeenCalled();
    expect(mockVueService.updateEntityViewCount).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: { id_vue: 5, is_unique: false } }));
  });

  it('deux vues simultanées : la seconde (doublon refusé par la base) ne renvoie pas d’erreur', async () => {
    mockVueService.findExistingView.mockResolvedValue(null);
    mockVueService.createView.mockRejectedValue(Object.assign(new Error('Validation error'), { name: 'SequelizeUniqueConstraintError' }));
    const res = reponse();
    await vueController.trackView(requete(), res);
    expect(res.status).not.toHaveBeenCalledWith(500);
    expect(mockVueService.updateEntityViewCount).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
