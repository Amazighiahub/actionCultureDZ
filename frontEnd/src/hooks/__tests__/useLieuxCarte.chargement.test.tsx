/**
 * Anti-retour (2026-11-19) : chargement des lieux de la carte d'exploration.
 * - une réponse en échec devient une erreur (la carte affiche « Réessayer » au lieu d'une carte vide) ;
 * - économie de données : rien n'est téléchargé par les rubriques.
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));
vi.mock('@/services/httpClient', () => ({ httpClient: { get: mockGet } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { language: 'fr' } }) }));

import { useLieuxCarte } from '../useLieuxCarte';

const enveloppe = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe('useLieuxCarte : chargement', () => {
  beforeEach(() => mockGet.mockReset());

  test('réponse en échec : erreur signalée, pas une liste vide silencieuse', async () => {
    mockGet.mockResolvedValue({ success: false, error: 'Service indisponible' });
    const { result } = renderHook(() => useLieuxCarte(), { wrapper: enveloppe() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.lieux).toEqual([]);
  });

  test('lignes reçues : lieux lus', async () => {
    mockGet.mockResolvedValue({ success: true, data: [[1, 'Timgad', 35.48, 6.47, 'site_archeologique', null, 1, 1, 5, 23, null]] });
    const { result } = renderHook(() => useLieuxCarte(), { wrapper: enveloppe() });
    await waitFor(() => expect(result.current.lieux).toHaveLength(1));
    expect(result.current.lieux[0]).toMatchObject({ nom: 'Timgad', wilaya: 5, nbPoints: 23 });
  });

  test('économie de données : aucun téléchargement', async () => {
    const { result } = renderHook(() => useLieuxCarte({ actif: false }), { wrapper: enveloppe() });
    await new Promise((r) => setTimeout(r, 50));
    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });
});
