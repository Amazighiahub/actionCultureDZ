/**
 * Fournisseur des permissions : valeur du contexte stable entre deux rendus (audit V11 COD-24),
 * refreshPermissions renvoie la personne chargée (COD-23), administrateur par le rôle seulement.
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import React, { useState } from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';

const auth = vi.hoisted(() => ({
  isAuthenticated: vi.fn(() => true),
  hasSessionHint: vi.fn(() => true),
  getCurrentUser: vi.fn(),
  getCurrentUserFromCache: vi.fn(() => null),
  clearSession: vi.fn(),
}));
vi.mock('@/services/auth.service', () => ({ authService: auth, default: auth }));

import { PermissionsProvider, usePermissionsContext } from '@/providers/PermissionsProvider';

type Valeur = ReturnType<typeof usePermissionsContext>;
const vues: Valeur[] = [];

const Sonde = React.memo(function Sonde() {
  const v = usePermissionsContext();
  vues.push(v);
  return <p>{v.loading ? 'chargement' : v.isAdmin ? 'admin' : v.isAuthenticated ? 'connecte' : 'non-connecte'}</p>;
});

const Parent = () => {
  const [n, setN] = useState(0);
  return (
    <PermissionsProvider>
      <button onClick={() => setN(n + 1)}>rendu {n}</button>
      <Sonde />
    </PermissionsProvider>
  );
};

const admin = { id_user: 1, id_type_user: 2, Roles: [{ nom_role: 'Administrateur' }] };
const visiteur = { id_user: 2, id_type_user: 1, Roles: [] };

beforeEach(() => {
  vi.clearAllMocks();
  vues.length = 0;
});

describe('PermissionsProvider', () => {
  test('valeur du contexte inchangée quand le parent se redessine', async () => {
    auth.getCurrentUser.mockResolvedValue({ success: true, data: visiteur });
    render(<Parent />);
    await screen.findByText('connecte');
    const avant = vues.length;
    const valeur = vues[vues.length - 1];
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent('rendu 2');
    // Sonde (mémorisée) ne se redessine pas : la valeur n'a pas changé
    expect(vues.length).toBe(avant);
    expect(vues[vues.length - 1]).toBe(valeur);
  });

  test('refreshPermissions renvoie la personne et met à jour les rôles', async () => {
    auth.getCurrentUser.mockResolvedValue({ success: true, data: visiteur });
    render(<Parent />);
    await screen.findByText('connecte');
    const { refreshPermissions, isOwner, hasRole } = vues[vues.length - 1];
    expect(isOwner(2)).toBe(true);
    expect(hasRole('Administrateur')).toBe(false);

    auth.getCurrentUser.mockResolvedValue({ success: true, data: admin });
    let lu: unknown;
    await act(async () => { lu = await refreshPermissions(); });
    expect(lu).toEqual(admin);
    expect(auth.getCurrentUser).toHaveBeenCalledTimes(2);
    expect(screen.getByText('admin')).toBeInTheDocument();
    const apres = vues[vues.length - 1];
    // Fonctions stables pour loadUser ; aides recalculées avec la nouvelle personne
    expect(apres.refreshPermissions).toBe(refreshPermissions);
    expect(apres.hasRole('Administrateur')).toBe(true);
    expect(apres.isOwner(2)).toBe(false);
  });

  test('session refusée : null, personne et aucun rôle', async () => {
    auth.getCurrentUser.mockResolvedValue({ success: true, data: admin });
    render(<Parent />);
    await screen.findByText('admin');
    const { refreshPermissions } = vues[vues.length - 1];
    auth.getCurrentUser.mockResolvedValue({ success: false, error: 'non' });
    let lu: unknown = 'non lu';
    await act(async () => { lu = await refreshPermissions(); });
    expect(lu).toBeNull();
    expect(screen.getByText('non-connecte')).toBeInTheDocument();
    const v = vues[vues.length - 1];
    expect(v.isAdmin).toBe(false);
    expect(v.hasRole('Administrateur')).toBe(false);
    expect(v.canAccess).toBe(false);
  });

  test('erreur réseau : null renvoyé (la connexion ne redirige pas)', async () => {
    auth.getCurrentUser.mockRejectedValue(new Error('Network Error'));
    render(<Parent />);
    await screen.findByText('non-connecte');
    const { refreshPermissions } = vues[vues.length - 1];
    let lu: unknown = 'non lu';
    await act(async () => { lu = await refreshPermissions(); });
    expect(lu).toBeNull();
  });

  test('type de compte 29 sans le rôle : pas administrateur', async () => {
    auth.getCurrentUser.mockResolvedValue({ success: true, data: { id_user: 3, id_type_user: 29, Roles: [] } });
    render(<Parent />);
    await screen.findByText('connecte');
    expect(vues[vues.length - 1].isAdmin).toBe(false);
  });
});
