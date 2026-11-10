import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SecuriteCompteCard from '../SecuriteCompteCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string, opts?: Record<string, string>) =>
      (typeof fallback === 'string' ? fallback : key).replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => opts?.[k] ?? ''),
  }),
}));
const logout = vi.fn();
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ logout }) }));
const changePassword = vi.fn();
const requestEmailChange = vi.fn();
vi.mock('@/services/user.service', () => ({
  userService: {
    changePassword: (...a: unknown[]) => changePassword(...a),
    requestEmailChange: (...a: unknown[]) => requestEmailChange(...a),
  },
}));

const rendre = () => render(<MemoryRouter><SecuriteCompteCard emailActuel="lina@example.com" /></MemoryRouter>);
const saisir = (id: string, valeur: string) => fireEvent.change(document.getElementById(id)!, { target: { value: valeur } });

describe('Sécurité du compte (audit V11 FRM-12)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mot de passe : règles vérifiées avant l’envoi', async () => {
    rendre();
    fireEvent.click(screen.getByRole('button', { name: 'Changer mon mot de passe' }));
    saisir('secu-actuel', 'AncienMotDePasse1!');
    saisir('secu-nouveau', 'court');
    fireEvent.click(screen.getByRole('button', { name: 'Changer le mot de passe' }));
    expect(await screen.findByText('Le mot de passe doit contenir au moins 12 caractères')).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('mot de passe actuel refusé par le serveur : message sous ce champ', async () => {
    changePassword.mockRejectedValue({ status: 400, details: [{ field: 'ancien_mot_de_passe', message: 'Mot de passe actuel incorrect' }] });
    rendre();
    fireEvent.click(screen.getByRole('button', { name: 'Changer mon mot de passe' }));
    saisir('secu-actuel', 'Faux123456789!');
    saisir('secu-nouveau', 'NouveauMotDePasse1!');
    saisir('secu-confirmation', 'NouveauMotDePasse1!');
    fireEvent.click(screen.getByRole('button', { name: 'Changer le mot de passe' }));
    expect(await screen.findByText('Mot de passe actuel incorrect')).toBeInTheDocument();
    expect(document.getElementById('secu-actuel')).toHaveAttribute('aria-invalid', 'true');
  });

  it('mot de passe changé : explique la déconnexion et propose de se reconnecter', async () => {
    changePassword.mockResolvedValue({ success: true });
    rendre();
    fireEvent.click(screen.getByRole('button', { name: 'Changer mon mot de passe' }));
    saisir('secu-actuel', 'AncienMotDePasse1!');
    saisir('secu-nouveau', 'NouveauMotDePasse1!');
    saisir('secu-confirmation', 'NouveauMotDePasse1!');
    fireEvent.click(screen.getByRole('button', { name: 'Changer le mot de passe' }));
    expect(await screen.findByText('Mot de passe changé.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Se reconnecter' }));
    await waitFor(() => expect(logout).toHaveBeenCalled());
  });

  it('adresse : mauvais mot de passe (WRONG_PASSWORD) sous le champ du mot de passe', async () => {
    requestEmailChange.mockRejectedValue({ status: 401, code: 'WRONG_PASSWORD', message: 'Wrong password' });
    rendre();
    fireEvent.click(screen.getByRole('button', { name: 'Changer mon adresse e-mail' }));
    saisir('secu-email', 'nouvelle@example.com');
    saisir('secu-email-mdp', 'Faux123456789!');
    fireEvent.click(screen.getByRole('button', { name: 'Recevoir le lien de confirmation' }));
    expect(await screen.findByText('Mot de passe incorrect.')).toBeInTheDocument();
    expect(requestEmailChange).toHaveBeenCalledWith('nouvelle@example.com', 'Faux123456789!');
  });

  it('adresse : lien envoyé, l’adresse ne change qu’après le clic', async () => {
    requestEmailChange.mockResolvedValue({ success: true, data: { newEmail: 'nouvelle@example.com' } });
    rendre();
    fireEvent.click(screen.getByRole('button', { name: 'Changer mon adresse e-mail' }));
    saisir('secu-email', 'Nouvelle@Example.com');
    saisir('secu-email-mdp', 'MotDePasse1234!');
    fireEvent.click(screen.getByRole('button', { name: 'Recevoir le lien de confirmation' }));
    expect(await screen.findByText('Lien de confirmation envoyé.')).toBeInTheDocument();
    expect(screen.getByText(/nouvelle@example\.com/)).toBeInTheDocument();
  });
});
