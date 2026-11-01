/**
 * Fin réelle d'un événement (heure de l'Algérie) : jour sans heure = toute la journée,
 * pas de date de fin = soir du premier jour.
 */
const { finEffective, finSql } = require('../../helpers/finEvenement');

describe('finEffective', () => {
  test('jour de fin sans heure (minuit UTC) : terminé à minuit, heure d\'Algérie, le soir de ce jour', () => {
    expect(finEffective('2026-12-15T00:00:00Z', '2026-12-25T00:00:00Z').toISOString()).toBe('2026-12-25T23:00:00.000Z');
    expect(finEffective('2026-12-15', '2026-12-25').toISOString()).toBe('2026-12-25T23:00:00.000Z');
  });

  test('fin avec heure : gardée telle quelle', () => {
    expect(finEffective('2026-10-29T09:00:00Z', '2026-10-30T17:00:00Z').toISOString()).toBe('2026-10-30T17:00:00.000Z');
  });

  test('sans date de fin : soir du premier jour (19 h en Algérie → minuit)', () => {
    expect(finEffective('2026-11-24T18:00:00Z', null).toISOString()).toBe('2026-11-24T23:00:00.000Z');
  });

  test('début à 23 h 30 en Algérie (22 h 30 UTC) : fin à minuit du même jour algérien', () => {
    expect(finEffective('2026-11-24T22:30:00Z', null).toISOString()).toBe('2026-11-24T23:00:00.000Z');
  });

  test('aucune date : null', () => {
    expect(finEffective(null, null)).toBeNull();
    expect(finEffective('pas une date', null)).toBeNull();
  });

  test('SQL : colonnes préfixées par l\'alias demandé, ou sans alias (UPDATE)', () => {
    expect(finSql('Evenement')).toContain('`Evenement`.`date_fin`');
    expect(finSql()).not.toContain('`.`');
  });
});
