import { describe, it, expect } from 'vitest';
import { delaiAvantReessai } from '../delaiRateLimit';

describe('delaiAvantReessai', () => {
  const maintenant = Date.parse('2026-10-23T10:00:00Z');

  it('compte bloqué : horodatage en millisecondes → temps restant (et non des années)', () => {
    expect(delaiAvantReessai(undefined, { retryAfter: maintenant + 15 * 60_000 }, maintenant)).toBe(15 * 60_000);
  });

  it('limite générale : date ISO → temps restant', () => {
    expect(delaiAvantReessai(undefined, { retryAfter: '2026-10-23T10:05:00.000Z' }, maintenant)).toBe(5 * 60_000);
  });

  it('en-tête Retry-After en secondes, prioritaire sur le corps', () => {
    expect(delaiAvantReessai('30', { retryAfter: maintenant + 999_999 }, maintenant)).toBe(30_000);
  });

  it('valeur inconnue ou illisible → null ; échéance passée → 0', () => {
    expect(delaiAvantReessai(undefined, {}, maintenant)).toBeNull();
    expect(delaiAvantReessai(undefined, { retryAfter: 'bientôt' }, maintenant)).toBeNull();
    expect(delaiAvantReessai(undefined, { retryAfter: maintenant - 1000 }, maintenant)).toBe(0);
  });
});
