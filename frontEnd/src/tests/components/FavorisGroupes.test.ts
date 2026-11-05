/**
 * Espace personnel : les favoris d'artisanat sont bien rangés, et les favoris au-delà des 12 premiers sont demandés.
 */
import { describe, test, expect, vi } from 'vitest';

const get = vi.hoisted(() => vi.fn());
vi.mock('@/services/httpClient', () => ({ httpClient: { get } }));

import { favoriService } from '@/services/favori.service';

describe('favoris groupés', () => {
  test('artisanat rangé à part, et jusqu’à 100 favoris demandés', async () => {
    get.mockResolvedValue({
      success: true,
      data: { favoris: [
        { id_favori: 1, type_entite: 'artisanat', id_entite: 3 },
        { id_favori: 2, type_entite: 'oeuvre', id_entite: 8 },
      ] },
    });
    const res = await favoriService.getAllGrouped();
    expect(get.mock.calls[0][1]).toEqual({ limit: 100 });
    expect(res.data?.artisanats.map((f) => f.id_entite)).toEqual([3]);
    expect(res.data?.oeuvres.map((f) => f.id_entite)).toEqual([8]);
  });
});
