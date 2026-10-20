import { describe, test, expect } from 'vitest';
import { statutAffiche } from '../statutEvenement';

const maintenant = new Date('2026-10-20T12:00:00');

describe('statutAffiche', () => {
  test('événement planifié dont la date de fin est passée : terminé', () => {
    expect(statutAffiche('planifie', '2026-02-15', '2026-02-17', maintenant)).toBe('termine');
  });
  test('sans date de fin, la date de début fait foi', () => {
    expect(statutAffiche('publie', '2026-02-15', null, maintenant)).toBe('termine');
  });
  test('date du jour sans heure : encore en cours jusqu\'à minuit', () => {
    expect(statutAffiche('en_cours', '2026-10-18', '2026-10-20', maintenant)).toBe('en_cours');
  });
  test('événement à venir : statut inchangé', () => {
    expect(statutAffiche('planifie', '2026-12-22', '2027-01-02', maintenant)).toBe('planifie');
  });
  test('annulé ou reporté : jamais remplacé par terminé', () => {
    expect(statutAffiche('annule', '2026-02-15', '2026-02-17', maintenant)).toBe('annule');
    expect(statutAffiche('reporte', '2026-02-15', '2026-02-17', maintenant)).toBe('reporte');
  });
  test('statut absent : brouillon', () => {
    expect(statutAffiche(undefined, null, null, maintenant)).toBe('brouillon');
  });
});
