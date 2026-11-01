/** Listes et tableaux d'un article : toujours au format attendu par l'affichage */
const { sanitizeBlockJson } = require('../../utils/sanitizeArticle');

describe('sanitizeBlockJson', () => {
  test('liste : textes seulement (un objet ne fait plus planter la page)', () => {
    expect(sanitizeBlockJson('list', ['a', 2, { x: 1 }, null])).toEqual(['a', '2', '', '']);
    expect(sanitizeBlockJson('list', { pas: 'une liste' })).toBeNull();
  });
  test('tableau : en-têtes et lignes en textes', () => {
    expect(sanitizeBlockJson('table', { headers: ['A', 1], rows: [['x', { y: 1 }], 'bad'] }))
      .toEqual({ headers: ['A', '1'], rows: [['x', ''], []] });
    expect(sanitizeBlockJson('table', ['a'])).toBeNull();
  });
  test('autres types : inchangés', () => {
    expect(sanitizeBlockJson('text', { libre: true })).toEqual({ libre: true });
    expect(sanitizeBlockJson('text', undefined)).toBeUndefined();
  });
});
