import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const exportMyData = vi.fn();
const deleteMyAccount = vi.fn();
const logout = vi.fn();
const toast = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k })
}));
vi.mock('@/services/user.service', () => ({
  userService: { exportMyData: (...a: unknown[]) => exportMyData(...a), deleteMyAccount: (...a: unknown[]) => deleteMyAccount(...a) }
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ logout }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

import MesDonneesCard from '../MesDonneesCard';

describe('MesDonneesCard', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  test('exporte les données', async () => {
    exportMyData.mockResolvedValue({ success: true });
    render(<MesDonneesCard />);
    await userEvent.click(screen.getByRole('button', { name: /Exporter mes données/ }));
    expect(exportMyData).toHaveBeenCalled();
    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: 'Vos données ont été téléchargées' }));
  });

  test('supprime le compte avec le mot de passe puis déconnecte', async () => {
    deleteMyAccount.mockResolvedValue({ success: true });
    render(<MesDonneesCard />);
    await userEvent.click(screen.getByRole('button', { name: /Supprimer mon compte/ }));
    const confirm = screen.getByRole('button', { name: /Supprimer définitivement/ });
    expect(confirm).toBeDisabled(); // mot de passe requis
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'MonMotDePasse!1');
    await userEvent.click(confirm);
    await waitFor(() => expect(deleteMyAccount).toHaveBeenCalledWith('MonMotDePasse!1'));
    await waitFor(() => expect(logout).toHaveBeenCalled());
  });

  test('mot de passe incorrect : message d\'erreur, pas de déconnexion', async () => {
    deleteMyAccount.mockResolvedValue({ success: false, error: 'Mot de passe incorrect' });
    render(<MesDonneesCard />);
    await userEvent.click(screen.getByRole('button', { name: /Supprimer mon compte/ }));
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'faux');
    await userEvent.click(screen.getByRole('button', { name: /Supprimer définitivement/ }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })));
    expect(logout).not.toHaveBeenCalled();
  });
});
