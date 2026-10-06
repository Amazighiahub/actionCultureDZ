/**
 * Professionnels à proximité + commune de résidence obligatoire pour un pro.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-de-plus-de-32-caracteres-xx';
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));

const UserRepository = require('../../repositories/userRepository');
const UserService = require('../../services/user/userService');
const CreateUserDTO = require('../../dto/user/createUserDTO');

// Imite une instance Sequelize : get('champ') renvoie la valeur, get({ plain }) l'objet
const row = (data) => ({
  ...data,
  get: (k) => (typeof k === 'string' ? data[k] : { ...data }),
  setDataValue(k, v) { data[k] = v; this[k] = v; }
});

describe('findNearbyProfessionals', () => {
  const makeRepo = (rows) => {
    const User = { findAll: jest.fn().mockResolvedValue(rows) };
    const models = {
      User,
      Commune: { findByPk: jest.fn().mockResolvedValue({ id_commune: 5, dairaId: 2, Daira: { wilayaId: 16 } }) },
      Daira: {}
    };
    return { repo: new UserRepository(models), User };
  };

  it('classe par proximité : commune, puis daïra, puis wilaya', async () => {
    const { repo } = makeRepo([
      row({ id_user: 3, id_commune: 99, Commune: { dairaId: 8 }, wilaya_residence: 16, email_public: false, email: 'x@y.dz' }),
      row({ id_user: 2, id_commune: 7, Commune: { dairaId: 2 }, wilaya_residence: 16 }),
      row({ id_user: 1, id_commune: 5, Commune: { dairaId: 2 }, wilaya_residence: 16 })
    ]);
    const res = await repo.findNearbyProfessionals({ communeId: 5 });
    expect(res.map(u => [u.id_user, u.proximite])).toEqual([[1, 'commune'], [2, 'daira'], [3, 'wilaya']]);
    expect(res[2].email).toBeNull(); // contact non public masqué
  });

  it('ne garde que les métiers professionnels demandés (jamais admin), profils publics actifs', async () => {
    const { repo, User } = makeRepo([]);
    await repo.findNearbyProfessionals({ communeId: 5, types: [2, 7, 29, 1], excludeUserId: 4 });
    const where = User.findAll.mock.calls[0][0].where;
    const { Op } = require('sequelize');
    expect(where.id_type_user[Op.in]).toEqual([2, 7]);
    expect(where.statut).toBe('actif');
    expect(where.profil_public).toBe(true);
    expect(where.id_user[Op.ne]).toBe(4);
  });

  it('commune inconnue ou aucune zone : liste vide', async () => {
    const { repo } = makeRepo([]);
    repo.models.Commune.findByPk.mockResolvedValue(null);
    expect(await repo.findNearbyProfessionals({ communeId: 999 })).toEqual([]);
    expect(await repo.findNearbyProfessionals({})).toEqual([]);
  });
});

describe('commune de résidence', () => {
  const base = { email: 'a@b.dz', password: 'Azerty123456!', nom: 'N', prenom: 'P', accepte_conditions: 'true' };

  it('obligatoire pour un professionnel, facultative pour un visiteur', () => {
    const errs = (d) => new CreateUserDTO(d).validate().errors.filter(e => e.field === 'id_commune');
    expect(errs({ ...base, id_type_user: 7 })).toHaveLength(1);
    expect(errs({ ...base, id_type_user: 7, id_commune: 5 })).toHaveLength(0);
    expect(errs({ ...base })).toHaveLength(0);
  });

  const makeService = (commune) => new UserService({}, {
    models: { Commune: { findByPk: jest.fn().mockResolvedValue(commune) }, Daira: {} }
  });

  it('la wilaya est déduite de la commune', async () => {
    const data = { id_commune: 5 };
    await makeService({ id_commune: 5, Daira: { wilayaId: 16 } })._resolveCommune(data);
    expect(data.wilaya_residence).toBe(16);
  });

  it('commune d\'une autre wilaya : refusée', async () => {
    await expect(makeService({ id_commune: 5, Daira: { wilayaId: 16 } })._resolveCommune({ id_commune: 5, wilaya_residence: 31 }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('commune inconnue : refusée', async () => {
    await expect(makeService(null)._resolveCommune({ id_commune: 999 })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('changement de wilaya sans commune : l\'ancienne commune est retirée', async () => {
    const data = { wilaya_residence: 31 };
    await makeService(null)._resolveCommune(data, { wilaya_residence: 16, id_commune: 5 });
    expect(data.id_commune).toBeNull();
  });
});
