/**
 * Parcours : un parcours inactif n'est visible que par son créateur et la modération ;
 * l'administration peut supprimer ; une étape exige un lieu publié.
 */
jest.mock('../../services/serviceContainer', () => ({ parcoursService: {} }));
const controller = require('../../controllers/parcoursController');
const ParcoursService = require('../../services/parcours/parcoursService');

const req = (user) => ({ user, lang: 'fr', t: (k) => k });

describe('visibilité', () => {
  const inactif = { _raw: { statut: 'inactif', id_createur: 5 } };
  test('inactif : caché au public et aux autres membres', () => {
    expect(controller._parcoursCache(req(null), inactif)).toBe(true);
    expect(controller._parcoursCache(req({ id_user: 9 }), inactif)).toBe(true);
  });
  test('inactif : visible par le créateur et l\'administration ; actif : visible de tous', () => {
    expect(controller._parcoursCache(req({ id_user: 5 }), inactif)).toBe(false);
    expect(controller._parcoursCache(req({ id_user: 1, isAdmin: true }), inactif)).toBe(false);
    expect(controller._parcoursCache(req(null), { _raw: { statut: 'actif', id_createur: 5 } })).toBe(false);
  });
});

describe('service', () => {
  const service = (lieu) => {
    const s = Object.create(ParcoursService.prototype);
    s.logger = { info: jest.fn() };
    s.repository = {
      findById: jest.fn(async () => ({ id_parcours: 3, id_createur: 5 })),
      delete: jest.fn(async () => true),
      addEtape: jest.fn(),
      findWithFullDetails: jest.fn(async () => ({ id_parcours: 3, Etapes: [] })),
      models: { Lieu: { findByPk: jest.fn(async () => lieu) } }
    };
    return s;
  };
  test('suppression : l\'administration peut, un autre membre non', async () => {
    await expect(service().delete(3, 9, true)).resolves.toBe(true);
    await expect(service().delete(3, 9, false)).rejects.toMatchObject({ statusCode: 403 });
  });
  test('étape : lieu non publié ou inexistant refusé, sans écriture', async () => {
    for (const lieu of [null, { id_lieu: 4, statut: 'brouillon' }]) {
      const s = service(lieu);
      await expect(s.addEtape(3, { id_lieu: 4 }, 5)).rejects.toMatchObject({ statusCode: 400 });
      expect(s.repository.addEtape).not.toHaveBeenCalled();
    }
  });
});
