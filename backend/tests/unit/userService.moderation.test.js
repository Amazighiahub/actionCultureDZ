/**
 * UserService — validate / reject limités aux comptes en attente,
 * jamais sur soi-même ni sur un membre de la modération ; cache session invalidé.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-de-plus-de-32-caracteres-xx';

const mockDel = jest.fn();
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn(() => ({ del: mockDel })),
  isReady: jest.fn().mockReturnValue(true)
}));

const UserService = require('../../services/user/userService');

const makeService = (user) => {
  const repository = {
    findById: jest.fn().mockResolvedValue(user),
    findWithRoles: jest.fn().mockResolvedValue(user),
    validate: jest.fn().mockResolvedValue({ ...user, statut: 'actif' }),
    reject: jest.fn().mockResolvedValue({ ...user, statut: 'rejete' })
  };
  return { service: new UserService(repository, {}), repository };
};

beforeEach(() => mockDel.mockClear());

describe('UserService.validateUser', () => {
  it.each(['banni', 'suspendu', 'actif', 'inactif', 'rejete'])('refuse un compte %s', async (statut) => {
    const { service, repository } = makeService({ id_user: 77, statut });
    await expect(service.validateUser(77, 2)).rejects.toMatchObject({ statusCode: 409 });
    expect(repository.validate).not.toHaveBeenCalled();
  });

  it('valide un compte en attente et invalide son cache de session', async () => {
    const { service, repository } = makeService({ id_user: 77, statut: 'en_attente_validation' });
    await service.validateUser(77, 2);
    expect(repository.validate).toHaveBeenCalledWith(77, 2);
    expect(mockDel).toHaveBeenCalledWith(['user:session:77']);
  });
});

describe('UserService.rejectUser', () => {
  it('refuse de cibler un administrateur', async () => {
    const { service, repository } = makeService({
      id_user: 1, statut: 'en_attente_validation', Roles: [{ nom_role: 'Administrateur' }]
    });
    await expect(service.rejectUser(1, 2, 'x')).rejects.toMatchObject({ statusCode: 403 });
    expect(repository.reject).not.toHaveBeenCalled();
  });

  it('refuse de se cibler soi-même', async () => {
    const { service } = makeService({ id_user: 2, statut: 'en_attente_validation', Roles: [] });
    await expect(service.rejectUser(2, '2', 'x')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('refuse un visiteur déjà actif', async () => {
    const { service } = makeService({ id_user: 5, statut: 'actif', Roles: [] });
    await expect(service.rejectUser(5, 2, 'x')).rejects.toMatchObject({ statusCode: 409 });
  });

  it('refuse un pro en attente et invalide son cache', async () => {
    const { service, repository } = makeService({ id_user: 9, statut: 'en_attente_validation', Roles: [] });
    await service.rejectUser(9, 2, 'Dossier incomplet');
    expect(repository.reject).toHaveBeenCalledWith(9, 2, 'Dossier incomplet');
    expect(mockDel).toHaveBeenCalledWith(['user:session:9']);
  });
});
