import { describe, test, expect } from 'vitest';
import { statutAffiche, echeanceEvenement, libelleEcheance, bornesPeriode } from '../statutEvenement';

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

describe('echeanceEvenement (audit V11 UX-17)', () => {
  const midi = new Date('2026-11-11T11:00:00Z'); // mercredi 11 novembre, 12 h en Algérie
  test('demain, dans N jours', () => {
    expect(echeanceEvenement('2026-11-12T18:00:00Z', null, midi)).toEqual({ cle: 'demain' });
    expect(echeanceEvenement('2026-11-15T18:00:00Z', null, midi)).toEqual({ cle: 'dansJours', jours: 4 });
  });
  test('plus tard dans la journée : aujourd’hui', () => {
    expect(echeanceEvenement('2026-11-11T18:00:00Z', null, midi)).toEqual({ cle: 'aujourdhui' });
  });
  test('jour sans heure le jour même : aujourd’hui, pas « en ce moment »', () => {
    expect(echeanceEvenement('2026-11-11', null, midi)).toEqual({ cle: 'aujourdhui' });
  });
  test('commencé et pas fini : en ce moment', () => {
    expect(echeanceEvenement('2026-11-09', '2026-11-13', midi)).toEqual({ cle: 'enCours' });
    expect(echeanceEvenement('2026-11-11T09:00:00Z', '2026-11-11T17:00:00Z', midi)).toEqual({ cle: 'enCours' });
  });
  test('fini : terminé ; sans date : rien', () => {
    expect(echeanceEvenement('2026-11-01', '2026-11-03', midi)).toEqual({ cle: 'termine' });
    expect(echeanceEvenement(null, null, midi)).toBeNull();
  });
  test('libellé traduit avec le nombre de jours', () => {
    const t = (cle: string, o?: Record<string, unknown>) => `${cle}:${o?.count ?? ''}`;
    expect(libelleEcheance({ cle: 'dansJours', jours: 4 }, t)).toBe('home.aLaUne.dansJours:4');
    expect(libelleEcheance({ cle: 'termine' }, t)).toBe('events.statuses.termine:');
    expect(libelleEcheance(null, t)).toBeNull();
  });
});

describe('bornesPeriode : week-end algérien (vendredi-samedi) et mois', () => {
  test('du dimanche au jeudi : le vendredi et le samedi qui viennent', () => {
    expect(bornesPeriode('weekend', new Date('2026-11-11T11:00:00Z'))).toEqual({ dateDebut: '2026-11-13', dateFin: '2026-11-14' });
    expect(bornesPeriode('weekend', new Date('2026-11-15T11:00:00Z'))).toEqual({ dateDebut: '2026-11-20', dateFin: '2026-11-21' });
  });
  test('vendredi ou samedi : le week-end en cours', () => {
    expect(bornesPeriode('weekend', new Date('2026-11-13T11:00:00Z'))).toEqual({ dateDebut: '2026-11-13', dateFin: '2026-11-14' });
    expect(bornesPeriode('weekend', new Date('2026-11-14T22:30:00Z'))).toEqual({ dateDebut: '2026-11-13', dateFin: '2026-11-14' });
  });
  test('minuit passé en Algérie : déjà le jour suivant', () => {
    // jeudi 23 h 30 UTC = vendredi 0 h 30 en Algérie
    expect(bornesPeriode('weekend', new Date('2026-11-12T23:30:00Z'))).toEqual({ dateDebut: '2026-11-13', dateFin: '2026-11-14' });
  });
  test('ce mois-ci : du 1er au dernier jour ; tous : aucune borne', () => {
    expect(bornesPeriode('mois', new Date('2026-02-10T11:00:00Z'))).toEqual({ dateDebut: '2026-02-01', dateFin: '2026-02-28' });
    expect(bornesPeriode('tous')).toEqual({});
  });
});
