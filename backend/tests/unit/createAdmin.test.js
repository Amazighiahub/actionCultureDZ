/**
 * scripts/create-admin.js — création idempotente d'un administrateur
 */
const { readConfig, createOrUpdateAdmin } = require('../../scripts/create-admin');

const STRONG = 'Azerty123456!';

describe('readConfig', () => {
  it('refuse un email ou un mot de passe faible', () => {
    expect(readConfig({ ADMIN_EMAIL: 'x', ADMIN_PASSWORD: STRONG }).errors).toHaveLength(1);
    expect(readConfig({ ADMIN_EMAIL: 'a@b.dz', ADMIN_PASSWORD: 'admin123' }).errors).toHaveLength(1);
  });
  it('accepte une configuration valide et normalise l\'email', () => {
    const c = readConfig({ ADMIN_EMAIL: ' Moi@Taladz.COM ', ADMIN_PASSWORD: STRONG });
    expect(c.errors).toEqual([]);
    expect(c.email).toBe('moi@taladz.com');
  });
});

describe('createOrUpdateAdmin', () => {
  const makeModels = (existing) => {
    const user = existing || { id_user: 50, update: jest.fn() };
    if (!user.update) user.update = jest.fn();
    return {
      user,
      models: {
        Role: { findOne: jest.fn().mockResolvedValue({ id_role: 1 }) },
        UserRole: { findOrCreate: jest.fn().mockResolvedValue([{}, true]) },
        User: {
          unscoped: () => ({ findOne: jest.fn().mockResolvedValue(existing || null) }),
          create: jest.fn().mockResolvedValue(user)
        }
      }
    };
  };
  const config = { email: 'moi@taladz.com', password: STRONG, nom: 'Admin', prenom: 'X' };

  it('crée le compte, l\'active et lui donne le rôle Administrateur', async () => {
    const { models, user } = makeModels(null);
    const res = await createOrUpdateAdmin(models, config);
    expect(res.created).toBe(true);
    expect(models.User.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'moi@taladz.com', id_type_user: 29 }));
    expect(user.update).toHaveBeenCalledWith(expect.objectContaining({ statut: 'actif', email_verifie: true, refresh_token: null }));
    expect(models.UserRole.findOrCreate).toHaveBeenCalledWith({ where: { id_user: 50, id_role: 1 } });
  });

  it('compte existant : met à jour sans recréer', async () => {
    const { models } = makeModels({ id_user: 8 });
    const res = await createOrUpdateAdmin(models, config);
    expect(res.created).toBe(false);
    expect(models.User.create).not.toHaveBeenCalled();
  });

  it('échoue clairement si le rôle n\'existe pas', async () => {
    const { models } = makeModels(null);
    models.Role.findOne.mockResolvedValue(null);
    await expect(createOrUpdateAdmin(models, config)).rejects.toThrow(/Administrateur/);
  });

  it('le mot de passe stocké est un hash bcrypt, jamais le mot de passe en clair', async () => {
    const { models, user } = makeModels(null);
    await createOrUpdateAdmin(models, config);
    const stored = user.update.mock.calls[0][0].password;
    expect(stored).not.toBe(STRONG);
    expect(stored).toMatch(/^\$2[aby]\$/);
  });
});
