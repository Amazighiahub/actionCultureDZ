/**
 * UserService.update — permissions (soi-meme ou admin calcule par authMiddleware)
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-de-plus-de-32-caracteres-xx';

const UserService = require('../../services/user/userService');

const makeService = () => {
  const repository = {
    findById: jest.fn().mockResolvedValue({ id_user: 5, id_type_user: 1 }),
    update: jest.fn().mockResolvedValue({ id_user: 5, get: () => ({ id_user: 5 }) }),
    findWithRoles: jest.fn().mockResolvedValue(null)
  };
  return { service: new UserService(repository, {}), repository };
};

describe('UserService.update - permissions', () => {
  it('un utilisateur non admin ne peut pas modifier un autre profil', async () => {
    const { service, repository } = makeService();
    await expect(service.update(5, { biographie: 'x' }, 9, false))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('un admin (par role) peut modifier un autre profil sans ReferenceError', async () => {
    const { service } = makeService();
    await expect(service.update(5, { biographie: 'x' }, 9, true))
      .resolves.toBeDefined();
  });

  it('un utilisateur peut modifier son propre profil (ids string/number)', async () => {
    const { service } = makeService();
    await expect(service.update(5, { biographie: 'x' }, '5')).resolves.toBeDefined();
  });
});
