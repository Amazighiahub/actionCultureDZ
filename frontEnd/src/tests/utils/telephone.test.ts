import { describe, expect, it } from 'vitest';
import { normaliserTelephone, splitPhone, telephoneValide } from '@/utils/telephone';

describe('téléphone', () => {
  it('champ effacé (seul l’indicatif) : vide, donc accepté pour un champ facultatif', () => {
    expect(normaliserTelephone('+213 ')).toBe('');
    expect(normaliserTelephone('')).toBe('');
    expect(telephoneValide('+213 ')).toBe(true);
  });

  it('numéro algérien tapé avec son 0 : le 0 est retiré après l’indicatif', () => {
    expect(normaliserTelephone('+213 0555 12 34 56')).toBe('+213555123456');
    expect(normaliserTelephone('+213 555-12-34-56')).toBe('+213555123456');
  });

  it('autre pays et numéro trop court', () => {
    expect(normaliserTelephone('+33 6 12 34 56 78')).toBe('+33612345678');
    expect(telephoneValide('+213 55')).toBe(false);
  });

  it('découpe indicatif / numéro, Algérie par défaut', () => {
    expect(splitPhone('+213 555')).toEqual({ dialCode: '+213', local: '555' });
    expect(splitPhone('0555')).toEqual({ dialCode: '+213', local: '0555' });
  });
});
