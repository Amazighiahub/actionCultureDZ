import { describe, it, expect } from 'vitest';
import { noteMoyenne } from '../noteMoyenne';

describe('noteMoyenne', () => {
  it('une seule note par personne (la première)', () => {
    const r = noteMoyenne([
      { User: { id_user: 1 }, note_qualite: 5, date_creation: '2026-11-02' },
      { User: { id_user: 1 }, note_qualite: 5, date_creation: '2026-11-03' },
      { User: { id_user: 1 }, note_qualite: 1, date_creation: '2026-11-01' },
      { User: { id_user: 2 }, note_qualite: 3 },
      { User: { id_user: 3 }, note_qualite: null },
    ]);
    expect(r).toEqual({ moyenne: 2, nombre: 2, repartition: { 1: 1, 2: 0, 3: 1, 4: 0, 5: 0 } });
  });
  it('sans note : 0', () => {
    expect(noteMoyenne([])).toEqual({ moyenne: 0, nombre: 0, repartition: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  });
});
