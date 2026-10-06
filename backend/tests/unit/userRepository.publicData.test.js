/**
 * UserRepository — les listes publiques n'exposent que le profil public,
 * et l'email / le téléphone uniquement si la personne les a rendus publics.
 */
const UserRepository = require('../../repositories/userRepository');
const { PUBLIC_USER_PROFILE_ATTRIBUTES } = require('../../constants/publicAttributes');

const row = (data) => ({
  ...data,
  get(k) { return this[k]; },
  setDataValue(k, v) { this[k] = v; }
});

const makeRepo = (rows) => {
  const User = {
    findAndCountAll: jest.fn().mockResolvedValue({ rows, count: rows.length }),
    findAll: jest.fn().mockResolvedValue(rows)
  };
  return { repo: new UserRepository({ User, TypeUser: {}, Wilaya: {} }), User };
};

const people = () => [
  row({ id_user: 1, nom: 'A', email: 'a@x.dz', telephone: '0555', email_public: true, telephone_public: false }),
  row({ id_user: 2, nom: 'B', email: 'b@x.dz', telephone: '0666', email_public: false, telephone_public: true })
];

describe('findValidatedProfessionals (public)', () => {
  it('limite les colonnes et respecte email_public / telephone_public', async () => {
    const { repo, User } = makeRepo(people());
    const result = await repo.findValidatedProfessionals({ page: 1, limit: 10 });
    const query = User.findAndCountAll.mock.calls[0][0];
    expect(query.attributes).toEqual(PUBLIC_USER_PROFILE_ATTRIBUTES);
    expect(query.where.statut).toBe('actif');
    expect(result.data[0].email).toBe('a@x.dz');
    expect(result.data[0].telephone).toBeNull();
    expect(result.data[1].email).toBeNull();
    expect(result.data[1].telephone).toBe('0666');
  });
});

describe('searchUsers', () => {
  it('utilisateur standard : pas de recherche par email, comptes actifs, colonnes publiques', async () => {
    const { repo, User } = makeRepo(people());
    await repo.searchUsers('gmail', { page: 1, limit: 10 });
    const query = User.findAndCountAll.mock.calls[0][0];
    const { Op } = require('sequelize');
    const fields = query.where[Op.or].map(c => Object.keys(c)[0]);
    expect(fields).not.toContain('email');
    expect(query.where.statut).toBe('actif');
    expect(query.attributes).toEqual(PUBLIC_USER_PROFILE_ATTRIBUTES);
  });

  it('admin : recherche complète (email inclus, tous statuts)', async () => {
    const { repo, User } = makeRepo(people());
    await repo.searchUsers('gmail', { page: 1, limit: 10 }, { includePrivate: true });
    const query = User.findAndCountAll.mock.calls[0][0];
    const { Op } = require('sequelize');
    expect(query.where[Op.or].map(c => Object.keys(c)[0])).toContain('email');
    expect(query.where.statut).toBeUndefined();
    expect(query.attributes).toBeUndefined();
  });
});

describe('findArtisansByWilaya (public)', () => {
  it('exclut admins et comptes non actifs, masque le contact privé', async () => {
    const { repo, User } = makeRepo(people());
    const result = await repo.findArtisansByWilaya(16);
    const query = User.findAll.mock.calls[0][0];
    const { Op } = require('sequelize');
    expect(query.where.statut).toBe('actif');
    expect(query.where.id_type_user[Op.in]).not.toContain(29);
    expect(query.where.id_type_user[Op.in]).not.toContain(1);
    expect(query.attributes).not.toContain('statut');
    expect(result[1].email).toBeNull();
  });
});
