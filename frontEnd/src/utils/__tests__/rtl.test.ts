import { describe, it, expect } from 'vitest';
import { separateurListe, formatCurrency, formatNumber } from '@/utils/rtl';

const CHIFFRES_ARABES_INDIENS = /[٠-٩٫٬]/;

describe('separateurListe (audit V11 UX-30)', () => {
  it('virgule arabe « ، » en arabe', () => {
    expect(['Timgad', 'Batna'].join(separateurListe('ar'))).toBe('Timgad، Batna');
    expect(separateurListe('ar-DZ')).toBe('، ');
  });
  it('virgule latine dans les autres langues ou sans langue', () => {
    expect(separateurListe('fr')).toBe(', ');
    expect(separateurListe('tz-tfng')).toBe(', ');
    expect(separateurListe(undefined)).toBe(', ');
  });
});

describe('formatNumber / formatCurrency : chiffres 0-9 en arabe', () => {
  it('ne produit plus de chiffres arabes-indiens', () => {
    expect(formatNumber(5000, 'ar')).not.toMatch(CHIFFRES_ARABES_INDIENS);
    expect(formatCurrency(5000, 'ar-DZ')).not.toMatch(CHIFFRES_ARABES_INDIENS);
  });
});
