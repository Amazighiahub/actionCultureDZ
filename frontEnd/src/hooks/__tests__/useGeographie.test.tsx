/**
 * useWilayas : une seule lecture des wilayas, en cache sous la même clé que les autres pages (audit V11 COD-11)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockWilayas } = vi.hoisted(() => ({ mockWilayas: vi.fn() }));
vi.mock('@/services/wilayaVitrine.service', () => ({ wilayaVitrineService: { wilayas: mockWilayas } }));

import { useWilayas, CLE_WILAYAS } from '../useGeographie';

const ALGER = { id_wilaya: 16, codeW: 16, nom: 'الجزائر', wilaya_name_ascii: 'Alger' };

const preparer = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
};

describe('useWilayas', () => {
  beforeEach(() => mockWilayas.mockReset());

  it('renvoie la liste et la garde sous la clé partagée', async () => {
    mockWilayas.mockResolvedValue([ALGER]);
    const { client, wrapper } = preparer();
    const { result } = renderHook(() => useWilayas(), { wrapper });
    expect(result.current.loading).toBe(true);
    expect(result.current.wilayas).toEqual([]);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.wilayas).toEqual([ALGER]);
    expect(result.current.error).toBeNull();
    expect(client.getQueryData([...CLE_WILAYAS])).toEqual([ALGER]);
  });

  it('deux écrans ne font qu’une seule lecture', async () => {
    mockWilayas.mockResolvedValue([ALGER]);
    const { wrapper } = preparer();
    const { result } = renderHook(() => [useWilayas(), useWilayas()], { wrapper });
    await waitFor(() => expect(result.current[1].wilayas).toEqual([ALGER]));
    expect(mockWilayas).toHaveBeenCalledTimes(1);
  });

  it('en cas d’échec : liste vide (jamais null), message, et « Réessayer » relit', async () => {
    mockWilayas.mockRejectedValueOnce(new Error('réseau'));
    const { wrapper } = preparer();
    const { result } = renderHook(() => useWilayas(), { wrapper });
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.wilayas).toEqual([]);

    mockWilayas.mockResolvedValue([ALGER]);
    act(() => result.current.recharger());
    await waitFor(() => expect(result.current.wilayas).toEqual([ALGER]));
    expect(result.current.error).toBeNull();
  });
});
