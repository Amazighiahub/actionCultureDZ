/**
 * Modification d'un site patrimonial : la modération, ou le compte qui a créé le site
 * (et, pour un point de visite, le créateur de son site). Le créateur ne modifie que la fiche ;
 * les langues non envoyées sont gardées.
 */
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));
const mockContainer = {};
jest.mock('../../services/serviceContainer', () => mockContainer);

const PatrimoineService = require('../../services/patrimoine/patrimoineService');
const controller = require('../../controllers/patrimoineController');

// Site 10 créé par le compte 60 ; point 11 créé par le compte 99 dans ce site ; site 20 importé (sans créateur)
const lieux = {
  10: { id_lieu: 10, id_createur: 60, id_lieu_parent: null },
  11: { id_lieu: 11, id_createur: 99, id_lieu_parent: 10 },
  20: { id_lieu: 20, id_createur: null, id_lieu_parent: null }
};

describe('PatrimoineService.peutModifier', () => {
  const service = new PatrimoineService({}, { models: { Lieu: { findByPk: jest.fn(async (id) => lieux[id] || null) } } });

  it('créateur du site, ou créateur du site d’un point de visite → oui', async () => {
    expect(await service.peutModifier(10, { userId: 60 })).toBe(true);
    expect(await service.peutModifier(11, { userId: 60 })).toBe(true);
    expect(await service.peutModifier(11, { userId: 99 })).toBe(true);
  });

  it('autre compte, ou site importé sans créateur → non ; modération → toujours', async () => {
    expect(await service.peutModifier(10, { userId: 99 })).toBe(false);
    expect(await service.peutModifier(20, { userId: 60 })).toBe(false);
    expect(await service.peutModifier(20, { userId: 1, isModerator: true })).toBe(true);
  });

  it('site inexistant → erreur « introuvable »', async () => {
    await expect(service.peutModifier(42, { userId: 60 })).rejects.toThrow();
  });
});

describe('PatrimoineService.update — langues fusionnées', () => {
  it('le français envoyé seul n’efface pas l’arabe (nom et description)', async () => {
    const existing = {
      id_lieu: 10, nom: { fr: 'Ancien nom', ar: 'الاسم' },
      get: function () { return this; }, update: jest.fn()
    };
    const detail = { id_detailLieu: 5, description: { fr: 'Ancienne', ar: 'وصف' }, update: jest.fn() };
    const repository = {
      findById: jest.fn().mockResolvedValue(existing),
      withTransaction: jest.fn(async (cb) => cb({})),
      findWithFullDetails: jest.fn().mockResolvedValue({ id_lieu: 10 })
    };
    const service = new PatrimoineService(repository, { models: { DetailLieu: { findOne: jest.fn().mockResolvedValue(detail) } } });

    await service.update(10, { nom: { fr: 'Nouveau nom', ar: '' }, description: { fr: 'Nouvelle' } });

    expect(existing.update).toHaveBeenCalledWith({ nom: { fr: 'Nouveau nom', ar: 'الاسم' } }, expect.anything());
    expect(detail.update).toHaveBeenCalledWith({ description: { fr: 'Nouvelle', ar: 'وصف' } }, expect.anything());
  });
});

describe('PatrimoineController.update — droits', () => {
  const res = () => { const r = {}; r.status = jest.fn(() => r); r.json = jest.fn(() => r); return r; };
  const req = (user, body) => ({ params: { id: '10' }, body, user, lang: 'fr', t: (k, d) => d || k });
  const service = (peut) => ({
    peutModifier: jest.fn().mockResolvedValue(peut),
    update: jest.fn().mockResolvedValue({ toDetailJSON: () => ({ id_lieu: 10 }) })
  });

  it('créateur : seuls les champs de la fiche sont transmis', async () => {
    mockContainer.patrimoineService = service(true);
    await controller.update(req({ id_user: 60 }, { nom: { fr: 'Casbah' }, description: { fr: 'x' }, id_lieu_parent: 3, medias: [], services: [] }), res());
    expect(mockContainer.patrimoineService.update).toHaveBeenCalledWith(10, { nom: { fr: 'Casbah' }, description: { fr: 'x' } });
  });

  it('autre compte : 403, rien n’est enregistré ; modération : tout est transmis', async () => {
    mockContainer.patrimoineService = service(false);
    const r = res();
    await controller.update(req({ id_user: 99 }, { nom: { fr: 'x' } }), r);
    expect(r.status).toHaveBeenCalledWith(403);
    expect(mockContainer.patrimoineService.update).not.toHaveBeenCalled();

    mockContainer.patrimoineService = service(true);
    await controller.update(req({ id_user: 1, isAdmin: true }, { nom: { fr: 'x' }, services: [] }), res());
    expect(mockContainer.patrimoineService.update).toHaveBeenCalledWith(10, { nom: { fr: 'x' }, services: [] });
  });

  it('suppression d’un média par un autre compte : 403', async () => {
    mockContainer.patrimoineService = { ...service(false), deleteMedia: jest.fn() };
    const r = res();
    await controller.deleteMedia({ ...req({ id_user: 99 }, {}), params: { id: '10', mediaId: '3' } }, r);
    expect(r.status).toHaveBeenCalledWith(403);
    expect(mockContainer.patrimoineService.deleteMedia).not.toHaveBeenCalled();
  });
});
