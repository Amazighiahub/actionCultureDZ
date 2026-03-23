/**
 * Tests — useEventDetails hook
 * Vérifie que le hook orchestre correctement les queries et mutations
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ─── Hoisted mocks ──────────────────────────────────────────────────────────
const {
  mockGetDetail,
  mockGetProgrammes,
  mockGetMedias,
  mockCheckRegistration,
  mockInscription,
  mockDesinscription,
  mockGetPublicParticipants,
  mockGetByEvent,
  mockGetCommentaires,
  mockCreateCommentaire,
  mockToast,
  mockToggleFavori,
  mockIsFavorite,
  mockIsAuthenticated,
  mockUser,
} = vi.hoisted(() => ({
  mockGetDetail: vi.fn(),
  mockGetProgrammes: vi.fn(),
  mockGetMedias: vi.fn(),
  mockCheckRegistration: vi.fn(),
  mockInscription: vi.fn(),
  mockDesinscription: vi.fn(),
  mockGetPublicParticipants: vi.fn(),
  mockGetByEvent: vi.fn(),
  mockGetCommentaires: vi.fn(),
  mockCreateCommentaire: vi.fn(),
  mockToast: vi.fn(),
  mockToggleFavori: vi.fn(),
  mockIsFavorite: { value: false },
  mockIsAuthenticated: { value: true },
  mockUser: { value: { id_user: 1 } },
}));

// ─── Mock services ───────────────────────────────────────────────────────────
vi.mock('@/services/evenement.service', () => ({
  evenementService: {
    getDetail: (...args: unknown[]) => mockGetDetail(...args),
    getProgrammes: (...args: unknown[]) => mockGetProgrammes(...args),
    getMedias: (...args: unknown[]) => mockGetMedias(...args),
    checkRegistration: (...args: unknown[]) => mockCheckRegistration(...args),
    inscription: (...args: unknown[]) => mockInscription(...args),
    desinscription: (...args: unknown[]) => mockDesinscription(...args),
    getPublicParticipants: (...args: unknown[]) => mockGetPublicParticipants(...args),
  },
}));

vi.mock('@/services/programme.service', () => ({
  programmeService: {
    getByEvent: (...args: unknown[]) => mockGetByEvent(...args),
  },
}));

vi.mock('@/services/commentaire.service', () => ({
  commentaireService: {
    getCommentairesEvenement: (...args: unknown[]) => mockGetCommentaires(...args),
    createCommentaireEvenement: (...args: unknown[]) => mockCreateCommentaire(...args),
  },
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated.value,
    user: mockUser.value,
  }),
}));

vi.mock('@/hooks/useFavoris', () => ({
  useFavoriCheck: () => ({
    isFavorite: mockIsFavorite.value,
    toggleFavorite: mockToggleFavori,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: 'fr' },
  }),
}));

// ─── Import after mocks ─────────────────────────────────────────────────────
import { useEventDetails } from '../useEventDetails';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function createWrapper() {
  const qc = createQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

// ─── Default mock responses ─────────────────────────────────────────────────
function setupDefaultMocks() {
  mockGetDetail.mockResolvedValue({
    success: true,
    data: {
      id_evenement: 9,
      nom_evenement: 'Festival Test',
      statut: 'publie',
      Organisateur: { id_user: 1, nom: 'Admin', prenom: 'Test', email: 'a@b.com' },
      Organisations: [],
    },
  });

  mockGetByEvent.mockResolvedValue({
    success: true,
    data: {
      programmes: [
        { id_programme: 1, titre: 'Ouverture', date_programme: '2025-06-01' },
      ],
    },
  });

  mockGetMedias.mockResolvedValue({
    success: true,
    data: [{ id_media: 1, type: 'image', url: '/img.jpg' }],
  });

  mockGetCommentaires.mockResolvedValue({
    success: true,
    data: {
      items: [{ id_commentaire: 1, contenu: 'Super', User: { nom: 'A', prenom: 'B' } }],
    },
  });

  mockGetPublicParticipants.mockResolvedValue({
    success: true,
    data: { participants: [{ id_user: 2, nom: 'Participant' }], total: 1 },
  });

  mockCheckRegistration.mockResolvedValue({
    success: true,
    data: { isRegistered: false, status: null },
  });

  mockInscription.mockResolvedValue({
    success: true,
    data: { inscription: { statut: 'confirme' }, oeuvres_soumises: 0 },
  });

  mockDesinscription.mockResolvedValue({ success: true });

  mockCreateCommentaire.mockResolvedValue({
    success: true,
    data: { id_commentaire: 2, contenu: 'New comment' },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('useEventDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.value = true;
    mockUser.value = { id_user: 1 };
    mockIsFavorite.value = false;
    setupDefaultMocks();
  });

  // ─── Data loading ────────────────────────────────────────────────────────
  describe('data loading', () => {
    it('charge les détails de l\'événement', async () => {
      const { result } = renderHook(() => useEventDetails(9), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetDetail).toHaveBeenCalledWith(9);
      expect(result.current.event?.id_evenement).toBe(9);
      expect(result.current.event?.nom_evenement).toBe('Festival Test');
    });

    it('charge les programmes via programmeService', async () => {
      const { result } = renderHook(() => useEventDetails(9), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loadingPrograms).toBe(false));

      expect(mockGetByEvent).toHaveBeenCalledWith(9);
      expect(result.current.programs).toHaveLength(1);
    });

    it('fallback vers evenementService si programmeService échoue', async () => {
      mockGetByEvent.mockRejectedValue(new Error('Service unavailable'));
      mockGetProgrammes.mockResolvedValue({
        success: true,
        data: { programmes: [{ id_programme: 2, titre: 'Fallback' }] },
      });

      const { result } = renderHook(() => useEventDetails(9), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loadingPrograms).toBe(false));

      expect(mockGetProgrammes).toHaveBeenCalledWith(9);
    });

    it('charge les médias', async () => {
      const { result } = renderHook(() => useEventDetails(9), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loadingMedias).toBe(false));

      expect(result.current.medias).toHaveLength(1);
    });

    it('charge les commentaires', async () => {
      const { result } = renderHook(() => useEventDetails(9), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loadingComments).toBe(false));

      expect(result.current.comments).toHaveLength(1);
    });

    it('charge les participants publics', async () => {
      const { result } = renderHook(() => useEventDetails(9), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loadingParticipants).toBe(false));

      expect(result.current.publicParticipants.total).toBe(1);
      expect(result.current.publicParticipants.participants).toHaveLength(1);
    });

    it('ne charge rien si enabled=false', async () => {
      renderHook(() => useEventDetails(9, { enabled: false }), { wrapper: createWrapper() });

      // Let a tick pass
      await new Promise((r) => setTimeout(r, 50));

      expect(mockGetDetail).not.toHaveBeenCalled();
      expect(mockGetByEvent).not.toHaveBeenCalled();
    });

    it('ne charge pas l\'inscription si non authentifié', async () => {
      mockIsAuthenticated.value = false;
      mockUser.value = null as unknown as { id_user: number };

      const { result } = renderHook(() => useEventDetails(9), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockCheckRegistration).not.toHaveBeenCalled();
      expect(result.current.isRegistered).toBe(false);
    });
  });

  // ─── Organizers extraction ───────────────────────────────────────────────
  describe('extractOrganizers', () => {
    it('extrait l\'organisateur principal', async () => {
      const { result } = renderHook(() => useEventDetails(9), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.organizers).toHaveLength(1);
      expect(result.current.organizers[0].type).toBe('user');
      expect(result.current.organizers[0].nom).toBe('Admin');
    });

    it('inclut les organisations partenaires', async () => {
      mockGetDetail.mockResolvedValue({
        success: true,
        data: {
          id_evenement: 9,
          nom_evenement: 'Test',
          Organisateur: { id_user: 1, nom: 'Admin', prenom: 'Test' },
          Organisations: [
            {
              id_organisation: 5,
              nom: 'Association Culture',
              EvenementOrganisation: { role: 'partenaire' },
              TypeOrganisation: { nom: 'Association' },
            },
          ],
        },
      });

      const { result } = renderHook(() => useEventDetails(9), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.organizers).toHaveLength(2);
      expect(result.current.organizers[1].type).toBe('organisation');
      expect(result.current.organizers[1].nom).toBe('Association Culture');
    });
  });

  // ─── Registration ────────────────────────────────────────────────────────
  describe('registration', () => {
    it('vérifie le statut d\'inscription', async () => {
      mockCheckRegistration.mockResolvedValue({
        success: true,
        data: { isRegistered: true, status: 'confirmed' },
      });

      const { result } = renderHook(() => useEventDetails(9), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isRegistered).toBe(true));

      expect(result.current.registrationStatus).toBe('confirmed');
    });

    it('registerToEvent appelle inscription et affiche un toast', async () => {
      const { result } = renderHook(() => useEventDetails(9), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.registerToEvent();
      });

      expect(success).toBe(true);
      expect(mockInscription).toHaveBeenCalledWith(9, undefined);
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.any(String) })
      );
    });

    it('registerToEvent refuse si non authentifié', async () => {
      mockIsAuthenticated.value = false;

      const { result } = renderHook(() => useEventDetails(9), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.registerToEvent();
      });

      expect(success).toBe(false);
      expect(mockInscription).not.toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive' })
      );
    });

    it('unregisterFromEvent appelle desinscription', async () => {
      const { result } = renderHook(() => useEventDetails(9), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.unregisterFromEvent();
      });

      expect(success).toBe(true);
      expect(mockDesinscription).toHaveBeenCalledWith(9);
    });
  });

  // ─── Comments ────────────────────────────────────────────────────────────
  describe('comments', () => {
    it('addComment appelle createCommentaire', async () => {
      const { result } = renderHook(() => useEventDetails(9), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.addComment('Excellent !', 5);
      });

      expect(success).toBe(true);
      expect(mockCreateCommentaire).toHaveBeenCalledWith(9, {
        contenu: 'Excellent !',
        note_qualite: 5,
      });
    });

    it('addComment refuse si non authentifié', async () => {
      mockIsAuthenticated.value = false;

      const { result } = renderHook(() => useEventDetails(9), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.addComment('Test');
      });

      expect(success).toBe(false);
      expect(mockCreateCommentaire).not.toHaveBeenCalled();
    });
  });

  // ─── Favorites ───────────────────────────────────────────────────────────
  describe('favorites', () => {
    it('expose isFavorite depuis useFavoriCheck', async () => {
      mockIsFavorite.value = true;

      const { result } = renderHook(() => useEventDetails(9), { wrapper: createWrapper() });

      expect(result.current.isFavorite).toBe(true);
    });

    it('toggleFavorite appelle le toggle si authentifié', async () => {
      const { result } = renderHook(() => useEventDetails(9), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.toggleFavorite();
      });

      expect(mockToggleFavori).toHaveBeenCalled();
    });

    it('toggleFavorite affiche un toast si non authentifié', async () => {
      mockIsAuthenticated.value = false;

      const { result } = renderHook(() => useEventDetails(9), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.toggleFavorite();
      });

      expect(mockToggleFavori).not.toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive' })
      );
    });
  });

  // ─── Error handling ──────────────────────────────────────────────────────
  describe('error handling', () => {
    it('expose l\'erreur si le chargement échoue', async () => {
      mockGetDetail.mockResolvedValue({
        success: false,
        error: 'Événement non trouvé',
      });

      const { result } = renderHook(() => useEventDetails(9), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.error).toBeTruthy());

      expect(result.current.error).toContain('non trouvé');
    });
  });
});
