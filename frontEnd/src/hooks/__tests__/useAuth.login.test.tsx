/**
 * Connexion : une seule lecture de la personne (celle du fournisseur), pas d'attente artificielle,
 * redirection administrateur par le rôle seulement (audit V11 COD-23).
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { CurrentUser } from '@/services/auth.service';

const navigate = vi.fn();
const refreshPermissions = vi.fn();
const loginApi = vi.fn();
const getCurrentUser = vi.fn();
let lieu: { pathname: string; search: string; state: unknown } = { pathname: '/auth', search: '', state: null };

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useLocation: () => lieu
}));
vi.mock('@/providers/PermissionsProvider', () => ({
  usePermissionsContext: () => ({
    user: null, loading: false, isAuthenticated: false, isAdmin: false,
    isProfessional: false, isVisitor: false, needsValidation: false, statusMessage: null,
    refreshPermissions
  })
}));
vi.mock('@/services/auth.service', () => ({
  authService: {
    login: (...a: unknown[]) => loginApi(...a),
    getCurrentUser: (...a: unknown[]) => getCurrentUser(...a),
    isAuthenticated: () => true,
  }
}));

import { permissionsService } from '@/services/permissions.service';
import { useAuth } from '../useAuth';

const personne = (p: Partial<CurrentUser>): CurrentUser => ({ id_user: 7, id_type_user: 1, Roles: [], ...p }) as CurrentUser;

/** Le fournisseur met à jour le service de permissions puis renvoie la personne chargée */
const chargera = (u: CurrentUser | null) => {
  refreshPermissions.mockImplementation(async () => { permissionsService.setCurrentUser(u); return u; });
};

const connecter = async () => {
  const { result } = renderHook(() => useAuth());
  let r: Awaited<ReturnType<typeof result.current.login>> | undefined;
  await act(async () => { r = await result.current.login({ email: 'a@b.dz', password: 'x' } as never); });
  return r;
};

describe('useAuth.login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissionsService.setCurrentUser(null);
    lieu = { pathname: '/auth', search: '', state: null };
    loginApi.mockResolvedValue({ success: true, data: {} });
  });

  test('une seule lecture de la personne : pas de second appel à /users/me', async () => {
    chargera(personne({}));
    const r = await connecter();
    expect(r).toEqual({ success: true });
    expect(refreshPermissions).toHaveBeenCalledTimes(1);
    expect(getCurrentUser).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/');
  });

  test('pas d\'attente artificielle', async () => {
    chargera(personne({}));
    const espion = vi.spyOn(globalThis, 'setTimeout');
    await connecter();
    expect(espion.mock.calls.some(([, delai]) => delai === 100)).toBe(false);
    espion.mockRestore();
  });

  test('rôle Administrateur : tableau de bord admin', async () => {
    chargera(personne({ id_type_user: 2, Roles: [{ nom_role: 'Administrateur' }] as CurrentUser['Roles'] }));
    await connecter();
    expect(navigate).toHaveBeenCalledWith('/admin/dashboard');
  });

  test('rôle Super Admin : même règle que le reste de l\'application', async () => {
    chargera(personne({ id_type_user: 2, Roles: [{ nom_role: 'Super Admin' }] as CurrentUser['Roles'] }));
    await connecter();
    expect(navigate).toHaveBeenCalledWith('/admin/dashboard');
  });

  test('sans le rôle, pas d\'administration (le type de compte ne suffit pas)', async () => {
    chargera(personne({ id_type_user: 29, Roles: [{ nom_role: 'Professionnel' }] as CurrentUser['Roles'] }));
    await connecter();
    expect(navigate).toHaveBeenCalledWith('/dashboard-pro');
    expect(navigate).not.toHaveBeenCalledWith('/admin/dashboard');
  });

  test('personne non confirmée par le serveur : succès mais aucune redirection', async () => {
    chargera(null);
    const r = await connecter();
    expect(r).toEqual({ success: true });
    expect(navigate).not.toHaveBeenCalled();
  });

  test('redirection interne demandée gardée, autre site refusé', async () => {
    chargera(personne({ Roles: [{ nom_role: 'Administrateur' }] as CurrentUser['Roles'] }));
    lieu = { pathname: '/auth', search: '?redirect=%2Fevenements%2F3', state: null };
    await connecter();
    expect(navigate).toHaveBeenCalledWith('/evenements/3', { replace: true });

    navigate.mockClear();
    lieu = { pathname: '/auth', search: '?redirect=%2F%2Fexemple.com', state: null };
    await connecter();
    expect(navigate).toHaveBeenCalledWith('/admin/dashboard');
  });

  test('identifiants refusés : erreur, pas de lecture de la personne', async () => {
    loginApi.mockResolvedValue({ success: false, error: 'non', status: 401 });
    const r = await connecter();
    expect(r?.success).toBe(false);
    expect(r?.status).toBe(401);
    expect(refreshPermissions).not.toHaveBeenCalled();
  });
});
