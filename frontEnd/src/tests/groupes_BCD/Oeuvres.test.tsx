/**
 * Oeuvres.test.tsx — Groupe C, test 11
 *
 * Couvre :
 *   Groupe C, test 11 — quand la liste des œuvres est vide, EmptyState est affiché
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ---------------------------------------------------------------------------
// vi.hoisted
// ---------------------------------------------------------------------------

const { mockUseOeuvres, mockNavigate } = vi.hoisted(() => ({
  mockUseOeuvres: {
    filteredOeuvres: [] as any[],
    typesOeuvres: [] as any[],
    loading: false,
    error: null as string | null,
    stats: null,
    loadOeuvres: vi.fn(),
  },
  mockNavigate: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/oeuvres', search: '' }),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  Link: ({ children, to, ...rest }: any) => <a href={to} {...rest}>{children}</a>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: 'fr' },
  }),
}));

vi.mock('@/hooks/useOeuvres', () => ({
  useOeuvres: () => mockUseOeuvres,
}));

vi.mock('@/hooks/useDebouncedValue', () => ({
  useDebouncedValue: (value: string) => value,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/services/favori.service', () => ({
  favoriService: { toggle: vi.fn() },
}));

// Cœurs des cartes : favoris de l'utilisateur (aucun ici) et cache relu après un clic
vi.mock('@/hooks/useFavoris', () => ({ useFavorisIds: () => undefined }));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  // Recherche faite par le serveur : inactive tant qu'aucun mot n'est tapé
  useQuery: () => ({ data: undefined, isFetching: false }),
}));

vi.mock('@/utils/getLocalizedText', () => ({
  getLocalizedText: (v: unknown) => (typeof v === 'string' ? v : String(v ?? '')),
}));

// Composants partagés
vi.mock('@/components/shared', () => ({
  LazyImage: ({ src, alt }: any) => <img src={src} alt={alt} />,
  LoadingSkeleton: ({ type, count }: any) => (
    <div data-testid="loading-skeleton" data-type={type} data-count={count} />
  ),
  EmptyState: ({ title, description, action }: any) => (
    <div data-testid="empty-state">
      <p>{title}</p>
      <p>{description}</p>
      {action && (
        <button type="button" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  ),
}));

vi.mock('@/components/shared/ErrorBoundary', () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/components/SEOHead', () => ({ default: () => null }));
vi.mock('@/components/Header', () => ({ default: () => <header data-testid="header" /> }));
vi.mock('@/components/Footer', () => ({ default: () => <footer data-testid="footer" /> }));

// Shadcn UI
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, asChild, 'aria-label': ariaLabel, ...props }: any) => {
    if (asChild && children) return React.cloneElement(children, { onClick });
    return (
      <button onClick={onClick} disabled={disabled} aria-label={ariaLabel} {...props}>
        {children}
      </button>
    );
  },
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ placeholder, value, onChange, className }: any) => (
    <input
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={className}
      data-testid="search-input"
    />
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => <span data-variant={variant}>{children}</span>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select-root" data-value={value}>
      {React.Children.map(children, (child: any) =>
        child ? React.cloneElement(child, { _onValueChange: onValueChange, _value: value }) : null
      )}
    </div>
  ),
  SelectTrigger: React.forwardRef(({ children, ...props }: any, ref: any) => (
    <button ref={ref} type="button" role="combobox" {...props}>{children}</button>
  )),
  SelectValue: ({ placeholder, _value }: any) => <span>{_value || placeholder || ''}</span>,
  SelectContent: ({ children, _onValueChange }: any) => (
    <div role="listbox">
      {React.Children.map(children, (child: any) =>
        child ? React.cloneElement(child, { _onValueChange }) : null
      )}
    </div>
  ),
  SelectItem: ({ children, value, _onValueChange, ...props }: any) => (
    <div role="option" onClick={() => _onValueChange?.(value)} {...props}>{children}</div>
  ),
}));

// ---------------------------------------------------------------------------
// Import APRÈS les mocks
// ---------------------------------------------------------------------------

import Oeuvres from '@/pages/Oeuvres';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SAMPLE_OEUVRES = [
  {
    id_oeuvre: 1,
    titre: 'Le Matin des palmiers',
    auteur: 'Kateb Yacine',
    description: 'Roman classique',
    TypeOeuvre: { id_type_oeuvre: 1, nom_type: 'Roman', code: 'livre' },
    image_principale: null,
    vues: 150,
    note_moyenne: 4.5,
    prix: 0,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id_oeuvre: 2,
    titre: 'Chronique des années de braise',
    auteur: 'Mohammed Lakhdar-Hamina',
    description: 'Film historique',
    TypeOeuvre: { id_type_oeuvre: 2, nom_type: 'Film', code: 'film' },
    image_principale: null,
    vues: 320,
    note_moyenne: 4.8,
    prix: 0,
    createdAt: '2024-02-01T00:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function setOeuvresState(overrides: Partial<typeof mockUseOeuvres>) {
  Object.assign(mockUseOeuvres, {
    filteredOeuvres: [],
    typesOeuvres: [],
    loading: false,
    error: null,
    stats: null,
    loadOeuvres: vi.fn(),
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Oeuvres', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    setOeuvresState({});
  });

  // =========================================================================
  // GROUPE C — États vides
  // =========================================================================

  describe('Groupe C — État vide', () => {
    // Couvre : Groupe C, test 11 — liste vide → EmptyState affiché
    test('affiche EmptyState quand la liste des œuvres est vide', () => {
      setOeuvresState({ filteredOeuvres: [] });

      render(<Oeuvres />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(
        screen.getByText(/Aucune œuvre trouvée|works\.noResults/i)
      ).toBeInTheDocument();
    });

    // Couvre : Groupe C, test 11 — variante : loading → pas d'EmptyState
    test('n\'affiche pas EmptyState pendant le chargement', () => {
      setOeuvresState({ filteredOeuvres: [], loading: true });

      render(<Oeuvres />);

      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    });

    // Couvre : Groupe C, test 11 — œuvres présentes → PAS d'EmptyState
    test('n\'affiche pas EmptyState quand des œuvres sont présentes', () => {
      setOeuvresState({ filteredOeuvres: SAMPLE_OEUVRES });

      render(<Oeuvres />);

      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
      expect(screen.getByText('Le Matin des palmiers')).toBeInTheDocument();
    });

    // Test complémentaire : liste vide + filtre actif → bouton Réinitialiser dans EmptyState
    // Note : quand hasActiveFilters=true, le bouton X de réinitialisation est aussi dans la barre
    // de filtres. On cible l'EmptyState avec within() pour éviter l'ambiguïté.
    test('affiche le bouton Réinitialiser dans EmptyState quand un filtre est actif', async () => {
      setOeuvresState({ filteredOeuvres: [] });

      render(<Oeuvres />);

      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'palmier');

      // Après avoir tapé, hasActiveFilters=true → EmptyState avec action
      const emptyState = screen.getByTestId('empty-state');
      expect(emptyState).toBeInTheDocument();
      // Chercher DANS l'EmptyState seulement (pas le bouton X de la barre de filtres)
      expect(
        within(emptyState).getByRole('button', { name: /Réinitialiser|common\.resetFilters/i })
      ).toBeInTheDocument();
    });

    // Test complémentaire : sans filtre → EmptyState sans bouton Réinitialiser
    test('EmptyState sans bouton Réinitialiser quand aucun filtre n\'est actif', () => {
      setOeuvresState({ filteredOeuvres: [] });

      render(<Oeuvres />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      // Pas de bouton Réinitialiser (hasActiveFilters=false)
      expect(
        screen.queryByRole('button', { name: /Réinitialiser|common\.resetFilters/i })
      ).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // État d'erreur
  // =========================================================================

  describe('État d\'erreur', () => {
    test('affiche le message d\'erreur et le bouton Réessayer', () => {
      setOeuvresState({ error: 'Impossible de charger les œuvres', filteredOeuvres: [] });

      render(<Oeuvres />);

      expect(screen.getByText('Impossible de charger les œuvres')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Réessayer|common\.retry/i })).toBeInTheDocument();
    });
  });
});
