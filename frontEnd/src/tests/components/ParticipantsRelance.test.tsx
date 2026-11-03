/**
 * Bouton « Renvoyer à ceux qui n'ont pas fini » : visible seulement s'il y a quelqu'un à relancer,
 * avec le bon nombre, une confirmation avant l'envoi et un bilan.
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

const { mockGet, mockPost, mockToast } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockToast: vi.fn(),
}));

vi.mock('@/services/httpClient', () => ({
  httpClient: { get: mockGet, post: mockPost, put: vi.fn() },
}));
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));
vi.mock('react-i18next', async (original) => ({
  ...(await original<typeof import('react-i18next')>()),
  useTranslation: () => ({
    t: (cle: string, defaut?: unknown, options?: Record<string, unknown>) => {
      const brut = typeof defaut === 'string' ? defaut : cle;
      const valeurs = (typeof defaut === 'object' ? defaut : options) as Record<string, unknown> | undefined;
      return brut.replace(/\{\{(\w+)\}\}/g, (_, c) => String(valeurs?.[c] ?? ''));
    },
    i18n: { language: 'fr' },
  }),
}));
vi.mock('@/components/event/ImportInscriptionsDialog', () => ({ default: () => null }));

import ParticipantsManager from '@/components/event/ParticipantsManager';

const participant = (id: number, verifie: boolean, statut = 'inscrit') => ({
  id, id_user: id, statut_participation: statut, date_inscription: '2026-11-01T10:00:00Z',
  User: { id_user: id, nom: `Nom${id}`, prenom: 'Exemple', email: `p${id}@example.com`, email_verifie: verifie },
});

const afficher = (liste: unknown[]) => {
  mockGet.mockImplementation(async (url: string) => (url.includes('/participants')
    ? { success: true, data: liste }
    : { success: true, data: [] }));
  return render(<ParticipantsManager evenementId={2} evenementNom="Chantier" />);
};

beforeEach(() => vi.clearAllMocks());

describe('relance des participants', () => {
  test('compte seulement ceux qui n’ont pas fini', async () => {
    afficher([participant(1, false), participant(2, true), participant(3, true, 'invitation'), participant(4, false, 'annule')]);
    expect(await screen.findByRole('button', { name: /n’ont pas fini \(2\)/ })).toBeInTheDocument();
  });

  test('pas de bouton quand tout le monde a fini', async () => {
    afficher([participant(2, true)]);
    await screen.findByText(/Nom2/);
    expect(screen.queryByRole('button', { name: /n’ont pas fini/ })).not.toBeInTheDocument();
  });

  test('demande confirmation, envoie, puis donne le bilan', async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValue({ success: true, data: { envoyes: 22, echecs: 0, restants: 0 } });
    afficher([participant(1, false)]);

    await user.click(await screen.findByRole('button', { name: /n’ont pas fini/ }));
    expect(mockPost).not.toHaveBeenCalled();
    await user.click(await screen.findByRole('button', { name: 'Renvoyer l’email' , hidden: false }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/evenements/2/participants/invitations', {}));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: '22 e-mail(s) envoyé(s)' })));
  });
});
