/**
 * Anti-retour (2026-11-19, lot 3) : l'invitation à se connecter pour un favori est faite par l'outil commun
 * (avant : recopiée dans 5 pages et 2 cartes). Non connecté : invitation, aucun appel au serveur.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { connecte, mockInviter, mockToggle, mockCheck } = vi.hoisted(() => ({
  connecte: { valeur: false }, mockInviter: vi.fn(), mockToggle: vi.fn(), mockCheck: vi.fn(),
}));

vi.mock('@/providers/PermissionsProvider', () => ({ usePermissionsContext: () => ({ isAuthenticated: connecte.valeur }) }));
vi.mock('@/hooks/useInviterConnexion', () => ({ useInviterConnexion: () => mockInviter }));
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/services/favori.service', () => ({
  favoriService: { toggle: mockToggle, check: mockCheck, getIds: vi.fn().mockResolvedValue([]), add: vi.fn(), removeById: vi.fn() },
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k, i18n: { language: 'fr' } }) }));

import { useFavoriCheck, useFavoriCarte } from '../useFavoris';

const enveloppe = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
);

describe('favoris : outil commun', () => {
  beforeEach(() => { vi.clearAllMocks(); connecte.valeur = false; });

  it('page de détail, non connecté : invitation à se connecter, rien envoyé', async () => {
    const { result } = renderHook(() => useFavoriCheck('oeuvre', 9), { wrapper: enveloppe });
    await act(async () => { await result.current.toggle(); });
    expect(mockInviter).toHaveBeenCalledWith('Connectez-vous pour ajouter aux favoris');
    expect(mockCheck).not.toHaveBeenCalled();
  });

  it('carte, non connecté puis connecté : invitation, puis ajout affiché aussitôt', async () => {
    const { result, rerender } = renderHook(() => useFavoriCarte('artisanat', 4), { wrapper: enveloppe });
    await act(async () => { await result.current.basculer(); });
    expect(mockInviter).toHaveBeenCalled();
    expect(mockToggle).not.toHaveBeenCalled();

    connecte.valeur = true;
    mockToggle.mockResolvedValue({ success: true, data: { added: true } });
    rerender();
    await act(async () => { await result.current.basculer(); });
    expect(mockToggle).toHaveBeenCalledWith('artisanat', 4);
    expect(result.current.isFavorite).toBe(true);
  });
});
