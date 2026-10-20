/**
 * Evenements.test.tsx — Tests Groupes C & D
 *
 * Couvre :
 *   Groupe C, test 9  — API retourne [] → EmptyState visible
 *   Groupe C, test 10 — API retourne [] + hasActiveFilters=true → bouton "Réinitialiser"
 *   Groupe D, test 14 — saisir dans la recherche filtre les résultats (via useEvenements)
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ---------------------------------------------------------------------------
// vi.hoisted — contrôle de useEvenements depuis chaque test
// ---------------------------------------------------------------------------

const { mockUseEvenements, mockNavigate } = vi.hoisted(() => ({
  mockUseEvenements: {
    evenements: [] as any[],
    loading: false,
    error: null as string | null,
    pagination: null,
    changePage: vi.fn(),
    refresh: vi.fn(),
  },
  mockNavigate: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  Link: ({ children, to, ...rest }: any) => <a href={to} {...rest}>{children}</a>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: 'fr' },
  }),
}));

// useEvenements — mock contrôlé par test
vi.mock('@/hooks/useEvenements', () => ({
  useEvenements: () => mockUseEvenements,
}));

vi.mock('@/hooks/useDebouncedValue', () => ({
  useDebouncedValue: (value: string) => value, // pas de délai en test
}));

vi.mock('@/hooks/useFormatDate', () => ({
  useFormatDate: () => ({ formatDate: (d: string) => d }),
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
  Pagination: ({ currentPage, onPageChange }: any) => (
    <div data-testid="pagination">
      <button onClick={() => onPageChange(currentPage + 1)}>Next</button>
    </div>
  ),
  StatusBadge: ({ status }: any) => <span>{status}</span>,
}));

vi.mock('@/components/shared/ErrorBoundary', () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/components/SEOHead', () => ({
  default: () => null,
}));

vi.mock('@/components/Header', () => ({
  default: () => <header data-testid="header" />,
}));

vi.mock('@/components/Footer', () => ({
  default: () => <footer data-testid="footer" />,
}));

// Shadcn UI
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
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
  Badge: ({ children, variant, className }: any) => (
    <span className={className} data-variant={variant}>{children}</span>
  ),
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: any) => <div role="progressbar" aria-valuenow={value} />,
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

import Evenements from '@/pages/Evenements';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SAMPLE_EVENTS = [
  {
    id_evenement: 1,
    nom_evenement: 'Festival de Jazz',
    date_debut: '2025-09-01T10:00:00Z',
    date_fin: null,
    capacite_max: 200,
    nombre_inscrits: 100,
    statut: 'a_venir',
    tarif: 0,
    gratuit: true,
  },
  {
    id_evenement: 2,
    nom_evenement: 'Exposition Peinture',
    date_debut: '2025-10-15T09:00:00Z',
    date_fin: null,
    capacite_max: 50,
    nombre_inscrits: 10,
    statut: 'a_venir',
    tarif: 500,
    gratuit: false,
  },
];

// ---------------------------------------------------------------------------
// Helper reset
// ---------------------------------------------------------------------------

function setEvenementsState(overrides: Partial<typeof mockUseEvenements>) {
  Object.assign(mockUseEvenements, {
    evenements: [],
    loading: false,
    error: null,
    pagination: null,
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Evenements', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    setEvenementsState({});
  });

  // =========================================================================
  // GROUPE C — États vides
  // =========================================================================

  describe('Groupe C — État vide (EmptyState)', () => {
    // Couvre : Groupe C, test 9 — API retourne [] → EmptyState visible
    test('affiche EmptyState quand l\'API retourne une liste vide', () => {
      setEvenementsState({ evenements: [] });

      render(<Evenements />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(
        screen.getByText(/Aucun événement trouvé|events\.noResults/i)
      ).toBeInTheDocument();
    });

    // Couvre : Groupe C, test 9 — variante : loading puis liste vide
    test('n\'affiche pas EmptyState pendant le chargement', () => {
      setEvenementsState({ evenements: [], loading: true });

      render(<Evenements />);

      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    });

    // Couvre : Groupe C, test 9 — affiche les événements quand la liste n'est pas vide
    test('affiche les événements quand la liste n\'est pas vide', () => {
      setEvenementsState({ evenements: SAMPLE_EVENTS });

      render(<Evenements />);

      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
      expect(screen.getByText('Festival de Jazz')).toBeInTheDocument();
      expect(screen.getByText('Exposition Peinture')).toBeInTheDocument();
    });

    // Couvre : Groupe C, test 10 — liste vide + filtre actif → bouton Réinitialiser dans EmptyState
    // NOTE: La logique hasActiveFilters est locale à Evenements (searchQuery, statusFilter, typeFilter).
    // On simule un filtre actif en saisissant dans la recherche, PUIS on vérifie EmptyState + bouton.
    // Note : quand hasActiveFilters=true, le bouton Réinitialiser existe à la fois dans la barre de
    // filtres (aria-label) ET dans EmptyState (texte). On cible l'EmptyState avec within().
    test('affiche le bouton Réinitialiser dans EmptyState quand il y a des filtres actifs', async () => {
      // Départ : pas de résultats
      setEvenementsState({ evenements: [] });

      render(<Evenements />);

      // Saisir dans la recherche pour activer hasActiveFilters
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'jazz');

      // EmptyState doit contenir un bouton Réinitialiser (via action prop)
      await waitFor(() => {
        const emptyState = screen.getByTestId('empty-state');
        expect(emptyState).toBeInTheDocument();
        // On cherche le bouton DANS l'EmptyState (pas le bouton X de la barre de filtres)
        expect(
          within(emptyState).getByRole('button', { name: /Réinitialiser|common\.resetFilters/i })
        ).toBeInTheDocument();
      });
    });

    // Couvre : Groupe C, test 10 — cliquer Réinitialiser dans EmptyState vide les filtres
    test('cliquer sur le bouton Réinitialiser dans EmptyState vide la recherche et les filtres', async () => {
      setEvenementsState({ evenements: [] });

      render(<Evenements />);

      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'jazz');

      // Attendre que le bouton Réinitialiser dans EmptyState apparaisse
      let resetBtn!: HTMLElement;
      await waitFor(() => {
        const emptyState = screen.getByTestId('empty-state');
        resetBtn = within(emptyState).getByRole('button', { name: /Réinitialiser|common\.resetFilters/i });
        expect(resetBtn).toBeInTheDocument();
      });

      await user.click(resetBtn);

      // Après reset, le champ de recherche est vidé
      await waitFor(() => {
        expect(searchInput).toHaveValue('');
      });
    });

    // Couvre : test 10 variante — sans filtre actif, EmptyState n'a PAS de bouton Réinitialiser
    test('EmptyState sans action quand aucun filtre n\'est actif', () => {
      setEvenementsState({ evenements: [] });

      render(<Evenements />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      // Pas de bouton Réinitialiser dans l'EmptyState (hasActiveFilters=false par défaut)
      expect(
        screen.queryByRole('button', { name: /Réinitialiser|common\.resetFilters/i })
      ).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // GROUPE D — test 14 — recherche filtre les résultats
  // =========================================================================

  describe('Groupe D — Recherche', () => {
    // Couvre : Groupe D, test 14 — saisir dans la recherche met à jour le state
    // Note : Evenements passe `search: debouncedSearch` à useEvenements.
    // useDebouncedValue est mocké pour retourner la valeur immédiatement.
    // Le hook useEvenements est mocké → on vérifie que l'input se met à jour.
    test('saisir dans la recherche met à jour le champ de saisie', async () => {
      setEvenementsState({ evenements: SAMPLE_EVENTS });

      render(<Evenements />);

      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'festival');

      expect(searchInput).toHaveValue('festival');
    });

    // Couvre : Groupe D, test 14 — vider la recherche restaure les résultats
    test('vider la recherche restaure l\'affichage complet', async () => {
      setEvenementsState({ evenements: SAMPLE_EVENTS });

      render(<Evenements />);

      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'festival');
      await user.clear(searchInput);

      expect(searchInput).toHaveValue('');
      // Les résultats complets sont toujours affichés (mock ne filtre pas)
      expect(screen.getByText('Festival de Jazz')).toBeInTheDocument();
    });

    // Test complémentaire : affiche le bouton Réinitialiser dans la barre de filtres
    test('affiche le bouton Réinitialiser dans la barre de filtre quand une recherche est active', async () => {
      setEvenementsState({ evenements: SAMPLE_EVENTS });

      render(<Evenements />);

      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'jazz');

      await waitFor(() => {
        // Le bouton X de réinitialisation dans la barre de filtres (aria-label)
        expect(
          screen.getByRole('button', { name: /Réinitialiser les filtres|common\.resetFilters/i })
        ).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // État d'erreur
  // =========================================================================

  describe('État d\'erreur', () => {
    test('affiche le message d\'erreur et le bouton Réessayer', () => {
      setEvenementsState({ error: 'Erreur réseau', evenements: [] });

      render(<Evenements />);

      expect(screen.getByText('Erreur réseau')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Réessayer|common\.retry/i })).toBeInTheDocument();
    });
  });
});
