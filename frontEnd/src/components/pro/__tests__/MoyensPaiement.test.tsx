import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MoyensPaiement from '../MoyensPaiement';

const mesMoyens = vi.fn();
const enregistrerMoyens = vi.fn();
vi.mock('@/services/paiement.service', async (orig) => ({
  ...(await orig<typeof import('@/services/paiement.service')>()),
  paiementService: { mesMoyens: (...a: unknown[]) => mesMoyens(...a), enregistrerMoyens: (...a: unknown[]) => enregistrerMoyens(...a) },
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_k: string, d?: unknown) => (typeof d === 'string' ? d : _k) }) }));

const ouvrir = async () => {
  render(<MoyensPaiement />);
  await waitFor(() => expect(mesMoyens).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { expanded: false }));
  await screen.findByLabelText('Consignes (facultatif)');
};

describe('moyens de paiement : mot de passe pour changer les coordonnées', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mesMoyens.mockResolvedValue({ success: true, data: { baridimob_rip: '00799999000012345678', especes: false, envoi_algerie: 500 } });
    enregistrerMoyens.mockResolvedValue({ success: true, data: {} });
  });

  it('frais d’envoi seuls : pas de mot de passe demandé', async () => {
    await ouvrir();
    fireEvent.change(screen.getByLabelText('Frais d’envoi en Algérie (DA)'), { target: { value: '600' } });
    expect(screen.queryByLabelText(/Votre mot de passe/)).toBeNull();
    fireEvent.click(screen.getByText('Enregistrer'));
    await waitFor(() => expect(enregistrerMoyens).toHaveBeenCalledWith(expect.objectContaining({ envoi_algerie: '600' }), undefined));
  });

  it('consignes modifiées : mot de passe demandé, refusé sans lui, envoyé avec lui', async () => {
    await ouvrir();
    fireEvent.change(screen.getByLabelText('Consignes (facultatif)'), { target: { value: 'Notre RIP a changé' } });
    const mdp = await screen.findByLabelText(/Votre mot de passe/);
    fireEvent.click(screen.getByText('Enregistrer'));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(enregistrerMoyens).not.toHaveBeenCalled();
    fireEvent.change(mdp, { target: { value: 'Essai-Exemple-2026!' } });
    fireEvent.click(screen.getByText('Enregistrer'));
    await waitFor(() => expect(enregistrerMoyens).toHaveBeenCalledWith(expect.objectContaining({ consignes: 'Notre RIP a changé' }), 'Essai-Exemple-2026!'));
  });
});
