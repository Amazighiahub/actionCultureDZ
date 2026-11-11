import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';

// Langue de la page modifiable d'un test à l'autre
const langue = { valeur: 'fr' };
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: langue.valeur }, t: (_k: string, d?: string) => d ?? _k }),
}));

const CHIFFRES_ARABES_INDIENS = /[٠-٩٫٬]/;

describe('useLocalizedNumber : chiffres occidentaux en arabe (audit V11 UX-30)', () => {
  beforeEach(() => { langue.valeur = 'fr'; });

  it('en arabe, un prix garde les chiffres 0-9', () => {
    langue.valeur = 'ar';
    const { result } = renderHook(() => useLocalizedNumber());
    const prix = result.current.formatPrice(28000);
    expect(prix).not.toMatch(CHIFFRES_ARABES_INDIENS);
    expect(prix).toMatch(/28[.,   ]?000/);
  });

  it('en arabe, nombres, décimales et fourchettes de prix restent en chiffres 0-9', () => {
    langue.valeur = 'ar';
    const { result } = renderHook(() => useLocalizedNumber());
    expect(result.current.formatNumber(1234)).not.toMatch(CHIFFRES_ARABES_INDIENS);
    expect(result.current.formatNumber(4.5, { minimumFractionDigits: 1, maximumFractionDigits: 1 })).toMatch(/4[.,]5/);
    expect(result.current.formatPriceRange(500, 2000)).not.toMatch(CHIFFRES_ARABES_INDIENS);
  });

  it('les séparateurs annoncés en arabe correspondent à ceux réellement affichés', () => {
    langue.valeur = 'ar';
    const { result } = renderHook(() => useLocalizedNumber());
    expect(result.current.getDecimalSeparator()).not.toMatch(CHIFFRES_ARABES_INDIENS);
    expect(result.current.formatNumber(1.5, { minimumFractionDigits: 1 })).toContain(result.current.getDecimalSeparator());
  });

  it('la conversion explicite reste possible en arabe', () => {
    langue.valeur = 'ar';
    const { result } = renderHook(() => useLocalizedNumber());
    expect(result.current.convertToArabicNumerals('12')).toBe('١٢');
  });

  it('en français, rien ne change', () => {
    const { result } = renderHook(() => useLocalizedNumber());
    expect(result.current.formatNumber(1234)).toMatch(/1[   ]234/);
    expect(result.current.convertToArabicNumerals('12')).toBe('12');
  });
});
