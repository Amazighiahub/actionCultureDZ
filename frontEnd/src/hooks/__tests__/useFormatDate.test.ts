import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFormatDate, getDateLocale } from '@/hooks/useFormatDate';
import { localeDeLangue } from '@/utils/localeLangue';

// Langue de la page modifiable d'un test à l'autre
const langue = { valeur: 'fr' };
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: langue.valeur }, t: (_k: string, d?: string) => d ?? _k }),
}));

const CHIFFRES_ARABES_INDIENS = /[٠-٩]/;
// Midi local : même jour dans tous les fuseaux de test
const D = new Date(2026, 10, 12, 14, 30);

describe('localeDeLangue (table unique, audit V11 COD-7)', () => {
  it('langues du site → locale Intl', () => {
    expect(localeDeLangue('fr')).toBe('fr-FR');
    expect(localeDeLangue('en')).toBe('en-US');
    expect(localeDeLangue('ar')).toBe('ar-DZ-u-nu-latn');
    expect(localeDeLangue('tz-ltn')).toBe('fr-FR');
    expect(localeDeLangue('tz-tfng')).toBe('fr-FR');
    expect(localeDeLangue(undefined)).toBe('fr-FR');
    expect(localeDeLangue('xx')).toBe('fr-FR');
    expect(getDateLocale('ar')).toBe('ar-DZ-u-nu-latn');
  });
});

describe('useFormatDate', () => {
  beforeEach(() => { langue.valeur = 'fr'; });

  it('options Intl classiques, inchangées', () => {
    const { result } = renderHook(() => useFormatDate());
    expect(result.current.formatDate(D, { day: 'numeric', month: 'long', year: 'numeric' })).toBe('12 novembre 2026');
  });

  it('raccourcis de l’ancien useLocalizedDate : dateStyle et timeStyle', () => {
    const { result } = renderHook(() => useFormatDate());
    const f = result.current.formatDate;
    expect(f(D, { dateStyle: 'medium' })).toBe(D.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }));
    expect(f(D, { dateStyle: 'long' })).toBe('12 novembre 2026');
    expect(f(D, { dateStyle: 'full' })).toBe('jeudi 12 novembre 2026');
    expect(f(D, { dateStyle: 'medium', timeStyle: 'short' })).toContain('14:30');
  });

  it('date absente : rien (et non le 1er janvier 1970)', () => {
    const { result } = renderHook(() => useFormatDate());
    expect(result.current.formatDate(null, { dateStyle: 'long' })).toBe('');
    expect(result.current.formatDate(undefined)).toBe('');
  });

  it('dates relatives', () => {
    const { result } = renderHook(() => useFormatDate());
    const maintenant = new Date();
    const hier = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() - 1, 12);
    const ilYa3 = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() - 3, 12);
    expect(result.current.formatDate(maintenant, { relative: true })).toBe("Aujourd'hui");
    expect(result.current.formatDate(hier, { relative: true })).toBe('Hier');
    expect(result.current.formatRelative(ilYa3)).toBe('il y a 3 jours');
  });

  it('périodes', () => {
    const { result } = renderHook(() => useFormatDate());
    const r = result.current.formatDateRange;
    expect(r(new Date(2026, 10, 12), new Date(2026, 10, 15), { dateStyle: 'long' })).toBe('12 - 15 novembre 2026');
    expect(r(new Date(2026, 10, 28), new Date(2026, 11, 2), { dateStyle: 'long' })).toBe('28 novembre 2026 - 2 décembre 2026');
    expect(r(new Date(2026, 10, 12, 10), new Date(2026, 10, 12, 18), { dateStyle: 'long' })).toBe('12 novembre 2026 10:00 - 18:00');
    expect(r(new Date(2026, 10, 12), null, { dateStyle: 'long' })).toBe('12 novembre 2026');
  });

  it('en arabe, les dates gardent les chiffres 0-9', () => {
    langue.valeur = 'ar';
    const { result } = renderHook(() => useFormatDate());
    expect(result.current.formatDate(D, { dateStyle: 'long' })).not.toMatch(CHIFFRES_ARABES_INDIENS);
    expect(result.current.formatDate(D, { dateStyle: 'medium', timeStyle: 'short' })).not.toMatch(CHIFFRES_ARABES_INDIENS);
    expect(result.current.formatDate(D, { dateStyle: 'long' })).toContain('2026');
  });
});
