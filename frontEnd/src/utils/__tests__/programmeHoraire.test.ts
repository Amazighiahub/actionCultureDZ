import { describe, it, expect } from 'vitest';
import { jourProgramme, heureProgramme, dureeMinutes } from '../programmeHoraire';

describe('programmeHoraire', () => {
  it('jour : date_programme du serveur, sinon la date d’un horaire ISO', () => {
    expect(jourProgramme({ date_programme: '2026-10-29', heure_debut: '10:00:00' })).toBe('2026-10-29');
    expect(jourProgramme({ heure_debut: '2026-10-30T09:00:00' })).toBe('2026-10-30');
    expect(jourProgramme({ heure_debut: '10:00:00' })).toBe('');
    expect(jourProgramme({})).toBe('');
  });

  it('heure : « HH:MM » depuis une colonne TIME ou un horaire ISO', () => {
    expect(heureProgramme('10:00:00')).toBe('10:00');
    expect(heureProgramme('2026-10-29T15:30:00')).toBe('15:30');
    expect(heureProgramme('')).toBe('');
    expect(heureProgramme(undefined)).toBe('');
    expect(heureProgramme('n’importe quoi')).toBe('');
  });

  it('durée en minutes, 0 si une heure manque', () => {
    expect(dureeMinutes('13:00:00', '15:30:00')).toBe(150);
    expect(dureeMinutes('2026-10-29T09:00:00', '2026-10-29T10:00:00')).toBe(60);
    expect(dureeMinutes('13:00:00', undefined)).toBe(0);
  });
});
