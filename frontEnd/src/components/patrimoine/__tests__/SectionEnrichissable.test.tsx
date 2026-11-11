import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render as rtlRender, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import type { PatrimoineBlock, PagePatrimoine } from '@/services/patrimoineArticles.service';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, d?: unknown) => (typeof d === 'string' ? d : _k), i18n: { language: 'fr' } })
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true, isAdmin: false }) }));
// Enrichir : équipe ou professionnel validé (ici : professionnel validé ; variable pour le cas « membre »)
const mockPeutEnrichir = { valeur: true };
vi.mock('@/hooks/usePeutEnrichirLieu', () => ({ usePeutEnrichirLieu: () => mockPeutEnrichir.valeur, lienPropositionLieu: () => '/a-propos' }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/services/httpClient', () => ({ httpClient: { patch: vi.fn(), delete: vi.fn() } }));
vi.mock('@/components/patrimoine/SectionArticleEditor', () => ({ default: () => null }));
// Personne connectée vue par la conservation du texte (session expirée)
const utilisateur = { valeur: null as { id_user: number } | null };
vi.mock('@/providers/PermissionsProvider', () => ({ useUtilisateurOptionnel: () => utilisateur.valeur }));

import SectionEnrichissable from '../SectionEnrichissable';

const Adresse = () => { const l = useLocation(); return <p data-testid="adresse">{l.pathname + l.search}</p>; };
const render = (ui: React.ReactElement) => rtlRender(
  <MemoryRouter initialEntries={['/patrimoine/67']}>
    <Routes><Route path="*" element={<>{ui}<Adresse /></>} /></Routes>
  </MemoryRouter>
);

const bloc = (id: number, type_block: PatrimoineBlock['type_block'], contenu: string, metadata = {}): PatrimoineBlock => ({
  id_block: id, id_article: 67, article_type: 'patrimoine', section_patrimoine: 'gastronomie',
  type_block, contenu, metadata, ordre: id, visible: true
});
const page = (id: number, statut: string, extra: Partial<PagePatrimoine> = {}): PagePatrimoine => ({
  id_lien: id, section_patrimoine: 'gastronomie', id_oeuvre: 100 + id, id_type_oeuvre: 4,
  titre: { fr: 'La rechta' }, resume: { fr: 'Pâtes fraîches algéroises' }, image: null, statut, peut_retirer: false, ...extra
});

const props = { icon: null, title: 'Gastronomie locale', lang: 'fr', lieuId: 67, fieldName: 'gastronomie' };

describe('SectionEnrichissable — articles de la section', () => {
  test('affiche les anciens blocs d’article sous le texte rapide', () => {
    render(
      <SectionEnrichissable {...props} content={{ fr: 'Couscous aux fèves' }} peutEcrireArticle
        blocs={[bloc(1, 'heading', 'Le couscous', { level: 'h2' }), bloc(2, 'citation', 'Le pain partagé', { author: 'Proverbe' })]} />
    );
    expect(screen.getByText('Couscous aux fèves')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Le couscous' })).toBeInTheDocument();
    expect(screen.getByText(/Proverbe/)).toBeInTheDocument();
  });

  test('une section avec seulement un article n’est plus affichée comme vide', () => {
    render(<SectionEnrichissable {...props} content={null} blocs={[bloc(1, 'text', 'Galette cuite sur le tadjine')]} />);
    expect(screen.getByText('Galette cuite sur le tadjine')).toBeInTheDocument();
    expect(screen.queryByText("Cette section n'est pas encore documentée.")).not.toBeInTheDocument();
  });

  test('« Écrire un article » ouvre l’éditeur avancé, relié à ce lieu et cette section', async () => {
    const { rerender } = render(<SectionEnrichissable {...props} content={null} />);
    expect(screen.queryByRole('button', { name: /Écrire un article/ })).not.toBeInTheDocument();
    rerender(
      <MemoryRouter initialEntries={['/patrimoine/67']}>
        <Routes><Route path="*" element={<><SectionEnrichissable {...props} content={null} peutEcrireArticle /><Adresse /></>} /></Routes>
      </MemoryRouter>
    );
    await userEvent.click(screen.getByRole('button', { name: /Écrire un article/ }));
    expect(screen.getByTestId('adresse')).toHaveTextContent('/ajouter-oeuvre?lieu=67&section=gastronomie');
  });

  test('cartes « En savoir plus » vers l’article complet, avec l’état de validation', () => {
    render(<SectionEnrichissable {...props} content={{ fr: 'Rechta, chorba frik' }}
      pages={[page(1, 'publie'), page(2, 'brouillon', { titre: { fr: 'Le bourek' } })]} />);
    expect(screen.getByText('En savoir plus')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /La rechta/ })).toHaveAttribute('href', expect.stringMatching(/^\/articles\/101(-[a-z0-9-]+)?$/));
    expect(screen.getByRole('link', { name: /Le bourek/ })).toHaveTextContent('En attente de validation');
  });

  test('une section avec seulement une page détaillée est affichée', () => {
    render(<SectionEnrichissable {...props} content={null} pages={[page(1, 'publie')]} />);
    expect(screen.getByRole('link', { name: /La rechta/ })).toBeInTheDocument();
  });

  test('Gastronomie : lien vers les plats de toute l’Algérie ; pas dans les autres blocs', () => {
    const { unmount } = render(<SectionEnrichissable {...props} content={{ fr: 'Rechta, chorba frik' }} />);
    expect(screen.getByRole('link', { name: /Voir tous les plats/ })).toHaveAttribute('href', '/artisanat/gastronomie');
    unmount();
    render(<SectionEnrichissable {...props} fieldName="architecture" content={{ fr: 'Maisons à patio' }} />);
    expect(screen.queryByRole('link', { name: /Voir tous les plats/ })).not.toBeInTheDocument();
  });

  test('une vidéo hors liste autorisée n’est pas intégrée', () => {
    const { container } = render(
      <SectionEnrichissable {...props} content={{ fr: 'x' }} blocs={[bloc(1, 'video', 'https://exemple.dz/v', { url: 'https://exemple.dz/v' })]} />
    );
    expect(container.querySelector('iframe')).toBeNull();
  });
});

describe('SectionEnrichissable — texte conservé quand la session expire (audit V11 FRM-23)', () => {
  beforeEach(() => { sessionStorage.clear(); utilisateur.valeur = { id_user: 7 }; });
  afterEach(() => { utilisateur.valeur = null; });

  const ecrirePuisExpirer = async () => {
    const u = userEvent.setup();
    const vue = render(<SectionEnrichissable {...props} content={{ fr: 'Couscous' }} />);
    await u.click(screen.getByRole('button', { name: /Modifier/ }));
    const zone = within(screen.getByRole('dialog')).getByRole('textbox');
    await u.clear(zone);
    await u.type(zone, 'Couscous aux fèves');
    act(() => { window.dispatchEvent(new Event('auth:expired')); });
    vue.unmount();
  };

  test('le texte est gardé pour ce lieu et cette section, puis remis dans la fenêtre rouverte', async () => {
    await ecrirePuisExpirer();
    const garde = JSON.parse(sessionStorage.getItem('saisie:7:lieu:67:gastronomie') || 'null');
    expect(garde?.valeur?.fr).toBe('Couscous aux fèves');

    render(<SectionEnrichissable {...props} content={{ fr: 'Couscous' }} />);
    const fenetre = await screen.findByRole('dialog');
    expect(within(fenetre).getByRole('textbox')).toHaveValue('Couscous aux fèves');
    expect(within(fenetre).getByRole('status')).toHaveTextContent(/session avait expiré/);
    // Utilisé une seule fois
    expect(sessionStorage.getItem('saisie:7:lieu:67:gastronomie')).toBeNull();
  });

  test('une autre section du même lieu ne reprend pas le texte', async () => {
    await ecrirePuisExpirer();
    render(<SectionEnrichissable {...props} fieldName="traditions" content={{ fr: 'Fêtes' }} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(sessionStorage.getItem('saisie:7:lieu:67:gastronomie')).not.toBeNull();
  });

  test('une autre personne connectée ensuite ne voit pas le texte', async () => {
    await ecrirePuisExpirer();
    utilisateur.valeur = { id_user: 8 };
    render(<SectionEnrichissable {...props} content={{ fr: 'Couscous' }} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByDisplayValue('Couscous aux fèves')).toBeNull();
  });

  test('« Annuler » oublie le texte', async () => {
    const u = userEvent.setup();
    render(<SectionEnrichissable {...props} content={{ fr: 'Couscous' }} />);
    await u.click(screen.getByRole('button', { name: /Modifier/ }));
    await u.type(within(screen.getByRole('dialog')).getByRole('textbox'), ' et fèves');
    act(() => { window.dispatchEvent(new Event('auth:expired')); });
    expect(sessionStorage.getItem('saisie:7:lieu:67:gastronomie')).not.toBeNull();
    await u.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(sessionStorage.getItem('saisie:7:lieu:67:gastronomie')).toBeNull();
  });
});

describe('SectionEnrichissable — membre non professionnel', () => {
  test('texte lisible, mais pas de bouton « Modifier » ni de section vide à remplir', () => {
    mockPeutEnrichir.valeur = false;
    try {
      const { unmount } = render(<SectionEnrichissable {...props} content={{ fr: 'Couscous aux fèves' }} />);
      expect(screen.getByText('Couscous aux fèves')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /modifier|edit/i })).toBeNull();
      unmount();
      render(<SectionEnrichissable {...props} content={null} />);
      expect(screen.queryByText('Gastronomie locale')).toBeNull();
      expect(screen.queryByRole('button')).toBeNull();
    } finally {
      mockPeutEnrichir.valeur = true;
    }
  });
});
