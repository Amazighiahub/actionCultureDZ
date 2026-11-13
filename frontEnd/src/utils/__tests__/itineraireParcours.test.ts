import { describe, it, expect } from 'vitest';
import { lienItineraire, texteParcours } from '../itineraireParcours';

const depart = { nom: 'Kalâa des Béni Hammad', latitude: 35.8, longitude: 4.79 };
const etapes = [
  { nom: 'Mosquée / minaret', latitude: 35.81, longitude: 4.8 },
  { nom: 'Point sans coordonnées' },
  { nom: 'قصر المنار', latitude: 35.82, longitude: 4.81 }
];

describe('itinéraire du parcours', () => {
  it('par coordonnées, dans l’ordre, mode de transport ; étapes sans position ignorées', () => {
    const lien = new URL(lienItineraire(depart, etapes, 'marche')!);
    expect(lien.origin + lien.pathname).toBe('https://www.google.com/maps/dir/');
    expect(lien.searchParams.get('api')).toBe('1');
    expect(lien.searchParams.get('origin')).toBe('35.8,4.79');
    expect(lien.searchParams.get('waypoints')).toBe('35.81,4.8');
    expect(lien.searchParams.get('destination')).toBe('35.82,4.81');
    expect(lien.searchParams.get('travelmode')).toBe('walking');
  });

  it('9 étapes intermédiaires au plus ; rien sans départ ou sans étape localisée', () => {
    const beaucoup = Array.from({ length: 15 }, (_, i) => ({ nom: `É${i}`, latitude: 36 + i / 100, longitude: 3 }));
    expect(new URL(lienItineraire(depart, beaucoup, 'voiture')!).searchParams.get('waypoints')!.split('|')).toHaveLength(9);
    expect(lienItineraire({ nom: 'x' }, etapes, 'voiture')).toBeNull();
    expect(lienItineraire(depart, [{ nom: 'sans position' }], 'velo')).toBeNull();
  });

  it('texte à envoyer : étapes numérotées depuis le site de départ', () => {
    expect(texteParcours('Parcours', 'Kalâa', etapes.slice(0, 1), 'https://maps.example'))
      .toBe('Parcours\n0. Kalâa\n1. Mosquée / minaret\nhttps://maps.example');
  });
});
