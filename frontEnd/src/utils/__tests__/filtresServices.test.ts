import { describe, it, expect } from 'vitest';
import { filtrerServices } from '../filtresServices';

const liste = [
  { id: 1, note: { moyenne: 4.5, nombre: 10 }, tarif_min: 800, equipements: ['wifi', 'parking'] },
  { id: 2, note: { moyenne: 3.2, nombre: 3 }, tarif_min: 4000, equipements: ['wifi'] },
  { id: 3, note: null, tarif_min: null, tarif_max: 500, equipements: null },
];
const ids = (l: { id: number }[]) => l.map((s) => s.id);

describe('filtres de la liste des services', () => {
  it('note minimale : sans avis écarté', () => {
    expect(ids(filtrerServices(liste, { noteMin: 4 }))).toEqual([1]);
    expect(ids(filtrerServices(liste, { noteMin: 3 }))).toEqual([1, 2]);
  });
  it('budget : prix de départ (ou prix maximum seul), sans prix écarté', () => {
    expect(ids(filtrerServices(liste, { budget: 1000 }))).toEqual([1, 3]);
  });
  it('équipements : tous ceux choisis', () => {
    expect(ids(filtrerServices(liste, { equipements: ['wifi', 'parking'] }))).toEqual([1]);
    expect(ids(filtrerServices(liste, { equipements: ['wifi'] }))).toEqual([1, 2]);
  });
  it('aucun filtre : tout', () => {
    expect(ids(filtrerServices(liste))).toEqual([1, 2, 3]);
  });
});
