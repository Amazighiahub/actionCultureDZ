/**
 * Anti-retour (2026-11-19) : rubriques de découverte de la page Patrimoine.
 * Incontournables (photo, points de visite), Près de vous (distance, rayon), nombre de sites par wilaya.
 */
import { describe, it, expect } from 'vitest';
import { incontournables, presDe, sitesParWilaya, distanceKm, type LieuCarte } from '../useLieuxCarte';

const l = (id: number, o: Partial<LieuCarte>): LieuCarte =>
  ({ id, nom: `L${id}`, lat: 35.48, lng: 6.47, type: 'site_archeologique', parent: null, commune: 1, daira: 1, wilaya: 5, nbPoints: 0, image: null, ...o });
const lieux = [
  l(1, { nom: 'Timgad', image: 'timgad.jpg', nbPoints: 23 }),
  l(2, { nom: 'Forum', parent: 1, image: 'forum.jpg' }),
  l(3, { nom: 'Medracen', image: 'medracen.jpg', nbPoints: 2, lat: 35.75, lng: 6.38 }),
  l(4, { nom: 'Sans photo', nbPoints: 40 }),
  l(5, { nom: 'Casbah', image: 'casbah.jpg', nbPoints: 4, wilaya: 16, lat: 36.78, lng: 3.06 })
];

describe('Rubriques de découverte', () => {
  it('incontournables : sites avec photo d’abord, puis les plus riches en points de visite', () => {
    expect(incontournables(lieux).map((x) => x.nom)).toEqual(['Timgad', 'Casbah', 'Medracen', 'Sans photo']);
  });

  it('près de vous : distance réelle, rayon de 150 km, du plus proche au plus loin', () => {
    expect(Math.round(distanceKm({ lat: 35.55, lng: 6.17 }, { lat: 35.48, lng: 6.47 }))).toBe(28); // Batna → Timgad
    const proches = presDe(lieux, { lat: 35.55, lng: 6.17 });
    expect(proches.map((x) => x.nom)).toEqual(['Timgad', 'Sans photo', 'Medracen']);
    expect(proches.every((x) => x.km <= 150)).toBe(true);
  });

  it('par wilaya : sites principaux seulement, la plus riche d’abord', () => {
    expect(sitesParWilaya(lieux)).toEqual([{ wilaya: 5, n: 3 }, { wilaya: 16, n: 1 }]);
  });
});
