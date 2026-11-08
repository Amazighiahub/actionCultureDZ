/**
 * Administration : changer le type de compte. Type et rôle changent ensemble ; un type pro attend
 * la validation ; jamais un compte d'administration, son propre compte, ni un compte suspendu.
 */
jest.mock('../../utils/sessionCache', () => ({ invalidateUserSession: jest.fn(async () => {}) }));
const UserManagementService = require('../../services/dashboard/userManagementService');

const fabriquer = ({ user = { id_user: 40, id_type_user: 1, statut: 'actif' }, admins = [] } = {}) => {
  const roles = [{ id_role: 2, nom_role: 'User' }, { id_role: 3, nom_role: 'Professionnel' }];
  const lignesRoles = [{ id_user: 40, id_role: 2 }, { id_user: 40, id_role: 4 }]; // User + Moderateur
  const models = {
    User: { findAll: jest.fn(async ({ where }) => (where?.id_type_user ? admins.map((id) => ({ id_user: id })) : [])) },
    Role: { findAll: jest.fn(async () => roles) },
    UserRole: {
      lignes: lignesRoles,
      destroy: jest.fn(async ({ where }) => { const i = lignesRoles.findIndex((l) => l.id_user === where.id_user && l.id_role === where.id_role); if (i >= 0) lignesRoles.splice(i, 1); }),
      findOrCreate: jest.fn(async ({ where }) => { if (!lignesRoles.some((l) => l.id_user === where.id_user && l.id_role === where.id_role)) lignesRoles.push({ ...where }); return [{}, true]; }),
    },
    TypeUser: { findByPk: jest.fn(async () => ({ nom_type: 'ecrivain' })) },
    Notification: { create: jest.fn(async () => ({})) },
  };
  const userRepo = {
    findById: jest.fn(async () => user),
    update: jest.fn(async (id, data) => Object.assign(user, data)),
    withTransaction: (f) => f({}),
  };
  const s = new UserManagementService(models, { user: userRepo });
  return { s, models, user, lignesRoles, userRepo };
};

describe('changer le type de compte', () => {
  it('visiteuse → écrivaine : type 2, en attente de validation, rôle Professionnel (Moderateur gardé), notification', async () => {
    const { s, user, lignesRoles, models } = fabriquer();
    const r = await s.changerTypeCompte(40, 2, 1);
    expect(r).toMatchObject({ id_type_user: 2, statut: 'en_attente_validation', ancien_type: 1 });
    expect(user).toMatchObject({ id_type_user: 2, statut: 'en_attente_validation' });
    expect(lignesRoles.map((l) => l.id_role).sort()).toEqual([3, 4]);
    expect(models.Notification.create).toHaveBeenCalledWith(expect.objectContaining({ id_user: 40, titre: 'Type de compte modifié' }));
  });
  it('professionnel → visiteur : rôle Professionnel retiré, rôle User, compte actif', async () => {
    const { s, user, lignesRoles } = fabriquer({ user: { id_user: 40, id_type_user: 2, statut: 'actif' } });
    lignesRoles.splice(0, lignesRoles.length, { id_user: 40, id_role: 3 });
    await s.changerTypeCompte(40, 1, 1);
    expect(user).toMatchObject({ id_type_user: 1, statut: 'actif' });
    expect(lignesRoles.map((l) => l.id_role)).toEqual([2]);
  });
  it('refus : type inconnu ou administrateur, même type, compte suspendu, compte d’administration, son propre compte', async () => {
    await expect(fabriquer().s.changerTypeCompte(40, 29, 1)).rejects.toMatchObject({ statusCode: 400 });
    await expect(fabriquer().s.changerTypeCompte(40, 99, 1)).rejects.toMatchObject({ statusCode: 400 });
    await expect(fabriquer().s.changerTypeCompte(40, 1, 1)).rejects.toMatchObject({ statusCode: 409 });
    await expect(fabriquer({ user: { id_user: 40, id_type_user: 1, statut: 'suspendu' } }).s.changerTypeCompte(40, 2, 1)).rejects.toMatchObject({ statusCode: 409 });
    await expect(fabriquer({ admins: [40] }).s.changerTypeCompte(40, 2, 1)).rejects.toMatchObject({ statusCode: 403 });
    await expect(fabriquer().s.changerTypeCompte(40, 2, 40)).rejects.toMatchObject({ statusCode: 403 });
  });
});
