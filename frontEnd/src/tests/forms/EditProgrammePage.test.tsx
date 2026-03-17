/**
 * EditProgrammePage.test.tsx — Tests de la page d'édition de programme
 *
 * Couverture :
 *   - Sans eventId/programmeId → affiche page d'erreur
 *   - Chargement du programme existant (multilingue titre/description)
 *   - Soumission → appelle programmeService.update
 *   - Erreur serveur → affiche le message
 *   - Annulation → navigue vers l'événement
 *   - Erreur de chargement → affiche l'erreur avec bouton retour
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ---------------------------------------------------------------------------
// vi.hoisted — stableT pour éviter la boucle useEffect([..., t])
// ---------------------------------------------------------------------------

const {
  mockNavigate,
  mockParams,
  mockUpdateProgramme,
  mockGetDetail,
  mockGetProgrammeDetail,
  mockGetDuration,
  mockGetAllLieux,
  mockHttpGet,
  stableT,
} = vi.hoisted(() => {
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
    mockParams: { value: {} as Record<string, string | undefined> },
    mockUpdateProgramme: vi.fn(),
    mockGetDetail: vi.fn(),
    mockGetProgrammeDetail: vi.fn(),
    mockGetDuration: vi.fn(),
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
  useParams: () => mockParams.value,
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: stableT,
    i18n: { language: 'fr', changeLanguage: vi.fn() },
  }),
}));

vi.mock('@/services/programme.service', () => ({
  programmeService: {
    update: mockUpdateProgramme,
    getDetail: mockGetProgrammeDetail,
    getDuration: mockGetDuration,
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

// ProgrammeForm — mock simplifié exposant les callbacks et initialData
vi.mock('@/components/forms/ProgrammeForm', () => ({
  default: ({ eventId, initialData, onSubmit, onCancel, mode, loading, error, success, lieux, users }: any) => (
    <div data-testid="programme-form">
      <span data-testid="form-mode">{mode}</span>
      <span data-testid="form-event-id">{eventId}</span>
      <span data-testid="form-lieux-count">{lieux?.length ?? 0}</span>
      <span data-testid="form-has-initial">{initialData ? 'oui' : 'non'}</span>
      {initialData?.titre && (
        <span data-testid="form-titre-fr">{
          typeof initialData.titre === 'object' ? initialData.titre.fr : initialData.titre
        }</span>
      )}
      {error && <p role="alert">{error}</p>}
      {success && <p data-testid="success-msg">Succès</p>}
      <button data-testid="submit-btn" onClick={() => onSubmit({
        titre: { fr: 'Programme modifié', ar: 'برنامج معدل', en: 'Modified program' },
        description: { fr: 'Desc modifiée', ar: 'وصف معدل', en: 'Modified desc' },
        date_programme: '2026-04-01',
        heure_debut: '10:00',
        heure_fin: '13:00',
        type_activite: 'atelier',
        id_lieu: 2,
        nb_participants_max: 30,
        intervenants: [],
      })} disabled={loading}>
        {loading ? 'Chargement...' : 'Modifier'}
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

// ---------------------------------------------------------------------------
// Import APRÈS les mocks
// ---------------------------------------------------------------------------

import EditProgrammePage from '@/pages/EditProgrammePage';

// ---------------------------------------------------------------------------
// Données de test
// ---------------------------------------------------------------------------

const MOCK_PROGRAMME = {
  id: 7,
  titre: { fr: 'Conférence Casbah', ar: 'مؤتمر القصبة', en: 'Casbah Conference' },
  description: { fr: 'Conférence sur le patrimoine', ar: 'مؤتمر عن التراث', en: 'Heritage conference' },
  heure_debut: '2026-04-01T09:00:00',
  heure_fin: '2026-04-01T12:00:00',
  type_activite: 'conference',
  id_lieu: 1,
  lieu_specifique: null,
  statut: 'planifie',
  ordre: 1,
  nb_participants_max: 50,
  niveau_requis: null,
  materiel_requis: [],
  Intervenants: [
    {
      id_user: 10,
      ProgrammeIntervenant: {
        role_intervenant: 'principal',
        sujet_intervention: 'Patrimoine algérien',
        biographie_courte: 'Expert en patrimoine',
        ordre_intervention: 1,
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EditProgrammePage — Page d\'édition de programme', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    mockParams.value = { eventId: '5', programmeId: '7' };
    mockGetAllLieux.mockResolvedValue({
      success: true,
      data: [{ id_lieu: 1, nom: 'Salle A' }, { id_lieu: 2, nom: 'Salle B' }],
    });
    mockHttpGet.mockResolvedValue({
      success: true,
      data: [{ id: 10, prenom: 'Ali', nom: 'Boudiaf' }],
    });
    mockGetDetail.mockResolvedValue({
      success: true,
      data: { date_debut: '2026-04-01T00:00:00', date_fin: '2026-04-03T00:00:00' },
    });
    mockGetProgrammeDetail.mockResolvedValue({
      success: true,
      data: MOCK_PROGRAMME,
    });
    mockGetDuration.mockReturnValue(180);
    mockUpdateProgramme.mockResolvedValue({ success: true, data: { id: 7 } });
  });

  // =========================================================================
  // SANS IDS
  // =========================================================================

  test('sans eventId ni programmeId affiche une page d\'erreur', () => {
    mockParams.value = {};
    render(<EditProgrammePage />);

    expect(screen.getByText('programmePages.errors.eventOrProgrammeIdMissingWithPrefix')).toBeInTheDocument();
    expect(screen.getByText('programmePages.actions.backToEvents')).toBeInTheDocument();
  });

  test('clic retour sans ids navigue vers /evenements', async () => {
    mockParams.value = {};
    render(<EditProgrammePage />);

    await user.click(screen.getByText('programmePages.actions.backToEvents'));
    expect(mockNavigate).toHaveBeenCalledWith('/evenements');
  });

  // =========================================================================
  // CHARGEMENT DU PROGRAMME
  // =========================================================================

  test('charge le programme et passe les données au formulaire', async () => {
    render(<EditProgrammePage />);

    await waitFor(() => {
      expect(mockGetProgrammeDetail).toHaveBeenCalledWith(7);
    });

    // Le formulaire est en mode "edit"
    await waitFor(() => {
      expect(screen.getByTestId('form-mode')).toHaveTextContent('edit');
    });

    // Les données initiales sont passées
    expect(screen.getByTestId('form-has-initial')).toHaveTextContent('oui');

    // Le titre multilingue FR est passé
    expect(screen.getByTestId('form-titre-fr')).toHaveTextContent('Conférence Casbah');
  });

  test('les lieux chargés sont passés au formulaire', async () => {
    render(<EditProgrammePage />);

    await waitFor(() => {
      expect(screen.getByTestId('form-lieux-count')).toHaveTextContent('2');
    });
  });

  // =========================================================================
  // SOUMISSION
  // =========================================================================

  test('soumission appelle programmeService.update avec données multilingues', async () => {
    render(<EditProgrammePage />);

    await waitFor(() => expect(screen.getByTestId('submit-btn')).toBeInTheDocument());

    await user.click(screen.getByTestId('submit-btn'));

    await waitFor(() => {
      expect(mockUpdateProgramme).toHaveBeenCalledWith(7, expect.objectContaining({
        titre: { fr: 'Programme modifié', ar: 'برنامج معدل', en: 'Modified program' },
        description: { fr: 'Desc modifiée', ar: 'وصف معدل', en: 'Modified desc' },
        type_activite: 'atelier',
      }));
    });
  });

  test('erreur serveur affiche le message d\'erreur', async () => {
    mockUpdateProgramme.mockResolvedValueOnce({
      success: false,
      error: 'Conflit horaire',
    });

    render(<EditProgrammePage />);

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
    render(<EditProgrammePage />);

    await waitFor(() => expect(screen.getByTestId('cancel-btn')).toBeInTheDocument());

    await user.click(screen.getByTestId('cancel-btn'));

    expect(mockNavigate).toHaveBeenCalledWith('/evenements/5');
  });

  // =========================================================================
  // ERREUR DE CHARGEMENT
  // =========================================================================

  test('erreur de chargement du programme affiche l\'erreur', async () => {
    mockGetProgrammeDetail.mockResolvedValueOnce({
      success: false,
      error: 'Programme introuvable',
    });

    render(<EditProgrammePage />);

    await waitFor(() => {
      expect(screen.getByText(/programmePages.errors.prefix/)).toBeInTheDocument();
    });
  });
});
