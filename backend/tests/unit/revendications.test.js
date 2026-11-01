/**
 * « C'est mon organisation » : pas sur une page non publiée, ni pour un compte devenu inactif.
 */
const revendications = require('../../services/organisations/revendications');

const modeles = ({ org, demande, demandeur }) => {
  const sequelize = {
    QueryTypes: { SELECT: 'SELECT' },
    transaction: jest.fn(async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } })),
    query: jest.fn(async (sql) => (sql.startsWith('SELECT * FROM organisation_revendication') ? [demande] : []))
  };
  return {
    Organisation: { sequelize, findByPk: jest.fn(async () => org) },
    UserOrganisation: { findAll: jest.fn(async () => []), findOne: jest.fn(async () => null), findOrCreate: jest.fn() },
    User: { findByPk: jest.fn(async () => demandeur) }
  };
};

describe('demander', () => {
  test('page en attente ou refusée : introuvable', async () => {
    for (const statut of ['en_attente', 'rejete']) {
      const m = modeles({ org: { id_organisation: 3, statut } });
      await expect(revendications.demander(m, 3, 9, 'moi')).rejects.toMatchObject({ statusCode: 404 });
    }
  });

  test('page publiée sans responsable : demande enregistrée', async () => {
    const m = modeles({ org: { id_organisation: 3, statut: 'valide' } });
    await revendications.demander(m, 3, 9, 'moi');
    expect(m.Organisation.sequelize.query.mock.calls.some(c => c[0].startsWith('INSERT INTO organisation_revendication'))).toBe(true);
  });
});

describe('decider', () => {
  test('compte suspendu depuis la demande : acceptation refusée, rien n\'est créé', async () => {
    const m = modeles({
      org: { id_organisation: 3 },
      demande: { id: 1, id_organisation: 3, id_user: 9, statut: 'en_attente' },
      demandeur: { id_user: 9, statut: 'suspendu' }
    });
    await expect(revendications.decider(m, 1, 'acceptee')).rejects.toMatchObject({ statusCode: 409, code: 'DEMANDEUR_INACTIF' });
    expect(m.UserOrganisation.findOrCreate).not.toHaveBeenCalled();
  });
});
