import { describe, test, expect } from 'vitest';
import { getSafeRedirectPath, safeExternalUrl } from '../safeUrl';

describe('getSafeRedirectPath', () => {
  test.each([
    '//evil.com',
    '/\\evil.com',
    '/\tevil.com',
    '/\t/evil.com',
    'https://evil.com',
    'javascript:alert(1)',
    'evenements',
    '/auth',
    '/auth?redirect=/x',
    '',
    null,
    42
  ])('refuse %p', (target) => {
    expect(getSafeRedirectPath(target)).toBeNull();
  });

  test('accepte un chemin interne et conserve query + hash', () => {
    expect(getSafeRedirectPath('/evenements/3?a=1#prog')).toBe('/evenements/3?a=1#prog');
  });
});

describe('safeExternalUrl', () => {
  test.each(['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,x', 'vbscript:x', '', undefined])('refuse %p', (u) => {
    expect(safeExternalUrl(u)).toBeUndefined();
  });

  test('accepte http(s) et complète une adresse sans protocole', () => {
    expect(safeExternalUrl('https://musee.dz/page')).toBe('https://musee.dz/page');
    expect(safeExternalUrl('exemple.dz')).toBe('https://exemple.dz/');
  });
});
