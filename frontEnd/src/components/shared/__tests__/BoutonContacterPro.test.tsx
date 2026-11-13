import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BoutonContacterPro from '../BoutonContacterPro';

const navigate = vi.fn();
const post = vi.fn();
const toast = vi.fn();
const permissions = { isAuthenticated: true };

vi.mock('react-router-dom', async (orig) => ({ ...(await orig<typeof import('react-router-dom')>()), useNavigate: () => navigate }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, d?: string, o?: Record<string, string>) => String(d ?? _k).replace(/\{\{(\w+)\}\}/g, (_m, c) => o?.[c] ?? '') })
}));
vi.mock('@/providers/PermissionsProvider', () => ({ usePermissionsContext: () => permissions }));
vi.mock('@/services/httpClient', () => ({ httpClient: { post: (...a: unknown[]) => post(...a) } }));
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/hooks/useSaisieConservee', () => ({ useSaisieConservee: () => ({ garder: vi.fn(), oublier: vi.fn() }) }));

const afficher = () => render(<MemoryRouter initialEntries={['/professionnels/21-rayan']}><BoutonContacterPro idProfessionnel={21} nom="Rayan Yacine" /></MemoryRouter>);

describe('BoutonContacterPro', () => {
  beforeEach(() => { navigate.mockReset(); post.mockReset(); toast.mockReset(); permissions.isAuthenticated = true; });

  it('non connecté : envoyé vers la connexion, retour sur la page ensuite', () => {
    permissions.isAuthenticated = false;
    afficher();
    fireEvent.click(screen.getByRole('button', { name: /Contacter/ }));
    expect(navigate).toHaveBeenCalledWith('/auth?redirect=%2Fprofessionnels%2F21-rayan');
  });

  it('message trop court : refusé sous le champ, rien n’est envoyé', async () => {
    afficher();
    fireEvent.click(screen.getByRole('button', { name: /Contacter/ }));
    fireEvent.change(await screen.findByLabelText(/Votre message/), { target: { value: 'court' } });
    fireEvent.click(screen.getByRole('button', { name: /Envoyer/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/10 caractères/);
    expect(post).not.toHaveBeenCalled();
  });

  it('envoi : message transmis au serveur, confirmation, fenêtre fermée', async () => {
    post.mockResolvedValue({ success: true });
    afficher();
    fireEvent.click(screen.getByRole('button', { name: /Contacter/ }));
    fireEvent.change(await screen.findByLabelText(/Sujet/), { target: { value: 'Atelier' } });
    fireEvent.change(screen.getByLabelText(/Votre message/), { target: { value: 'Bonjour, je voudrais participer.' } });
    fireEvent.click(screen.getByRole('button', { name: /Envoyer/ }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/users/professionals/21/contact', { sujet: 'Atelier', message: 'Bonjour, je voudrais participer.' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Message envoyé' })));
    expect(screen.queryByLabelText(/Votre message/)).not.toBeInTheDocument();
  });

  it('refus du serveur (limite) : message affiché, fenêtre gardée', async () => {
    post.mockResolvedValue({ success: false, error: 'Trop de messages envoyés. Réessayez dans 1 heure.' });
    afficher();
    fireEvent.click(screen.getByRole('button', { name: /Contacter/ }));
    fireEvent.change(await screen.findByLabelText(/Votre message/), { target: { value: 'Bonjour, je voudrais participer.' } });
    fireEvent.click(screen.getByRole('button', { name: /Envoyer/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Trop de messages/);
    expect(screen.getByLabelText(/Votre message/)).toBeInTheDocument();
  });
});
