import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SignalerContenu from '../SignalerContenu';

const navigate = vi.fn();
const post = vi.fn();
const toast = vi.fn();
const auth = { isAuthenticated: true, user: { id_user: 71 } as { id_user: number } | null };

vi.mock('react-router-dom', async (orig) => ({ ...(await orig<typeof import('react-router-dom')>()), useNavigate: () => navigate }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/hooks/useSaisieConservee', () => ({
  useSaisieConservee: () => ({ restauree: false, oublier: vi.fn(), garder: vi.fn() }),
  SaisieConserveeAvis: () => null
}));
vi.mock('@/services/httpClient', () => ({ httpClient: { post: (...a: unknown[]) => post(...a) } }));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange }: { children: React.ReactNode; onValueChange: (v: string) => void }) => (
    <div><button type="button" onClick={() => onValueChange('faux_contenu')}>choisir faux_contenu</button>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
  SelectContent: () => null,
  SelectItem: () => null
}));

const afficher = (idAuteur?: number) => render(<MemoryRouter initialEntries={['/evenements/2-chantier']}><SignalerContenu type="evenement" id={2} idAuteur={idAuteur} /></MemoryRouter>);

describe('Signaler une erreur sur une fiche', () => {
  beforeEach(() => { navigate.mockReset(); post.mockReset(); toast.mockReset(); auth.isAuthenticated = true; auth.user = { id_user: 71 }; });

  it('non connecté : vers la connexion, retour sur la fiche', () => {
    auth.isAuthenticated = false; auth.user = null;
    afficher();
    fireEvent.click(screen.getByRole('button', { name: /Signaler une erreur/ }));
    expect(navigate).toHaveBeenCalledWith('/auth?redirect=%2Fevenements%2F2-chantier');
  });

  it('l’auteur de la fiche ne voit pas le bouton', () => {
    afficher(71);
    expect(screen.queryByRole('button', { name: /Signaler une erreur/ })).not.toBeInTheDocument();
  });

  it('motif obligatoire, puis envoi au serveur (type, identifiant, motif, précision)', async () => {
    post.mockResolvedValue({ success: true });
    afficher(5);
    fireEvent.click(screen.getByRole('button', { name: /Signaler une erreur/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Envoyer le signalement' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Choisissez un motif');
    fireEvent.click(screen.getByRole('button', { name: 'choisir faux_contenu' }));
    fireEvent.change(screen.getByLabelText('Précision (facultatif)'), { target: { value: 'La date est le 22 décembre' } });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer le signalement' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/signalements', { type_entite: 'evenement', id_entite: 2, motif: 'faux_contenu', description: 'La date est le 22 décembre' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: 'Signalement envoyé. Merci.' }));
  });
});
