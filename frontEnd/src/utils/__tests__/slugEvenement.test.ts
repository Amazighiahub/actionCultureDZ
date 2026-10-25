import { describe, test, expect } from 'vitest';
import { evenementPath, idFromSlug } from '../slug';

describe('adresse lisible d’un événement', () => {
  test('numéro puis nom, sans accents ni ponctuation', () => {
    expect(evenementPath(1, 'Salon de la poterie traditionnelle d’Aït Smaïl — 9ᵉ édition'))
      .toBe('/evenements/1-salon-de-la-poterie-traditionnelle-d-ait-smail-9-edition');
  });

  test('nom multilingue : le français d’abord ; sans nom latin, le numéro seul', () => {
    expect(evenementPath(7, { fr: 'Festival du film amazigh', ar: 'مهرجان الفيلم الأمازيغي' })).toBe('/evenements/7-festival-du-film-amazigh');
    expect(evenementPath(8, { ar: 'مهرجان' })).toBe('/evenements/8');
    expect(evenementPath(9)).toBe('/evenements/9');
  });

  test('l’ancien lien /evenements/1 et le nouveau mènent au même événement', () => {
    expect(idFromSlug('1')).toBe(1);
    expect(idFromSlug('1-salon-de-la-poterie-traditionnelle-d-ait-smail')).toBe(1);
    expect(idFromSlug('salon')).toBeNull();
  });
});
