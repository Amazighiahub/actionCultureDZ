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
  test('jour de fin sans heure renvoyé par le serveur (minuit UTC) : en cours toute la journée', () => {
    const a = new Date('2026-10-20T21:30:00Z'); // 22 h 30 en Algérie, le 20
    expect(statutAffiche('publie', '2026-10-18T00:00:00.000Z', '2026-10-20T00:00:00.000Z', a)).toBe('publie');
    expect(statutAffiche('publie', '2026-10-18T00:00:00.000Z', '2026-10-20T00:00:00.000Z', new Date('2026-10-20T23:00:00Z'))).toBe('termine');
  });
  test('début à 19 h sans date de fin : pas terminé avant minuit (Algérie)', () => {
    expect(statutAffiche('publie', '2026-10-20T18:00:00.000Z', null, new Date('2026-10-20T20:00:00Z'))).toBe('publie');
    expect(statutAffiche('publie', '2026-10-20T18:00:00.000Z', null, new Date('2026-10-21T08:00:00Z'))).toBe('termine');
  });
  test('fin avec heure : terminé juste après', () => {
    expect(statutAffiche('publie', '2026-10-20T08:00:00.000Z', '2026-10-20T16:00:00.000Z', new Date('2026-10-20T16:01:00Z'))).toBe('termine');
  });
  test('statut absent : brouillon', () => {
    expect(statutAffiche(undefined, null, null, maintenant)).toBe('brouillon');
  });
});
