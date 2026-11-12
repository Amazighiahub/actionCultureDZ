import { describe, it, expect } from 'vitest';
import { partiesEvenement, heureEvenement, aujourdhuiAlger } from '../dateHeureEvenement';

describe('dateHeureEvenement (heure de l’Algérie)', () => {
  it('instant UTC → jour et heure en Algérie', () => {
    expect(partiesEvenement('2026-10-29T09:00:00.000Z')).toEqual({ date: '2026-10-29', heure: '10:00' });
    expect(partiesEvenement('2026-10-30T17:00:00+00:00')).toEqual({ date: '2026-10-30', heure: '18:00' });
  });

  it('tard le soir : le jour algérien, pas le jour UTC', () => {
    expect(partiesEvenement('2026-10-29T23:30:00Z')).toEqual({ date: '2026-10-30', heure: '00:30' });
  });

  it('événement enregistré sans heure (minuit UTC) : pas d’heure affichée', () => {
    expect(partiesEvenement('2026-10-29T00:00:00.000Z')).toEqual({ date: '2026-10-29', heure: '' });
    expect(heureEvenement('2026-10-29')).toBe('');
  });

  it('valeur absente', () => {
    expect(partiesEvenement(null)).toEqual({ date: '', heure: '' });
  });
});

describe('aujourdhuiAlger', () => {
  it('jour algérien au format AAAA-MM-JJ', () => {
    expect(aujourdhuiAlger(new Date('2026-11-12T10:00:00Z'))).toBe('2026-11-12');
  });

  it('après 23 h UTC : déjà le lendemain à Alger', () => {
    expect(aujourdhuiAlger(new Date('2026-11-12T23:30:00Z'))).toBe('2026-11-13');
  });
});
