import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PatrimoineBlock } from '@/services/patrimoineArticles.service';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, d?: unknown) => (typeof d === 'string' ? d : _k) })
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true, isAdmin: false }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/services/httpClient', () => ({ httpClient: { patch: vi.fn() } }));
vi.mock('@/components/patrimoine/SectionArticleEditor', () => ({ default: () => null }));

import SectionEnrichissable from '../SectionEnrichissable';

const bloc = (id: number, type_block: PatrimoineBlock['type_block'], contenu: string, metadata = {}): PatrimoineBlock => ({
  id_block: id, id_article: 67, article_type: 'patrimoine', section_patrimoine: 'gastronomie',
  type_block, contenu, metadata, ordre: id, visible: true
});

const props = { icon: null, title: 'Gastronomie locale', lang: 'fr', lieuId: 67, fieldName: 'gastronomie' };

describe('SectionEnrichissable — articles de la section', () => {
  test('affiche les blocs d’article sous le texte rapide', () => {
    render(
      <SectionEnrichissable {...props} content={{ fr: 'Couscous aux fèves' }} peutEcrireArticle
        blocs={[bloc(1, 'heading', 'Le couscous', { level: 'h2' }), bloc(2, 'citation', 'Le pain partagé', { author: 'Proverbe' })]} />
    );
    expect(screen.getByText('Couscous aux fèves')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Le couscous' })).toBeInTheDocument();
    expect(screen.getByText('Le pain partagé')).toBeInTheDocument();
    expect(screen.getByText(/Proverbe/)).toBeInTheDocument();
  });

  test('une section avec seulement un article n’est plus affichée comme vide', () => {
    render(<SectionEnrichissable {...props} content={null} blocs={[bloc(1, 'text', 'Galette cuite sur le tadjine')]} />);
    expect(screen.getByText('Galette cuite sur le tadjine')).toBeInTheDocument();
    expect(screen.queryByText("Cette section n'est pas encore documentée.")).not.toBeInTheDocument();
  });

  test('« Écrire un article » seulement pour les personnes autorisées', () => {
    const { rerender } = render(<SectionEnrichissable {...props} content={null} />);
    expect(screen.getByRole('button', { name: /Texte rapide/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Écrire un article/ })).not.toBeInTheDocument();
    rerender(<SectionEnrichissable {...props} content={null} peutEcrireArticle />);
    expect(screen.getByRole('button', { name: /Écrire un article/ })).toBeInTheDocument();
  });

  test('une vidéo hors liste autorisée n’est pas intégrée', () => {
    const { container } = render(
      <SectionEnrichissable {...props} content={{ fr: 'x' }} blocs={[bloc(1, 'video', 'https://exemple.dz/v', { url: 'https://exemple.dz/v' })]} />
    );
    expect(container.querySelector('iframe')).toBeNull();
  });
});
