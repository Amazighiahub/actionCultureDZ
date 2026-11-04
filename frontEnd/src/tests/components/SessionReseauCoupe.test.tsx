/**
 * Ouverture de l'application avec un réseau coupé : la personne n'est pas déconnectée pour de bon.
 * Seul un refus du serveur (401) efface le repère de session.
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const auth = vi.hoisted(() => ({
  isAuthenticated: vi.fn(() => false),
  hasSessionHint: vi.fn(() => true),
  getCurrentUser: vi.fn(),
  getCurrentUserFromCache: vi.fn(() => null),
  clearSession: vi.fn(),
}));

vi.mock('@/services/auth.service', () => ({ authService: auth, default: auth }));
vi.mock('@/services/permissions.service', () => {
  const service = {
    setCurrentUser: vi.fn(), isAdmin: () => false, isProfessional: () => false, isVisitor: () => false,
    needsValidation: () => false, getUserStatusMessage: () => '',
  };
  return { permissionsService: service, default: service };
});

import { PermissionsProvider, usePermissionsContext } from '@/providers/PermissionsProvider';

const Etat = () => {
  const { isAuthenticated, loading } = usePermissionsContext();
  return <p>{loading ? 'chargement' : isAuthenticated ? 'connecte' : 'non-connecte'}</p>;
};

beforeEach(() => vi.clearAllMocks());
const ouvrir = async () => {
  render(<PermissionsProvider><Etat /></PermissionsProvider>);
  await screen.findByText(/^(connecte|non-connecte)$/);
};

describe('session au démarrage', () => {
  test('réseau coupé : le repère de session reste', async () => {
    auth.getCurrentUser.mockRejectedValue(new Error('Network Error'));
    await ouvrir();
    expect(auth.clearSession).not.toHaveBeenCalled();
  });

  test('serveur indisponible : le repère de session reste', async () => {
    auth.getCurrentUser.mockRejectedValue(Object.assign(new Error('Erreur serveur'), { status: 503 }));
    await ouvrir();
    expect(auth.clearSession).not.toHaveBeenCalled();
  });

  test('refus du serveur : la session est oubliée', async () => {
    auth.getCurrentUser.mockRejectedValue(Object.assign(new Error('Refusé'), { status: 401 }));
    await ouvrir();
    expect(auth.clearSession).toHaveBeenCalledTimes(1);
  });

  test('le réseau revient : la personne est retrouvée', async () => {
    auth.getCurrentUser.mockRejectedValueOnce(new Error('Network Error'));
    await ouvrir();
    expect(screen.getByText('non-connecte')).toBeInTheDocument();
    auth.getCurrentUser.mockResolvedValue({ success: true, data: { id_user: 1 } });
    window.dispatchEvent(new Event('online'));
    await waitFor(() => expect(screen.getByText('connecte')).toBeInTheDocument());
  });
});
