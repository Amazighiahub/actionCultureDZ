/**
 * Relance automatique des requêtes : seulement sur une connexion perdue.
 * Une erreur SQL (colonne inconnue...) relancée en boucle faisait dépasser 30 s
 * et les pages tombaient en 408 au lieu d'une erreur claire.
 */
const { createDatabaseConnection } = require('../../config/database');

describe('config/database : relance des requêtes', () => {
  let sequelize;
  beforeAll(() => { sequelize = createDatabaseConnection('test'); });
  afterAll(async () => { await sequelize.close().catch(() => undefined); });

  const retried = (message) => sequelize.options.retry.match.some((m) => m.test(message));

  it('limite le nombre de relances', () => {
    expect(sequelize.options.retry.max).toBeLessThanOrEqual(3);
  });

  it.each([
    'SequelizeConnectionError: connect ECONNREFUSED 172.18.0.2:3306',
    'Error: read ECONNRESET',
    'PROTOCOL_CONNECTION_LOST',
    'Deadlock found when trying to get lock; try restarting transaction',
  ])('relance : %s', (message) => {
    expect(retried(message)).toBe(true);
  });

  it.each([
    "SequelizeDatabaseError: Unknown column 'DetailLieu.nb_notations' in 'field list'",
    'SequelizeDatabaseError: You have an error in your SQL syntax',
    'SequelizeUniqueConstraintError: Validation error',
  ])('ne relance pas : %s', (message) => {
    expect(retried(message)).toBe(false);
  });
});
