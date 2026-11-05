/**
 * Menu d'un commentaire : qui peut faire quoi, et le message du serveur quand il refuse.
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

const { auth, service, toast } = vi.hoisted(() => ({
  auth: { value: {} as Record<string, unknown> },
  service: {
    updateCommentaire: vi.fn(),
    deleteCommentaire: vi.fn(),
    moderateCommentaire: vi.fn(),
    signalerCommentaire: vi.fn(),
  },
  toast: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, d?: unknown) => (typeof d === 'string' ? d : _k) }),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth.value }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/services/commentaire.service', () => ({ commentaireService: service }));

import ActionsCommentaire from '@/components/shared/ActionsCommentaire';

const commentaire = { id_commentaire: 5, id_user: 7, contenu: 'Un commentaire' };
const ouvrirMenu = async (u: ReturnType<typeof userEvent.setup>) => {
  await u.click(screen.getByRole('button', { name: /options/i }));
};

describe('ActionsCommentaire', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('visiteur non connecté : aucun menu', () => {
    auth.value = { isAuthenticated: false };
    const { container } = render(<ActionsCommentaire commentaire={commentaire} />);
    expect(container.firstChild).toBeNull();
  });

  test('auteur : modifier et supprimer, pas signaler', async () => {
    auth.value = { isAuthenticated: true, user: { id_user: 7 }, isAdmin: false };
    const u = userEvent.setup();
    render(<ActionsCommentaire commentaire={commentaire} />);
    await ouvrirMenu(u);
    expect(screen.getByRole('menuitem', { name: /modifier/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /supprimer/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /signaler/i })).toBeNull();
  });

  test('autre membre : signaler seulement', async () => {
    auth.value = { isAuthenticated: true, user: { id_user: 8 }, isAdmin: false };
    const u = userEvent.setup();
    render(<ActionsCommentaire commentaire={commentaire} />);
    await ouvrirMenu(u);
    expect(screen.getByRole('menuitem', { name: /signaler/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /modifier/i })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: /supprimer/i })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: /masquer/i })).toBeNull();
  });

  test('administration : masquer et supprimer le commentaire d’un autre', async () => {
    auth.value = { isAuthenticated: true, user: { id_user: 1 }, isAdmin: true };
    service.moderateCommentaire.mockResolvedValue({ success: true });
    const onChange = vi.fn();
    const u = userEvent.setup();
    render(<ActionsCommentaire commentaire={commentaire} onChange={onChange} />);
    await ouvrirMenu(u);
    await u.click(screen.getByRole('menuitem', { name: /masquer/i }));
    const boutons = await screen.findAllByRole('button', { name: /masquer/i });
    await u.click(boutons[boutons.length - 1]);
    await waitFor(() => expect(service.moderateCommentaire).toHaveBeenCalledWith(5, 'rejete'));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
  });

  test('modifier : texte trop court refusé, puis enregistré et liste rechargée', async () => {
    auth.value = { isAuthenticated: true, user: { id_user: 7 }, isAdmin: false };
    service.updateCommentaire.mockResolvedValue({ success: true });
    const onChange = vi.fn();
    const u = userEvent.setup();
    render(<ActionsCommentaire commentaire={commentaire} onChange={onChange} />);
    await ouvrirMenu(u);
    await u.click(screen.getByRole('menuitem', { name: /modifier/i }));
    const zone = await screen.findByRole('textbox');
    await u.clear(zone);
    await u.type(zone, 'ab');
    await u.click(screen.getByRole('button', { name: /enregistrer/i }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(service.updateCommentaire).not.toHaveBeenCalled();
    await u.clear(zone);
    await u.type(zone, 'Texte corrigé');
    await u.click(screen.getByRole('button', { name: /enregistrer/i }));
    await waitFor(() => expect(service.updateCommentaire).toHaveBeenCalledWith(5, { contenu: 'Texte corrigé' }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
  });

  test('refus du serveur : son message s’affiche et la liste ne bouge pas', async () => {
    auth.value = { isAuthenticated: true, user: { id_user: 7 }, isAdmin: false };
    service.updateCommentaire.mockResolvedValue({ success: false, error: 'Adresse e-mail non vérifiée' });
    const onChange = vi.fn();
    const u = userEvent.setup();
    render(<ActionsCommentaire commentaire={commentaire} onChange={onChange} />);
    await ouvrirMenu(u);
    await u.click(screen.getByRole('menuitem', { name: /modifier/i }));
    await screen.findByRole('textbox');
    await u.click(screen.getByRole('button', { name: /enregistrer/i }));
    expect(await screen.findByText('Adresse e-mail non vérifiée')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
