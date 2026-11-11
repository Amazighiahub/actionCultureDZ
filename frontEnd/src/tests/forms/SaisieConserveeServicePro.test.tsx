/**
 * AjouterServicePro — saisie conservée quand la session expire (audit V11 FRM-23)
 *
 * Couverture :
 *   - Création : texte gardé à l'événement « auth:expired » (clé utilisateur + « service:nouveau »), remis au retour, avis affiché
 *   - Une autre personne connectée sur le même onglet : rien n'est remis
 *   - Modification : clé du service, brouillon remis APRÈS le chargement (il l'emporte)
 *   - Envoi réussi : brouillon oublié
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent, act } from '@testing-library/react';

const { mockNavigate, mockHttpGet, mockHttpPost, utilisateur } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockHttpGet: vi.fn(),
  mockHttpPost: vi.fn(),
  utilisateur: { valeur: { id_user: 7 } as { id_user: number } | null },
}));
let mockParams: Record<string, string> = {};
const searchParamsArr = [{ get: () => null }] as const;

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/ajouter-mon-service', search: '', hash: '', state: null }),
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
  useSearchParams: () => searchParamsArr,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key), i18n: { language: 'fr' } }),
}));
vi.mock('@/providers/PermissionsProvider', () => ({ useUtilisateurOptionnel: () => utilisateur.valeur }));
vi.mock('@/hooks/useRTL', () => ({ useRTL: () => ({ isRTL: false, direction: 'ltr' }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true, user: { id_user: 7 } }) }));
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/services/httpClient', () => ({
  httpClient: {
    get: (...a: unknown[]) => mockHttpGet(...a),
    post: (...a: unknown[]) => mockHttpPost(...a),
    put: vi.fn().mockResolvedValue({ success: true }),
    upload: vi.fn(),
  },
}));
vi.mock('@tanstack/react-query', async (orig) => ({
  ...(await orig<typeof import('@tanstack/react-query')>()),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock('@/components/LieuSelector', () => ({
  LieuSelector: ({ onChange }: { onChange: (id?: number, lieu?: unknown) => void }) => (
    <button type="button" onClick={() => onChange(5, { id_lieu: 5, latitude: 36.7, longitude: 3.0 })}>choisir-lieu</button>
  ),
}));
vi.mock('@/components/Header', () => ({ default: () => null }));
vi.mock('@/components/Footer', () => ({ default: () => null }));
vi.mock('@/components/MultiLangInput', () => ({
  default: ({ name, value, onChange }: { name?: string; value: Record<string, string>; onChange: (v: Record<string, string>) => void }) =>
    name ? <input data-testid={`input-${name}`} value={value.fr || ''} onChange={(e) => onChange({ ...value, fr: e.target.value })} /> : null,
}));

import AjouterServicePro from '@/pages/AjouterServicePro';

const AVIS = /votre texte a été conservé/i;
const expirer = () => act(() => { window.dispatchEvent(new Event('auth:expired')); });

beforeEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.clearAllMocks();
  mockParams = {};
  utilisateur.valeur = { id_user: 7 };
});

describe('AjouterServicePro — session expirée pendant la saisie', () => {
  test('création : gardé à l’expiration, remis au retour avec l’avis', async () => {
    const premier = render(<AjouterServicePro />);
    fireEvent.change(screen.getByTestId('input-nom'), { target: { value: 'Café de la Casbah' } });
    expirer();
    premier.unmount();

    const brut = sessionStorage.getItem('saisie:7:service:nouveau');
    expect(brut).not.toBeNull();
    expect(JSON.parse(brut!).valeur.formData.nom.fr).toBe('Café de la Casbah');

    render(<AjouterServicePro />);
    expect(await screen.findByTestId('input-nom')).toHaveValue('Café de la Casbah');
    expect(screen.getByText(AVIS)).toBeInTheDocument();
    // Utilisé une fois
    expect(sessionStorage.getItem('saisie:7:service:nouveau')).toBeNull();
  });

  test('rien d’écrit : rien n’est gardé', () => {
    const { unmount } = render(<AjouterServicePro />);
    expirer();
    unmount();
    expect(sessionStorage.getItem('saisie:7:service:nouveau')).toBeNull();
  });

  test('une autre personne ne retrouve pas le texte', async () => {
    const premier = render(<AjouterServicePro />);
    fireEvent.change(screen.getByTestId('input-nom'), { target: { value: 'Texte de la personne 7' } });
    expirer();
    premier.unmount();

    utilisateur.valeur = { id_user: 8 };
    render(<AjouterServicePro />);
    expect(screen.getByTestId('input-nom')).toHaveValue('');
    expect(screen.queryByText(AVIS)).not.toBeInTheDocument();
  });

  test('modification : brouillon remis après le chargement du service, il l’emporte', async () => {
    mockParams = { id: '12' };
    mockHttpGet.mockResolvedValue({ success: true, data: { nom: { fr: 'Nom enregistré' }, type_service: 'guide', id_lieu: 5 } });
    const premier = render(<AjouterServicePro />);
    await waitFor(() => expect(screen.getByTestId('input-nom')).toHaveValue('Nom enregistré'));
    fireEvent.change(screen.getByTestId('input-nom'), { target: { value: 'Nom corrigé' } });
    expirer();
    premier.unmount();
    expect(JSON.parse(sessionStorage.getItem('saisie:7:service:12')!).valeur.formData.nom.fr).toBe('Nom corrigé');

    render(<AjouterServicePro />);
    await waitFor(() => expect(screen.getByTestId('input-nom')).toHaveValue('Nom corrigé'));
    expect(screen.getByText(AVIS)).toBeInTheDocument();
  });

  test('envoi réussi : le brouillon est oublié', async () => {
    // Brouillon resté (le départ vers la connexion avait été annulé)
    const premier = render(<AjouterServicePro />);
    fireEvent.change(screen.getByTestId('input-nom'), { target: { value: 'Guide de Timgad' } });
    fireEvent.click(screen.getByText('Guide touristique'));
    fireEvent.click(screen.getByText('choisir-lieu'));
    expirer();
    expect(sessionStorage.getItem('saisie:7:service:nouveau')).not.toBeNull();

    mockHttpPost.mockResolvedValue({ success: true, data: { id: 3 } });
    fireEvent.submit(document.querySelector('form')!);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard-pro'));
    expect(sessionStorage.getItem('saisie:7:service:nouveau')).toBeNull();
    premier.unmount();
  });
});
