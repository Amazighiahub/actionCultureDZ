import { describe, it, expect } from 'vitest';
import { slugify, idFromSlug, professionnelPath } from '../slug';

describe('adresses lisibles', () => {
  it('slugify : accents, ligatures, ponctuation', () => {
    expect(slugify("Amina Bénali")).toBe('amina-benali');
    expect(slugify("L'Œuvre — d'Hélène")).toBe('l-oeuvre-d-helene');
    expect(slugify('مهرجان')).toBe('');
  });

  it('idFromSlug : seul le numéro compte', () => {
    expect(idFromSlug('17-amina-benali')).toBe(17);
    expect(idFromSlug('17')).toBe(17);
    expect(idFromSlug('amina')).toBeNull();
    expect(idFromSlug('17abc')).toBeNull();
    expect(idFromSlug(undefined)).toBeNull();
  });

  it('professionnelPath : avec ou sans nom latin', () => {
    expect(professionnelPath(17, 'Amina', 'Bénali')).toBe('/professionnels/17-amina-benali');
    expect(professionnelPath(5, 'أمينة', null)).toBe('/professionnels/5');
  });
});
