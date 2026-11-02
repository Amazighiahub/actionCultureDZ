/** Date limite d'inscription et contacts d'un événement */
const EvenementService = require('../../services/evenement/evenementService');

const s = Object.create(EvenementService.prototype);

describe('_limiteInscription', () => {
  const DEBUT = '2026-12-22T00:00:00.000Z';

  test('un jour vaut jusqu\'à 23 h 59 à l\'heure d\'Algérie', () => {
    expect(s._limiteInscription('2026-11-30', DEBUT).toISOString()).toBe('2026-11-30T22:59:59.000Z');
  });

  test('vide → null ; absent → inchangé', () => {
    expect(s._limiteInscription('', DEBUT)).toBeNull();
    expect(s._limiteInscription(undefined, DEBUT)).toBeUndefined();
  });

  test('le jour même : jusqu\'au début ; après l\'événement ou illisible : refusé', () => {
    expect(s._limiteInscription('2026-12-22', '2026-12-22T15:00:00.000Z').toISOString()).toBe('2026-12-22T15:00:00.000Z');
    expect(() => s._limiteInscription('2026-12-25', DEBUT)).toThrow(/avant le début/);
    expect(() => s._limiteInscription('n-importe-quoi', DEBUT)).toThrow(/invalide/);
  });
});

describe('contacts', () => {
  test('e-mail : nettoyé, vide → null, absent → inchangé, faux → refusé', () => {
    expect(s._contactEmail(' agir@example.com ')).toBe('agir@example.com');
    expect(s._contactEmail('')).toBeNull();
    expect(s._contactEmail(undefined)).toBeUndefined();
    expect(() => s._contactEmail('pas-un-email')).toThrow(/invalide/);
  });

  test('téléphone : vide → null, absent → inchangé', () => {
    expect(s._contactTelephone(' 0555 00 00 00 ')).toBe('0555 00 00 00');
    expect(s._contactTelephone('')).toBeNull();
    expect(s._contactTelephone(undefined)).toBeUndefined();
  });
});
