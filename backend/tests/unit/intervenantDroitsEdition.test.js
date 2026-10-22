/**
 * Fiche d'un intervenant : qui peut la modifier ?
 * Administration : toujours. Professionnel : un intervenant présent uniquement dans ses propres
 * événements et sans compte sur le site. Un professionnel ne modifie que la présentation.
 */
const mockContainer = {};
jest.mock('../../services/serviceContainer', () => mockContainer);
const IntervenantService = require('../../services/intervenantService');
const controller = require('../../controllers/intervenantController');

// Intervenants 1 (salon du pro 60), 2 (partagé avec l'événement du pro 99), 3 (a un compte), 4 (sans activité)
const fiches = {
  1: { id_intervenant: 1, id_user: null },
  2: { id_intervenant: 2, id_user: null },
  3: { id_intervenant: 3, id_user: 15 },
  4: { id_intervenant: 4, id_user: null }
};
const liens = { 1: [10, 11], 2: [10, 20], 3: [10], 4: [] };
const programmes = { 10: 1, 11: 1, 20: 2 };      // activité → événement
const evenements = { 1: 60, 2: 99 };              // événement → organisateur

const makeService = () => {
  const svc = Object.create(IntervenantService.prototype);
  svc.models = {
    Intervenant: { findByPk: jest.fn(async (id) => (fiches[id] ? { ...fiches[id], toJSON() { return this; } } : null)) },
    ProgrammeIntervenant: { findAll: jest.fn(async ({ where }) => liens[where.id_intervenant].map(id_programme => ({ id_programme }))) },
    Programme: { findAll: jest.fn(async ({ where }) => where.id_programme.map(id => ({ id_evenement: programmes[id] }))) },
    Evenement: { findAll: jest.fn(async ({ where }) => where.id_evenement.map(id => ({ id_user: evenements[id] }))) }
  };
  return svc;
};

describe('IntervenantService.droitsEdition', () => {
  const svc = makeService();
  const pro = { id_user: 60, isAdmin: false };

  it('professionnel : intervenant de ses seuls événements → modifiable', async () => {
    expect(await svc.droitsEdition(1, pro)).toMatchObject({ peutModifier: true, raison: null });
  });

  it('professionnel : intervenant partagé avec un autre organisateur, ou ayant un compte, ou sans activité → non', async () => {
    expect(await svc.droitsEdition(2, pro)).toMatchObject({ peutModifier: false, raison: 'autre_organisateur' });
    expect(await svc.droitsEdition(3, pro)).toMatchObject({ peutModifier: false, raison: 'compte' });
    expect(await svc.droitsEdition(4, pro)).toMatchObject({ peutModifier: false });
    expect(await svc.droitsEdition(1, { id_user: 99, isAdmin: false })).toMatchObject({ peutModifier: false });
  });

  it('administration : toujours ; fiche inexistante → intervenant null', async () => {
    expect(await svc.droitsEdition(2, { id_user: 1, isAdmin: true })).toMatchObject({ peutModifier: true });
    expect((await svc.droitsEdition(42, pro)).intervenant).toBeNull();
  });
});

describe('IntervenantController.updateIntervenant — professionnel', () => {
  const makeCtrl = (droits) => {
    mockContainer.intervenantService = {
      droitsEdition: jest.fn().mockResolvedValue(droits),
      updateIntervenant: jest.fn().mockResolvedValue({ id_intervenant: 1, toJSON() { return this; } })
    };
    return controller;
  };
  const res = () => { const r = {}; r.status = jest.fn(() => r); r.json = jest.fn(() => r); return r; };
  const req = (body) => ({ params: { id: '1' }, body, user: { id_user: 60, isAdmin: false }, lang: 'fr', t: (k, d) => d || k });

  it('modifiable : seuls les champs de présentation sont transmis', async () => {
    const ctrl = makeCtrl({ intervenant: {}, peutModifier: true });
    await ctrl.updateIntervenant(req({ biographie: { fr: 'Potière' }, titre_professionnel: 'Artisane', email: 'x@y.dz', id_user: 7, telephone: '0555' }), res());
    expect(ctrl.intervenantService.updateIntervenant).toHaveBeenCalledWith('1', 'fr', { biographie: { fr: 'Potière' }, titre_professionnel: 'Artisane' });
  });

  it('non modifiable : 403, rien n’est enregistré', async () => {
    const ctrl = makeCtrl({ intervenant: {}, peutModifier: false, raison: 'autre_organisateur' });
    const r = res();
    await ctrl.updateIntervenant(req({ biographie: { fr: 'x' } }), r);
    expect(r.status).toHaveBeenCalledWith(403);
    expect(ctrl.intervenantService.updateIntervenant).not.toHaveBeenCalled();
  });
});
