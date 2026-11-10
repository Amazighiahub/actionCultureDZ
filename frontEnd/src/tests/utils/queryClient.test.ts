import { describe, expect, it } from 'vitest';
import { queryClient } from '@/lib/queryClient';

describe('queryClient', () => {
  it('ne renvoie jamais un envoi tout seul (inscription, commentaire, avis : pas de doublon)', () => {
    expect(queryClient.getDefaultOptions().mutations?.retry).toBe(0);
  });

  it('ne relit pas une page introuvable (404), relit une erreur passagère au plus deux fois', () => {
    const retry = queryClient.getDefaultOptions().queries?.retry as (n: number, e: unknown) => boolean;
    expect(retry(0, { status: 404 })).toBe(false);
    expect(retry(0, { status: 503 })).toBe(true);
    expect(retry(2, { status: 503 })).toBe(false);
  });
});
