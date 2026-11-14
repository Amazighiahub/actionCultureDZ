/**
 * Connexion d'un compte professionnel pas encore validé (ou refusé) : un encadré explique la suite,
 * au lieu d'une erreur rouge (audit V11 OUT-13). Le formulaire s'appuie sur le code du serveur.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const login = vi.fn();
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ login, loginLoading: false }) }));
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k, i18n: { language: 'fr' } }),
}));

import LoginForm from '@/pages/auth/LoginForm';

async function seConnecter() {
  fireEvent.change(screen.getByLabelText(/e-?mail/i), { target: { value: 'pro@example.com' } });
  fireEvent.change(screen.getByLabelText(/mot de passe/i, { selector: 'input' }), { target: { value: 'unMotDePasse1!' } });
  fireEvent.click(screen.getByRole('button', { name: /connexion|se connecter/i }));
}

describe('connexion d’un compte professionnel en vérification', () => {
  beforeEach(() => login.mockReset());

  it('compte en attente : encadré explicatif avec les guides, pas d’erreur rouge', async () => {
    login.mockResolvedValue({ success: false, error: 'en attente', code: 'COMPTE_EN_ATTENTE', status: 403 });
    render(<MemoryRouter><LoginForm /></MemoryRouter>);
    await seConnecter();
    expect(await screen.findByTestId('compte-en-attente')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Préparer mon portfolio' }).getAttribute('href')).toBe('/guide/portfolio');
    expect(screen.queryByText('en attente')).toBeNull();
  });

  it('compte refusé : encadré avec l’adresse de contact', async () => {
    login.mockResolvedValue({ success: false, error: 'refusé', code: 'COMPTE_REFUSE', status: 403 });
    render(<MemoryRouter><LoginForm /></MemoryRouter>);
    await seConnecter();
    await waitFor(() => expect(screen.getByTestId('compte-refuse')).toBeTruthy());
    expect(screen.getByRole('link', { name: 'contact@taladz.com' })).toBeTruthy();
  });
});
