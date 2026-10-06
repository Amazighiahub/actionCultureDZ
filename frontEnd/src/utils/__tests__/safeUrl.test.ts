import { describe, test, expect, vi } from 'vitest';
import { getSafeRedirectPath, safeExternalUrl, getAllowedEmbedUrl } from '../safeUrl';

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

describe('getAllowedEmbedUrl', () => {
  test.each([
    'https://evil.tld/?youtube.com',
    'https://youtube.com.evil.tld/x',
    'http://www.youtube.com/embed/abc',
    'javascript:alert(1)',
    '<img src=x onerror=alert(1)>',
    '<iframe src="https://evil.tld/?vimeo.com"></iframe>'
  ])('refuse %p', (u) => {
    expect(getAllowedEmbedUrl(u)).toBeUndefined();
  });

  test('accepte une URL ou un code iframe d\'un hôte autorisé', () => {
    expect(getAllowedEmbedUrl('https://www.youtube.com/embed/abc')).toBe('https://www.youtube.com/embed/abc');
    expect(getAllowedEmbedUrl('<iframe src="https://player.vimeo.com/video/1" onload="x()"></iframe>'))
      .toBe('https://player.vimeo.com/video/1');
  });

  test('l\'analyse d\'un code malveillant n\'exécute rien', () => {
    const spy = vi.fn();
    (window as unknown as { __pwn: () => void }).__pwn = spy;
    getAllowedEmbedUrl('<img src="x" onerror="window.__pwn()"><iframe src="https://youtube.com/embed/a"></iframe>');
    expect(spy).not.toHaveBeenCalled();
  });
});
