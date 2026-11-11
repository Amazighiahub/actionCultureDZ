/**
 * Bouton « Renvoyer à ceux qui n'ont pas fini » : visible seulement s'il y a quelqu'un à relancer,
 * avec le bon nombre, une confirmation avant l'envoi et un bilan.
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
// Personne vue par la conservation du texte (session expirée) ; personne par défaut
const utilisateur = { valeur: null as { id_user: number } | null };
vi.mock('@/providers/PermissionsProvider', () => ({ useUtilisateurOptionnel: () => utilisateur.valeur }));

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

describe('mention sous chaque participant', () => {
  test('trois cas : pas de mot de passe, participation à confirmer, tout est fait (bouton grisé)', async () => {
    afficher([participant(1, false, 'invitation'), participant(2, true, 'invitation'), participant(3, true)]);
    expect(await screen.findByText('Compte pas encore activé : e-mail non confirmé')).toBeInTheDocument();
    expect(screen.getByText('Mot de passe choisi, mais participation pas encore confirmée')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lui rappeler de confirmer/ })).toBeEnabled();
    expect(screen.getByText('Mot de passe déjà choisi')).toBeInTheDocument();
    const grises = screen.getAllByRole('button', { name: /Renvoyer l’email/ }).filter((b) => (b as HTMLButtonElement).disabled);
    expect(grises).toHaveLength(1);
  });
});

describe('message aux participants conservé quand la session expire (audit V11 FRM-23)', () => {
  beforeEach(() => { sessionStorage.clear(); utilisateur.valeur = { id_user: 7 }; });
  afterEach(() => { utilisateur.valeur = null; });
  // La fenêtre charge le nombre d'inscrits et les messages déjà envoyés
  const afficher = (liste: unknown[]) => {
    mockGet.mockImplementation(async (url: string) => (url.endsWith('/participants/messages')
      ? { success: true, data: { nombres: { tous: 1, confirme: 1, en_attente: 0 }, messages: [] } }
      : url.includes('/participants') ? { success: true, data: liste } : { success: true, data: [] }));
    return render(<ParticipantsManager evenementId={2} evenementNom="Chantier" />);
  };

  test('le message est gardé pour cet événement et la fenêtre se rouvre au retour', async () => {
    const user = userEvent.setup();
    const vue = afficher([participant(1, true)]);
    await user.click(await screen.findByRole('button', { name: /Écrire aux participants/ }));
    await user.type(await screen.findByLabelText('Message'), 'Rendez-vous samedi à 8 h');
    act(() => { window.dispatchEvent(new Event('auth:expired')); });
    vue.unmount();
    expect(JSON.parse(sessionStorage.getItem('saisie:7:message-participants:2') || 'null')?.valeur?.champs?.message).toBe('Rendez-vous samedi à 8 h');

    afficher([participant(1, true)]);
    expect(await screen.findByLabelText('Message')).toHaveValue('Rendez-vous samedi à 8 h');
    expect(screen.getByRole('status')).toHaveTextContent(/session avait expiré/);
  });

  test('une autre personne connectée ensuite : fenêtre fermée, rien de repris', async () => {
    const user = userEvent.setup();
    const vue = afficher([participant(1, true)]);
    await user.click(await screen.findByRole('button', { name: /Écrire aux participants/ }));
    await user.type(await screen.findByLabelText('Message'), 'Rendez-vous samedi à 8 h');
    act(() => { window.dispatchEvent(new Event('auth:expired')); });
    vue.unmount();

    utilisateur.valeur = { id_user: 8 };
    afficher([participant(1, true)]);
    await screen.findByText(/Nom1/);
    expect(screen.queryByLabelText('Message')).toBeNull();
  });
});

describe('refus du serveur (audit V11 FRM-18)', () => {
  test('renvoi refusé : la raison du serveur est montrée et le bouton redevient cliquable', async () => {
    const user = userEvent.setup();
    // httpClient rejette une réponse 4xx avec une HttpError { message, status, code }
    mockPost.mockRejectedValue(Object.assign(new Error('Quota d’e-mails du jour atteint'), { status: 429, code: 'QUOTA' }));
    afficher([participant(1, false, 'invitation')]);

    const bouton = await screen.findByRole('button', { name: /Renvoyer l’email/ });
    await user.click(bouton);

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      description: 'Quota d’e-mails du jour atteint', variant: 'destructive',
    })));
    await waitFor(() => expect(screen.getByRole('button', { name: /Renvoyer l’email/ })).toBeEnabled());
  });

  test('refus sans message lisible : texte par défaut', async () => {
    const user = userEvent.setup();
    mockPost.mockRejectedValue(Object.assign(new Error('Request failed with status code 500'), { status: 500 }));
    afficher([participant(1, false, 'invitation')]);

    await user.click(await screen.findByRole('button', { name: /Renvoyer l’email/ }));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ description: 'Une erreur est survenue' })));
  });
});
