import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const navigate = vi.fn();
const refreshPermissions = vi.fn().mockResolvedValue(undefined);
const logoutApi = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useLocation: () => ({ pathname: '/', search: '', state: null })
}));
vi.mock('@/providers/PermissionsProvider', () => ({
  usePermissionsContext: () => ({
    user: { id_user: 1 }, loading: false, isAuthenticated: true, isAdmin: false,
    isProfessional: false, isVisitor: true, needsValidation: false, statusMessage: '',
    refreshPermissions
  })
}));
vi.mock('@/services/auth.service', () => ({
  authService: { logout: (...a: unknown[]) => logoutApi(...a) }
}));

import { queryClient } from '@/lib/queryClient';
import { useAuth } from '../useAuth';

describe('useAuth.logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.setQueryData(['mes-favoris'], [{ id: 1 }]);
    localStorage.setItem('user', JSON.stringify({ email: 'a@b.dz' }));
  });

  test('vide le cache des requêtes et redirige', async () => {
    logoutApi.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.logout(); });
    expect(queryClient.getQueryData(['mes-favoris'])).toBeUndefined();
    expect(navigate).toHaveBeenCalledWith('/auth');
  });

  test('déconnexion pour inactivité : retour à la page quittée après la reconnexion (audit V11 FRM-23)', async () => {
    logoutApi.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.logout({ retour: '/admin/dashboard?onglet=moderation' }); });
    expect(navigate).toHaveBeenCalledWith(`/auth?redirect=${encodeURIComponent('/admin/dashboard?onglet=moderation')}`);
  });

  test('retour vers un autre site refusé', async () => {
    logoutApi.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.logout({ retour: '//exemple.com/piege' }); });
    expect(navigate).toHaveBeenCalledWith('/auth');
  });

  test('vide aussi le cache si l\'appel réseau échoue', async () => {
    logoutApi.mockRejectedValue(new Error('réseau'));
    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.logout(); });
    expect(queryClient.getQueryData(['mes-favoris'])).toBeUndefined();
    expect(refreshPermissions).toHaveBeenCalled();
  });
});
