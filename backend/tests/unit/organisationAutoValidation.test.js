/** Un modérateur membre d'une organisation ne valide ni ne refuse sa page ; un vrai administrateur le peut */
jest.mock('../../utils/redisClient', () => ({ getClient: () => null, getRedisClient: async () => null, isReady: () => false }));
const OrganisationService = require('../../services/organisations/organisationService');

const service = ({ membre, typeUser }) => {
  const org = { id_organisation: 3, nom: 'Association Exemple', update: jest.fn() };
  const repository = { findById: jest.fn(async () => org), roleMembre: jest.fn(async () => (membre ? 'admin' : null)), responsables: jest.fn(async () => []) };
  const s = new OrganisationService(repository, {
    models: { User: { findByPk: jest.fn(async (id) => ({ id_user: id, id_type_user: typeUser })), count: jest.fn(async () => 0) }, Role: {} },
    notificationService: { createNotification: jest.fn() },
  });
  s.models = s.models || { User: { findByPk: jest.fn(async (id) => ({ id_user: id, id_type_user: typeUser })), count: jest.fn(async () => 0) }, Role: {} };
  return { s, org };
};

describe('vérification d’une organisation par un de ses membres', () => {
  it('modérateur membre : refusé (valider et refuser)', async () => {
    const { s, org } = service({ membre: true, typeUser: 2 });
    await expect(s.valider(3, 5)).rejects.toMatchObject({ statusCode: 403, code: 'AUTO_VALIDATION' });
    await expect(s.refuser(3, 5, 'motif')).rejects.toMatchObject({ code: 'AUTO_VALIDATION' });
    expect(org.update).not.toHaveBeenCalled();
  });
  it('modérateur non membre, ou vrai administrateur membre : permis', async () => {
    await expect(service({ membre: false, typeUser: 2 }).s.valider(3, 5)).resolves.toBeTruthy();
    await expect(service({ membre: true, typeUser: 29 }).s.valider(3, 5)).resolves.toBeTruthy();
  });
  it('fusion par un modérateur membre d’une des pages : refusée', async () => {
    const { s } = service({ membre: true, typeUser: 2 });
    await expect(s.fusionner(3, [4], 5)).rejects.toMatchObject({ code: 'AUTO_VALIDATION' });
  });
});
