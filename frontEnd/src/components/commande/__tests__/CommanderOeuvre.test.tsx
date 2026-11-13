import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CommanderOeuvre from '../CommanderOeuvre';

const navigate = vi.fn();
const auth = { isAuthenticated: true, user: { id_user: 8 } as { id_user: number } | null };
const offre = vi.fn();
const commander = vi.fn();

vi.mock('react-router-dom', async (orig) => ({ ...(await orig<typeof import('react-router-dom')>()), useNavigate: () => navigate }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));
vi.mock('@/hooks/useLocalizedNumber', () => ({ useLocalizedNumber: () => ({ formatPrice: (n: number) => `${n} DA` }) }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_k: string, d?: unknown, o?: Record<string, unknown>) => {
      const s = typeof d === 'string' ? d : _k;
      return o ? s.replace(/\{\{(\w+)\}\}/g, (_, n) => String(o[n])) : s;
    },
  }),
}));
vi.mock('@/services/commande.service', () => ({ commandeService: { offre: (...a: unknown[]) => offre(...a), commander: (...a: unknown[]) => commander(...a) } }));

const OFFRE = { commandable: true, id_oeuvre: 5, titre: 'Matriochkas', prix: 1500, prix_max: null, stock: null, vendeur: { id: 7, nom: 'Lina Exemple' }, livraison: { algerie: 500, main_propre: 0 } };
const afficher = () => render(<MemoryRouter><CommanderOeuvre idOeuvre={5} /></MemoryRouter>);

describe('bouton « Commander »', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.isAuthenticated = true;
    auth.user = { id_user: 8 };
  });

  it('œuvre qui ne se commande pas : rien n’est affiché', async () => {
    offre.mockResolvedValue({ success: true, data: { commandable: false, raison: 'sans_moyen' } });
    const { container } = afficher();
    await waitFor(() => expect(offre).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });

  it('prix sans paiement en ligne : où se procurer l’œuvre (éditeur, sinon l’auteur)', async () => {
    offre.mockResolvedValue({ success: true, data: { commandable: false, raison: 'sans_moyen', prix: 1200, vendeur: { id: 20, nom: 'Radia Gouga' } } });
    const { container, unmount } = afficher();
    await waitFor(() => expect(container.textContent).toMatch(/Radia Gouga|prixIndicatifAuteur/));
    expect(container.querySelector('a[href^="/professionnels/20"]')).not.toBeNull();
    unmount();

    const avecEditeur = render(
      <MemoryRouter><CommanderOeuvre idOeuvre={5} editeur={{ nom: 'Éditions Chihab', page: '/organisations/3-editions-chihab' }} /></MemoryRouter>
    );
    await waitFor(() => expect(avecEditeur.container.querySelector('a[href="/organisations/3-editions-chihab"]')).not.toBeNull());
  });

  it('sa propre œuvre : pas de bouton', async () => {
    auth.user = { id_user: 7 };
    offre.mockResolvedValue({ success: true, data: OFFRE });
    const { container } = afficher();
    await waitFor(() => expect(offre).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });

  it('visiteur non connecté : envoyé vers la connexion', async () => {
    auth.isAuthenticated = false;
    auth.user = null;
    offre.mockResolvedValue({ success: true, data: OFFRE });
    afficher();
    fireEvent.click(await screen.findByText('Commander'));
    expect(navigate).toHaveBeenCalledWith(expect.stringMatching(/^\/auth\?redirect=/));
  });

  it('commande envoyée : total avec l’envoi, puis comment payer le vendeur', async () => {
    offre.mockResolvedValue({ success: true, data: OFFRE });
    commander.mockResolvedValue({ success: true, data: {
      id_commande: 1, montant_total: 3500, frais_envoi: 500, prix_a_confirmer: false, statut: 'en_attente',
      vendeur: { id: 7, nom: 'Lina Exemple' }, acheteur: { id: 8, nom: 'Sami' }, moyens: { baridimob_rip: '00799999000012345678' },
    } });
    afficher();
    fireEvent.click(await screen.findByText('Commander'));
    fireEvent.change(screen.getByLabelText('Quantité'), { target: { value: '2' } });
    fireEvent.click(screen.getByLabelText(/Envoi en Algérie/));
    // Adresse obligatoire pour un envoi
    fireEvent.click(screen.getByText('Envoyer la commande'));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(commander).not.toHaveBeenCalled();
    expect(screen.getByText('Total : 3500 DA')).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/Adresse de livraison/), { target: { value: '1 rue Exemple, Alger' } });
    fireEvent.click(screen.getByText('Envoyer la commande'));
    await waitFor(() => expect(commander).toHaveBeenCalledWith(expect.objectContaining({ id_oeuvre: 5, quantite: 2, livraison: 'algerie', adresse: '1 rue Exemple, Alger' })));
    expect(await screen.findByText('À payer : 3500 DA')).toBeTruthy();
    expect(screen.getByText(/0079 9999 0000 1234 5678/)).toBeTruthy();
  });

  it('épuisé : un simple message, pas de bouton', async () => {
    offre.mockResolvedValue({ success: true, data: { ...OFFRE, commandable: false, raison: 'epuise' } });
    afficher();
    expect(await screen.findByText('Plus en stock pour le moment')).toBeTruthy();
    expect(screen.queryByText('Commander')).toBeNull();
  });
});
