import { describe, test, expect, vi } from 'vitest';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import type { PatrimoineBlock, PagePatrimoine } from '@/services/patrimoineArticles.service';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, d?: unknown) => (typeof d === 'string' ? d : _k), i18n: { language: 'fr' } })
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true, isAdmin: false }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/services/httpClient', () => ({ httpClient: { patch: vi.fn(), delete: vi.fn() } }));
vi.mock('@/components/patrimoine/SectionArticleEditor', () => ({ default: () => null }));

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
  id_lieu_oeuvre: id, section_patrimoine: 'gastronomie', id_oeuvre: 100 + id, id_type_oeuvre: 4,
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
    expect(screen.getByRole('link', { name: /La rechta/ })).toHaveAttribute('href', '/articles/101');
    expect(screen.getByRole('link', { name: /Le bourek/ })).toHaveTextContent('En attente de validation');
  });

  test('une section avec seulement une page détaillée est affichée', () => {
    render(<SectionEnrichissable {...props} content={null} pages={[page(1, 'publie')]} />);
    expect(screen.getByRole('link', { name: /La rechta/ })).toBeInTheDocument();
  });

  test('une vidéo hors liste autorisée n’est pas intégrée', () => {
    const { container } = render(
      <SectionEnrichissable {...props} content={{ fr: 'x' }} blocs={[bloc(1, 'video', 'https://exemple.dz/v', { url: 'https://exemple.dz/v' })]} />
    );
    expect(container.querySelector('iframe')).toBeNull();
  });
});
