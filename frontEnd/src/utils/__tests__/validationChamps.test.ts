import { describe, expect, it } from 'vitest';
import { emailValide, lienWebValide, nombreHorsLimites } from '@/utils/validationChamps';

describe('règles de saisie communes', () => {
  it('e-mail', () => {
    expect(emailValide('lina@example.com')).toBe(true);
    expect(emailValide('  lina@example.com ')).toBe(true);
    expect(emailValide('lina@example')).toBe(false);
    expect(emailValide('lina example.com')).toBe(false);
    expect(emailValide('')).toBe(false);
    expect(emailValide(undefined)).toBe(false);
  });

  it('lien web', () => {
    expect(lienWebValide('https://example.com')).toBe(true);
    expect(lienWebValide('http://example.com/page')).toBe(true);
    expect(lienWebValide('example.com')).toBe(false);
    expect(lienWebValide('javascript:alert(1)')).toBe(false);
  });

  it('nombre facultatif entre deux limites', () => {
    expect(nombreHorsLimites('', { min: 1 })).toBe(false);
    expect(nombreHorsLimites(undefined, { min: 1 })).toBe(false);
    expect(nombreHorsLimites('5', { min: 1, max: 10 })).toBe(false);
    expect(nombreHorsLimites(0, { min: 1 })).toBe(true);
    expect(nombreHorsLimites('-3', { min: 0 })).toBe(true);
    expect(nombreHorsLimites('400', { max: 365 })).toBe(true);
    expect(nombreHorsLimites('2.5', { min: 1, entier: true })).toBe(true);
    expect(nombreHorsLimites('abc', { min: 0 })).toBe(true);
    expect(nombreHorsLimites(Number.NaN, { min: 0 })).toBe(true);
  });
});
