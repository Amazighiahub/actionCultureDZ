import { describe, it, expect } from 'vitest';
import {
  appliquerLangueDocument,
  directionLangue,
  nomLangue,
  infoLangue,
  estLangueSupportee,
} from '@/types/common/multilingual.types';

describe('appliquerLangueDocument (audit V11 COD-3)', () => {
  const html = document.documentElement;

  it('arabe : lang="ar" (pas « ar-DZ ») et sens de droite à gauche', () => {
    appliquerLangueDocument('ar');
    expect(html.lang).toBe('ar');
    expect(html.dir).toBe('rtl');
  });

  it('tamazight : codes BCP 47, jamais « tz-ltn » / « tz-tfng »', () => {
    appliquerLangueDocument('tz-ltn');
    expect(html.lang).toBe('ber-Latn');
    expect(html.dir).toBe('ltr');
    appliquerLangueDocument('tz-tfng');
    expect(html.lang).toBe('ber-Tfng');
    expect(html.dir).toBe('ltr');
  });

  it('retour au français : gauche à droite', () => {
    appliquerLangueDocument('ar');
    appliquerLangueDocument('fr');
    expect(html.lang).toBe('fr');
    expect(html.dir).toBe('ltr');
  });
});

describe('liste commune des langues (audit V11 COD-6)', () => {
  it('noms et sens, repli sur le code pour une langue inconnue', () => {
    expect(nomLangue('tz-ltn')).toBe('Tamaziɣt');
    expect(nomLangue('xx')).toBe('xx');
    expect(nomLangue('constructor')).toBe('constructor');
    expect(directionLangue('ar')).toBe('rtl');
    expect(directionLangue('xx')).toBe('ltr');
    expect(estLangueSupportee('fr')).toBe(true);
    expect(estLangueSupportee('ar-DZ')).toBe(false);
  });

  it('infoLangue : code HTML du tifinagh', () => {
    expect(infoLangue('tz-tfng')).toEqual({ code: 'tz-tfng', label: 'ⵜⴰⵎⴰⵣⵉⵖⵜ', dir: 'ltr', flag: 'ⵣ', htmlLang: 'ber-Tfng' });
  });
});
