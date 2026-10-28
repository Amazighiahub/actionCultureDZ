/**
 * Page publique d'une organisation : qui la voit, qui la modifie, et la vérification par l'équipe.
 */
const OrganisationService = require('../../services/organisations/organisationService');

// Organisations : 1 (vérifiée), 2 (en attente), 3 (refusée) ; membres : 10 responsable de 1, 2 et 3 ; 11 simple membre de 1
const orgs = {
  1: { id_organisation: 1, nom: { fr: 'Éditions Barzakh' }, statut: 'valide' },
  2: { id_organisation: 2, nom: { fr: 'Association Adrar' }, statut: 'en_attente' },
  3: { id_organisation: 3, nom: { fr: 'Musée privé' }, statut: 'rejete' }
};
const roles = { '1:10': 'responsable', '2:10': 'responsable', '3:10': 'responsable', '1:11': 'membre' };

const instance = (o) => ({
  ...o,
  TypeOrganisation: { code: o.id_organisation === 1 ? 'maison_edition' : 'association' },
  update: jest.fn(async function (champs) { Object.assign(this, champs); return this; }),
  get() { return { ...this }; }
});

const makeService = () => {
  const svc = Object.create(OrganisationService.prototype);
  const enBase = Object.fromEntries(Object.entries(orgs).map(([id, o]) => [id, instance(o)]));
  svc.models = null; // pas d'administrateurs à prévenir
  svc.logger = { info: jest.fn() };
  svc.notificationService = { sendToUser: jest.fn(async () => {}) };
  svc.repository = {
    findById: jest.fn(async (id) => enBase[id] || null),
    findVitrine: jest.fn(async (id) => enBase[id] || null),
    roleMembre: jest.fn(async (id, userId) => roles[`${id}:${userId}`] || null),
    membres: jest.fn(async () => []),
    evenements: jest.fn(async () => []),
    oeuvres: jest.fn(async () => [{ id_oeuvre: 5 }]),
    responsables: jest.fn(async () => [10])
  };
  return { svc, enBase };
};

const echec = (promesse) => promesse.then(() => { throw new Error('aurait dû échouer'); }, (e) => e);

describe('Organisation : page publique', () => {
  test('organisation vérifiée : visible de tous, sans droit de modification', async () => {
    const { svc } = makeService();
    const v = await svc.vitrine(1, {});
    expect(v.categorie).toBe('edition');
    expect(v.oeuvres).toHaveLength(1);
    expect(v.peutModifier).toBe(false);
  });

  test('en attente : invisible du public, visible de ses membres et de la modération', async () => {
    const { svc } = makeService();
    expect((await echec(svc.vitrine(2, { userId: 99 }))).statusCode).toBe(404);
    expect((await svc.vitrine(2, { userId: 10 })).peutModifier).toBe(true);
    expect((await svc.vitrine(2, { isModerator: true })).peutModifier).toBe(true);
  });

  test('un simple membre voit la page mais ne la modifie pas', async () => {
    const { svc } = makeService();
    expect((await svc.vitrine(1, { userId: 11 })).peutModifier).toBe(false);
    expect((await echec(svc.modifier(1, { adresse: 'Alger' }, { userId: 11 }))).statusCode).toBe(403);
  });

  test('le responsable modifie la page ; réseaux non https ignorés', async () => {
    const { svc, enBase } = makeService();
    await svc.modifier(1, { adresse: ' 5 rue Didouche ', reseaux: { facebook: 'https://facebook.com/barzakh', instagram: 'javascript:alert(1)' } }, { userId: 10 });
    expect(enBase[1].adresse).toBe('5 rue Didouche');
    expect(enBase[1].reseaux).toEqual({ facebook: 'https://facebook.com/barzakh' });
  });

  test('nom vide refusé', async () => {
    const { svc } = makeService();
    expect((await echec(svc.modifier(1, { nom: { fr: '  ' } }, { userId: 10 }))).statusCode).toBe(400);
  });

  test('page refusée corrigée par son responsable : repart en vérification', async () => {
    const { svc, enBase } = makeService();
    await svc.modifier(3, { adresse: 'Tizi Ouzou' }, { userId: 10 });
    expect(enBase[3].statut).toBe('en_attente');
  });
});

describe('Organisation : vérification par l’équipe', () => {
  test('publier prévient les responsables', async () => {
    const { svc, enBase } = makeService();
    await svc.valider(2, 1);
    expect(enBase[2].statut).toBe('valide');
    expect(svc.notificationService.sendToUser).toHaveBeenCalledWith(10, expect.objectContaining({ url_action: '/organisations/2' }));
  });

  test('refuser exige un motif', async () => {
    const { svc, enBase } = makeService();
    expect((await echec(svc.refuser(2, 1, '  '))).statusCode).toBe(400);
    await svc.refuser(2, 1, 'Logo manquant');
    expect(enBase[2].statut).toBe('rejete');
  });
});
