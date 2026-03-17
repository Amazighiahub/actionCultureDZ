/**
 * CreateProgrammePage.test.tsx — Tests de la page de création de programme
 *
 * Couverture :
 *   - Sans eventId → affiche page d'erreur
 *   - Avec eventId → charge les données (lieux, intervenants, dates événement)
 *   - Soumission → appelle programmeService.create avec les bonnes données
 *   - Erreur serveur → affiche le message
 *   - Annulation → navigue vers l'événement
 *   - Erreur de chargement → affiche alerte avec bouton Réessayer
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ---------------------------------------------------------------------------
// vi.hoisted
// ---------------------------------------------------------------------------

const {
  mockNavigate,
  mockSearchParams,
  mockCreateProgramme,
  mockGetDetail,
  mockGetAllLieux,
  mockHttpGet,
  stableT,
} = vi.hoisted(() => {
  // t DOIT être une référence stable pour éviter la boucle infinie
  // dans useCallback([eventId, t]) du composant
  const stableT = (key: string, fallback?: any): string => {
    if (typeof fallback === 'string') return fallback;
    if (typeof fallback === 'object' && fallback !== null) {
      let text = key;
      for (const [k, v] of Object.entries(fallback)) {
        text = text.replace(`{{${k}}}`, String(v));
      }
      return text;
    }
    return key;
  };
  return {
    mockNavigate: vi.fn(),
    mockSearchParams: { value: new URLSearchParams() },
    mockCreateProgramme: vi.fn(),
    mockGetDetail: vi.fn(),
    mockGetAllLieux: vi.fn(),
    mockHttpGet: vi.fn(),
    stableT,
  };
});

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams.value],
  useParams: () => ({}),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

// stableT est hoisted → même référence à chaque render → pas de boucle useCallback
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: stableT,
    i18n: { language: 'fr', changeLanguage: vi.fn() },
  }),
}));

vi.mock('@/services/programme.service', () => ({
  programmeService: {
    create: mockCreateProgramme,
  },
}));

vi.mock('@/services/evenement.service', () => ({
  evenementService: {
    getDetail: mockGetDetail,
  },
}));

vi.mock('@/services/lieu.service', () => ({
  lieuService: {
    getAll: mockGetAllLieux,
  },
}));

vi.mock('@/services/httpClient', () => ({
  httpClient: {
    get: mockHttpGet,
  },
}));

// ProgrammeForm — mock simplifié qui expose les callbacks
vi.mock('@/components/forms/ProgrammeForm', () => ({
  default: ({ eventId, onSubmit, onCancel, mode, loading, error, success, lieux, users }: any) => (
    <div data-testid="programme-form">
      <span data-testid="form-mode">{mode}</span>
      <span data-testid="form-event-id">{eventId}</span>
      <span data-testid="form-lieux-count">{lieux?.length ?? 0}</span>
      <span data-testid="form-users-count">{users?.length ?? 0}</span>
      {error && <p role="alert">{error}</p>}
      {success && <p data-testid="success-msg">Succès</p>}
      <button data-testid="submit-btn" onClick={() => onSubmit({
        titre: { fr: 'Test Programme' },
        description: { fr: 'Desc' },
        date_programme: '2026-04-01',
        heure_debut: '09:00',
        heure_fin: '12:00',
        type_activite: 'conference',
        id_lieu: 1,
        nb_participants_max: 50,
        intervenants: [],
      })} disabled={loading}>
        {loading ? 'Chargement...' : 'Soumettre'}
      </button>
      <button data-testid="cancel-btn" onClick={onCancel}>Annuler</button>
    </div>
  ),
}));

// Simple UI mocks
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));
vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AlertDescription: ({ children }: any) => <span>{children}</span>,
}));

// ---------------------------------------------------------------------------
// Import APRÈS les mocks
// ---------------------------------------------------------------------------

import CreateProgrammePage from '@/pages/CreateProgrammePage';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CreateProgrammePage — Page de création de programme', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    mockSearchParams.value = new URLSearchParams('eventId=5');
    mockGetAllLieux.mockResolvedValue({
      success: true,
      data: [{ id_lieu: 1, nom: 'Salle A' }, { id_lieu: 2, nom: 'Salle B' }],
    });
    mockHttpGet.mockResolvedValue({
      success: true,
      data: [{ id: 1, prenom: 'Ali', nom: 'B' }],
    });
    mockGetDetail.mockResolvedValue({
      success: true,
      data: { date_debut: '2026-04-01T00:00:00', date_fin: '2026-04-03T00:00:00' },
    });
    mockCreateProgramme.mockResolvedValue({ success: true, data: { id: 1 } });
  });

  // =========================================================================
  // SANS EVENT ID
  // =========================================================================

  test('sans eventId affiche une page d\'erreur', () => {
    mockSearchParams.value = new URLSearchParams('');

    render(<CreateProgrammePage />);

    expect(screen.getByText('programmePages.errors.eventIdMissingWithPrefix')).toBeInTheDocument();
    expect(screen.getByText('programmePages.actions.backToEvents')).toBeInTheDocument();
  });

  test('clic sur retour sans eventId navigue vers /evenements', async () => {
    mockSearchParams.value = new URLSearchParams('');

    render(<CreateProgrammePage />);

    await user.click(screen.getByText('programmePages.actions.backToEvents'));
    expect(mockNavigate).toHaveBeenCalledWith('/evenements');
  });

  // =========================================================================
  // AVEC EVENT ID
  // =========================================================================

  test('avec eventId charge les données et affiche le formulaire', async () => {
    render(<CreateProgrammePage />);

    await waitFor(() => {
      expect(mockGetAllLieux).toHaveBeenCalled();
      expect(mockHttpGet).toHaveBeenCalled();
      expect(mockGetDetail).toHaveBeenCalledWith(5);
    });

    expect(screen.getByTestId('programme-form')).toBeInTheDocument();
    expect(screen.getByTestId('form-mode')).toHaveTextContent('create');
    expect(screen.getByTestId('form-event-id')).toHaveTextContent('5');
  });

  test('les lieux chargés sont passés au formulaire', async () => {
    render(<CreateProgrammePage />);

    await waitFor(() => {
      expect(screen.getByTestId('form-lieux-count')).toHaveTextContent('2');
    });
  });

  // =========================================================================
  // SOUMISSION
  // =========================================================================

  test('soumission réussie appelle programmeService.create', async () => {
    render(<CreateProgrammePage />);

    await waitFor(() => expect(screen.getByTestId('submit-btn')).toBeInTheDocument());

    await user.click(screen.getByTestId('submit-btn'));

    await waitFor(() => {
      expect(mockCreateProgramme).toHaveBeenCalledWith(5, expect.objectContaining({
        titre: { fr: 'Test Programme' },
        type_activite: 'conference',
      }));
    });
  });

  test('erreur serveur affiche le message d\'erreur', async () => {
    mockCreateProgramme.mockResolvedValueOnce({
      success: false,
      error: 'Conflit de dates',
    });

    render(<CreateProgrammePage />);

    await waitFor(() => expect(screen.getByTestId('submit-btn')).toBeInTheDocument());

    await user.click(screen.getByTestId('submit-btn'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // ANNULATION
  // =========================================================================

  test('annulation navigue vers la page de l\'événement', async () => {
    render(<CreateProgrammePage />);

    await waitFor(() => expect(screen.getByTestId('cancel-btn')).toBeInTheDocument());

    await user.click(screen.getByTestId('cancel-btn'));

    expect(mockNavigate).toHaveBeenCalledWith('/evenements/5');
  });

  // =========================================================================
  // ERREUR DE CHARGEMENT
  // =========================================================================

  test('erreur de chargement affiche l\'alerte avec bouton Réessayer', async () => {
    mockGetAllLieux.mockRejectedValueOnce(new Error('Network error'));

    render(<CreateProgrammePage />);

    await waitFor(() => {
      expect(screen.getByText(/Impossible de charger/i)).toBeInTheDocument();
    });

    // Le bouton Réessayer existe
    expect(screen.getByText(/Réessayer/)).toBeInTheDocument();
  });
});
