/** Lieux : tout membre ajoute (relu par l'équipe) ; enrichir = équipe ou professionnel validé */
jest.mock('../../services/emailService', () => ({}));
const mockConteneur = { patrimoineService: null, notificationService: undefined };
jest.mock('../../services/serviceContainer', () => mockConteneur);
jest.mock('../../services/patrimoine/propositionsLieu', () => ({ proposer: jest.fn(async () => ({ id: 1 })), doitProposer: jest.fn(async () => true), plafondAtteint: jest.fn(async () => false), ACTIONS: [] }));
const propositions = require('../../services/patrimoine/propositionsLieu');
const PatrimoineController = require('../../controllers/patrimoineController');

const reponse = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
const controleur = (create) => {
  const c = Object.create(Object.getPrototypeOf(PatrimoineController));
  mockConteneur.patrimoineService = { create: jest.fn(create), models: {} };
  Object.defineProperty(c, '_models', { value: {} });
  return c;
};
const membre = { id_user: 37, isProfessionnel: false, statut: 'actif' };
const pro = { id_user: 38, isProfessionnel: true, statut: 'actif' };

describe('ajouter un lieu', () => {
  it('membre : lieu en attente, proposition à l’équipe, réponse 202', async () => {
    const c = controleur(async () => ({ id_lieu: 9 }));
    const res = reponse();
    await c.create({ user: membre, body: { nom: 'Source', statut: 'publie' }, t: (k) => k }, res);
    expect(mockConteneur.patrimoineService.create).toHaveBeenCalledWith(expect.objectContaining({ statut: undefined, id_createur: 37 }), { isModerator: false, enAttente: true });
    expect(propositions.proposer).toHaveBeenCalledWith({}, undefined, expect.objectContaining({ idLieu: 9, action: 'creation' }));
    expect(res.status).toHaveBeenCalledWith(202);
  });
  it('membre : pas de point de visite d’un autre site', async () => {
    const c = controleur(async () => ({ id_lieu: 9 }));
    const res = reponse();
    await c.create({ user: membre, body: { nom: 'Salle', id_lieu_parent: 3 }, t: (k) => k }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockConteneur.patrimoineService.create).not.toHaveBeenCalled();
  });
  it('professionnel validé : publié tout de suite (201)', async () => {
    const c = controleur(async () => ({ id_lieu: 10 }));
    const res = reponse();
    await c.create({ user: pro, body: { nom: 'Fort' }, t: (k) => k }, res);
    expect(mockConteneur.patrimoineService.create).toHaveBeenCalledWith(expect.anything(), { isModerator: false });
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('enrichir un lieu', () => {
  it('membre : refusé (403 ENRICHIR_PRO), aucune proposition', async () => {
    const c = controleur();
    const res = reponse();
    const fait = await c._proposer({ user: membre, params: { id: '3' }, body: {} }, res, 'detail');
    expect(fait).toBe(true);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'ENRICHIR_PRO' }));
  });
  it('professionnel validé : sa proposition part à l’équipe', async () => {
    propositions.proposer.mockClear();
    const c = controleur();
    const res = reponse();
    await c._proposer({ user: pro, params: { id: '3' }, body: { histoire: 'x' } }, res, 'detail');
    expect(propositions.proposer).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(202);
  });
});

describe('trop de propositions en attente', () => {
  it('refusé AVANT de créer le lieu (pas de lieu orphelin)', async () => {
    propositions.plafondAtteint.mockResolvedValueOnce(true);
    const c = controleur(async () => ({ id_lieu: 11 }));
    const res = reponse();
    await c.create({ user: membre, body: { nom: 'Puits' }, t: (k) => k }, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(mockConteneur.patrimoineService.create).not.toHaveBeenCalled();
  });
});
