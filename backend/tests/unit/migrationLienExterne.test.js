/**
 * La migration copie les articles de presse déjà saisis, sans toucher à la colonne d'origine.
 */
const migration = require('../../migrations/20261202-lien-externe');

const fabriquer = (profils) => {
  const bulkInsert = jest.fn();
  const query = jest.fn(async (sql) => {
    if (sql.includes('information_schema')) return [[]];
    if (sql.includes('articles_presse')) return [profils];
    throw new Error(`Requête inattendue : ${sql}`);
  });
  return {
    bulkInsert,
    query,
    queryInterface: { sequelize: { query, literal: (v) => v }, createTable: jest.fn(), addIndex: jest.fn(), bulkInsert },
  };
};
const Sequelize = { INTEGER: 'INTEGER', STRING: () => 'STRING', DATE: 'DATE', DATEONLY: 'DATEONLY', ENUM: () => 'ENUM', literal: (v) => v };

test('articles copiés : lignes sans lien écartées, date incorrecte ignorée', async () => {
  const { queryInterface, bulkInsert, query } = fabriquer([
    { id_user: 3, articles_presse: [
      { titre: 'Portrait', media: 'Journal', url: 'https://journal.example.com/a', date: '2026-01-15' },
      { titre: 'Sans lien', url: '' },
      { titre: 'Dangereux', url: 'javascript:alert(1)' },
      { titre: 'Date fausse', url: 'https://journal.example.com/b', date: 'hier' },
    ] },
    { id_user: 4, articles_presse: JSON.stringify([{ url: 'https://autre.example.com/c' }]) },
    { id_user: 5, articles_presse: 'pas du json' },
  ]);
  await migration.up(queryInterface, Sequelize);
  const [table, lignes] = bulkInsert.mock.calls[0];
  expect(table).toBe('lien_externe');
  expect(lignes.map((l) => [l.id_user, l.url, l.date_publication])).toEqual([
    [3, 'https://journal.example.com/a', '2026-01-15'],
    [3, 'https://journal.example.com/b', null],
    [4, 'https://autre.example.com/c', null],
  ]);
  expect(lignes.every((l) => l.type_lien === 'presse')).toBe(true);
  // La colonne d'origine n'est jamais modifiée
  expect(query.mock.calls.some(([sql]) => /UPDATE|DELETE|DROP/i.test(sql))).toBe(false);
});

test('aucun article : rien à copier', async () => {
  const { queryInterface, bulkInsert } = fabriquer([]);
  await migration.up(queryInterface, Sequelize);
  expect(bulkInsert).not.toHaveBeenCalled();
});
