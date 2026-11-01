/**
 * ISBN d'un livre : espaces, X final (ISBN-10) et champ vidé acceptés ; un ISBN faux donne une
 * erreur 400 lisible (avant : erreur 500 dans les trois premiers cas).
 */
const { normaliserIsbn } = require('../../services/oeuvre/subtypes/livreSubService');
const LivreSubService = require('../../services/oeuvre/subtypes/livreSubService');

describe('normaliserIsbn', () => {
  test('espaces retirés, tirets gardés', () => {
    expect(normaliserIsbn('978 2 07 036024 5')).toBe('9782070360245');
    expect(normaliserIsbn('978-2-07-036024-5')).toBe('978-2-07-036024-5');
  });
  test('ISBN-10 terminé par X (minuscule acceptée)', () => {
    expect(normaliserIsbn('2-07-036024-x')).toBe('2-07-036024-X');
  });
  test('champ vidé : null ; champ absent : undefined (rien ne change)', () => {
    expect(normaliserIsbn('')).toBeNull();
    expect(normaliserIsbn('   ')).toBeNull();
    expect(normaliserIsbn(null)).toBeNull();
    expect(normaliserIsbn(undefined)).toBeUndefined();
  });
  test('ISBN faux : erreur 400', () => {
    expect(() => normaliserIsbn('12345')).toThrow(expect.objectContaining({ statusCode: 400 }));
    expect(() => normaliserIsbn('97820703602X5')).toThrow(expect.objectContaining({ statusCode: 400 }));
  });
  test('valeur acceptée par le modèle', () => {
    const regle = /^[0-9-]{9,16}[0-9X]$/;
    for (const v of ['978 2 07 036024 5', '978-2-07-036024-5', '2-07-036024-X', '207036024X']) {
      expect(regle.test(normaliserIsbn(v))).toBe(true);
    }
  });
  test('mise à jour : ISBN et nombre de pages vidés → null', () => {
    const s = new LivreSubService({});
    expect(s._buildUpdateData({ isbn: '', nb_pages: '' })).toEqual({ isbn: null, nb_pages: null });
  });
});
