/**
 * Anti-retour (2026-11-19) : filtres de la carte d'exploration (wilaya › daïra › commune, types cachés, type
 * choisi en haut de page) et couleur par type.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('leaflet.markercluster', () => ({}));
vi.mock('leaflet.markercluster/dist/MarkerCluster.css', () => ({}));
vi.mock('leaflet.markercluster/dist/MarkerCluster.Default.css', () => ({}));

import { filtrerLieux, type LieuCarte } from '../CarteExploration';
import { couleurType, COULEUR_TYPE } from '@/utils/couleursPatrimoine';

const lieu = (id: number, type: string, wilaya: number, daira: number, commune: number, parent: number | null = null): LieuCarte =>
  ({ id, nom: `L${id}`, lat: 35, lng: 6, type, parent, wilaya, daira, commune, nbPoints: 0, image: null });
const lieux = [
  lieu(1, 'site_archeologique', 5, 44, 107), // Timgad
  lieu(2, 'site_archeologique', 5, 44, 107, 1), // forum, point de Timgad
  lieu(3, 'monument', 5, 40, 100),
  lieu(4, 'palais_forteresse', 60, 210, 900) // Barika (nouvelle wilaya)
];

describe('Carte d’exploration : filtres', () => {
  it('wilaya, puis daïra, puis commune', () => {
    expect(filtrerLieux(lieux, { wilaya: 5 }).map((l) => l.id)).toEqual([1, 2, 3]);
    expect(filtrerLieux(lieux, { wilaya: 5, daira: 44 }).map((l) => l.id)).toEqual([1, 2]);
    expect(filtrerLieux(lieux, { wilaya: 5, daira: 44, commune: 107 }).map((l) => l.id)).toEqual([1, 2]);
    expect(filtrerLieux(lieux, { wilaya: 60 }).map((l) => l.id)).toEqual([4]);
  });

  it('types cachés par la légende et type choisi en haut de page', () => {
    expect(filtrerLieux(lieux, { typesCaches: new Set(['site_archeologique']) }).map((l) => l.id)).toEqual([3, 4]);
    expect(filtrerLieux(lieux, { type: 'monument' }).map((l) => l.id)).toEqual([3]);
    expect(filtrerLieux(lieux, {})).toHaveLength(4);
  });

  it('une couleur par type, grise pour un type inconnu', () => {
    expect(new Set(Object.values(COULEUR_TYPE)).size).toBe(Object.keys(COULEUR_TYPE).length);
    expect(couleurType('inconnu')).toBe(COULEUR_TYPE.autre);
    expect(couleurType(null)).toBe(COULEUR_TYPE.autre);
  });
});
