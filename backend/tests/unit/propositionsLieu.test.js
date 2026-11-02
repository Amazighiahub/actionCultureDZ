/**
 * Sites patrimoine (audit V7 M5) : l'équipe et le créateur du site modifient directement ;
 * toute autre personne envoie une proposition, appliquée seulement si l'équipe l'accepte.
 */
jest.mock('../../utils/notifierModeration', () => ({ idsAdministrateurs: jest.fn().mockResolvedValue([8]), notifier: jest.fn() }));
const { notifier } = require('../../utils/notifierModeration');
const P = require('../../services/patrimoine/propositionsLieu');

const modeles = (lieu = { id_lieu: 3, id_createur: 20, nom: { fr: 'Tkout' } }) => ({
  Lieu: { findByPk: jest.fn().mockResolvedValue(lieu) },
  sequelize: {
    query: jest.fn(async (sql) => {
      if (sql.startsWith('INSERT')) return [41, 1];
      return sql.includes('COUNT(*)') ? [{ n: 0 }] : [];
    }),
    QueryTypes: { SELECT: 'SELECT' }
  }
});

describe('qui doit proposer', () => {
  test('membre quelconque, professionnel compris : proposition', async () => {
    expect(await P.doitProposer(modeles(), { id_user: 37, isProfessionnel: true }, 3)).toBe(true);
  });
  test('créateur du site : modification directe', async () => {
    expect(await P.doitProposer(modeles(), { id_user: 20 }, 3)).toBe(false);
  });
  test('administration ou modération : modification directe', async () => {
    expect(await P.doitProposer(modeles(), { id_user: 37, isAdmin: true }, 3)).toBe(false);
    expect(await P.doitProposer(modeles(), { id_user: 37, isModerateur: true }, 3)).toBe(false);
  });
  test('site introuvable : 404', async () => {
    await expect(P.doitProposer(modeles(null), { id_user: 37 }, 3)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('proposer et décider', () => {
  test('la proposition est enregistrée et l’équipe prévenue', async () => {
    const m = modeles();
    const r = await P.proposer(m, {}, { idLieu: 3, user: { id_user: 37, prenom: 'Lydia' }, action: 'detail', donnees: { corps: { histoire: { fr: 'x' } } } });
    expect(r).toEqual({ id: 41 });
    expect(m.sequelize.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO proposition_lieu'))).toBe(true);
    expect(notifier).toHaveBeenCalledWith({}, 8, expect.objectContaining({ titre: 'Proposition à relire' }));
  });
  test('trop de propositions en attente : 409, rien n’est enregistré', async () => {
    const m = modeles();
    m.sequelize.query = jest.fn(async () => [{ n: 20 }]);
    await expect(P.proposer(m, {}, { idLieu: 3, user: { id_user: 37 }, action: 'detail', donnees: { corps: {} } }))
      .rejects.toMatchObject({ statusCode: 409 });
    expect(m.sequelize.query).toHaveBeenCalledTimes(1);
  });
  test('proposition démesurée : 413', async () => {
    await expect(P.proposer(modeles(), {}, { idLieu: 3, user: { id_user: 37 }, action: 'detail', donnees: { corps: { histoire: 'x'.repeat(300000) } } }))
      .rejects.toMatchObject({ statusCode: 413 });
  });
  test('même proposition déjà en attente : pas de doublon', async () => {
    const m = modeles();
    m.sequelize.query = jest.fn(async (sql) => (sql.includes('COUNT(*)') ? [{ n: 1 }] : [{ id: 9 }]));
    await expect(P.proposer(m, {}, { idLieu: 3, user: { id_user: 37 }, action: 'detail', donnees: { corps: {} } })).resolves.toEqual({ id: 9 });
    expect(m.sequelize.query.mock.calls.some(([sql]) => sql.includes('INSERT'))).toBe(false);
  });
  test('action inconnue refusée', async () => {
    await expect(P.proposer(modeles(), {}, { idLieu: 3, user: { id_user: 37 }, action: 'supprimer', donnees: {} }))
      .rejects.toMatchObject({ statusCode: 400 });
  });
  test('refus sans motif : 400', async () => {
    await expect(P.decider(modeles(), {}, 1, 'refusee', '  ', 8)).rejects.toMatchObject({ statusCode: 400 });
  });
});
