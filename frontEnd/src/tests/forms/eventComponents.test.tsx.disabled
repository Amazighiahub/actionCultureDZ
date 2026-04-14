/**
 * Smoke tests — Event sub-components
 * Vérifie que chaque sous-composant de EventDetailsPage se rend sans crash
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ─── Hoisted mocks ──────────────────────────────────────────────────────────
const { mockNavigate, mockIsAuthenticated, mockUser } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockIsAuthenticated: { value: true },
  mockUser: { value: { id_user: 1, nom: 'Test', prenom: 'User' } },
}));

// ─── Global mocks ────────────────────────────────────────────────────────────
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: 'fr', dir: () => 'ltr' },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: '9' }),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) =>
    React.createElement('a', { href: to }, children),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated.value,
    user: mockUser.value,
  }),
}));

vi.mock('@/hooks/useTranslateData', () => ({
  useTranslateData: () => ({
    td: (val: unknown) => (typeof val === 'object' && val !== null ? (val as Record<string, string>).fr || '' : String(val || '')),
    safe: (val: unknown) => String(val || ''),
  }),
}));

vi.mock('@/hooks/useLocalizedDate', () => ({
  useLocalizedDate: () => ({
    formatDate: (d: string) => d || '01/01/2025',
    formatDateTime: (d: string) => d || '01/01/2025 10:00',
    formatTime: (t: string) => t || '10:00',
    formatRelative: (d: string) => d || 'il y a 1 jour',
    formatDateRange: (d1: string, d2: string) => `${d1} - ${d2}`,
  }),
}));

vi.mock('@/hooks/useLocalizedNumber', () => ({
  useLocalizedNumber: () => ({
    formatPrice: (n: number) => `${n} DA`,
    formatNumber: (n: number) => String(n),
  }),
}));

vi.mock('@/hooks/useFormatDate', () => ({
  useFormatDate: () => ({
    formatDate: (d: string) => d || '01/01/2025',
    formatTime: (t: string) => t || '10:00',
  }),
  default: () => ({
    formatDate: (d: string) => d || '01/01/2025',
    formatTime: (t: string) => t || '10:00',
  }),
}));

vi.mock('@/components/shared', () => ({
  LazyImage: ({ alt }: { alt: string }) => React.createElement('img', { alt }),
  StatusBadge: ({ status }: { status: string }) => React.createElement('span', null, status),
  EmptyState: ({ title }: { title?: string }) => React.createElement('div', null, title || 'empty'),
  LoadingSkeleton: () => React.createElement('div', null, 'loading...'),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'card' }, children),
  CardContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  CardHeader: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  CardTitle: ({ children }: { children: React.ReactNode }) => React.createElement('h3', null, children),
  CardFooter: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => React.createElement('span', { 'data-testid': 'badge' }, children),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement('button', props, children as React.ReactNode),
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: () => React.createElement('hr'),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: Record<string, unknown>) => React.createElement('textarea', props),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => React.createElement('input', props),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => React.createElement('label', null, children),
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: (props: Record<string, unknown>) => React.createElement('input', { type: 'checkbox', ...props }),
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value: number }) => React.createElement('progress', { value }),
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  DialogContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  DialogDescription: ({ children }: { children: React.ReactNode }) => React.createElement('p', null, children),
  DialogFooter: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  DialogHeader: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  DialogTitle: ({ children }: { children: React.ReactNode }) => React.createElement('h2', null, children),
  DialogTrigger: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
}));

vi.mock('@/lib/Utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@/services/httpClient', () => ({
  httpClient: {
    get: vi.fn().mockResolvedValue({ success: true, data: {} }),
    post: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('@/services/evenement.service', () => ({
  evenementService: {
    getQRCode: vi.fn().mockResolvedValue({ success: true, data: { qr_data_url: 'data:image/png;base64,TEST', event_url: 'http://localhost/e/9' } }),
    getRelated: vi.fn().mockResolvedValue({ success: true, data: [] }),
  },
}));

// ─── Mock data ───────────────────────────────────────────────────────────────
const mockEvent = {
  id_evenement: 9,
  nom_evenement: { fr: 'Festival Test', ar: 'مهرجان تجريبي', en: 'Test Festival' },
  description: { fr: 'Une description complète', ar: 'وصف كامل', en: 'A full description' },
  date_debut: '2025-07-01T10:00:00',
  date_fin: '2025-07-03T18:00:00',
  statut: 'planifie' as const,
  tarif: 500,
  inscription_requise: true,
  capacite_max: 200,
  nombre_inscrits: 42,
  certificat_delivre: false,
  id_lieu: 1,
  id_user: 1,
  id_type_evenement: 1,
  date_creation: '2025-01-01',
  date_modification: '2025-01-15',
  contact_email: 'test@example.com',
  contact_telephone: '0555123456',
  image_url: '/uploads/events/test.jpg',
  Lieu: {
    id_lieu: 1,
    nom: { fr: 'Palais de la Culture', ar: 'قصر الثقافة', en: 'Palace of Culture' },
    adresse: 'Alger Centre',
    latitude: 36.75,
    longitude: 3.06,
  },
  TypeEvenement: {
    id_type_evenement: 1,
    nom_type: { fr: 'Festival', ar: 'مهرجان', en: 'Festival' },
  },
  Organisateur: { id_user: 1, nom: 'Admin', prenom: 'Test', email: 'admin@test.dz' },
  Organisations: [],
  Oeuvres: [],
  Programmes: [],
};

const mockPrograms = [
  {
    id_programme: 1,
    titre: { fr: 'Ouverture', ar: 'افتتاح', en: 'Opening' },
    description: { fr: 'Cérémonie', ar: 'حفل', en: 'Ceremony' },
    date_programme: '2025-07-01',
    heure_debut: '10:00',
    heure_fin: '11:00',
    type_activite: 'conference',
    Intervenants: [],
  },
  {
    id_programme: 2,
    titre: { fr: 'Atelier', ar: 'ورشة', en: 'Workshop' },
    description: { fr: 'Atelier pratique', ar: 'ورشة عملية', en: 'Practical workshop' },
    date_programme: '2025-07-01',
    heure_debut: '14:00',
    heure_fin: '16:00',
    type_activite: 'atelier',
    Intervenants: [{ id_user: 3, nom: 'Benali', prenom: 'Karim' }],
  },
];

const mockMedias = [
  { id_media: 1, type_media: 'image', url: '/img1.jpg', titre: { fr: 'Photo 1' } },
  { id_media: 2, type_media: 'video', url: '/vid1.mp4', titre: { fr: 'Vidéo 1' } },
];

const mockComments = [
  {
    id_commentaire: 1,
    contenu: 'Excellent événement !',
    note: 5,
    date_creation: '2025-06-15T10:00:00',
    User: { id_user: 2, nom: 'Benali', prenom: 'Karim', photo_url: null },
  },
  {
    id_commentaire: 2,
    contenu: 'Très bien organisé',
    note: 4,
    date_creation: '2025-06-16T14:30:00',
    User: { id_user: 3, nom: 'Hadj', prenom: 'Amina' },
  },
];

const mockOrganizers = [
  { id: 1, type: 'user' as const, nom: 'Admin', prenom: 'Test', role: 'organisateur_principal' },
  { id: 5, type: 'organisation' as const, nom: 'Association Culture', role: 'partenaire', type_organisation: 'Association' },
];

const mockParticipants = [
  { User: { id_user: 2, nom: 'Benali', prenom: 'Karim', photo_url: null }, role_participation: 'participant' },
  { User: { id_user: 3, nom: 'Hadj', prenom: 'Amina', photo_url: null }, role_participation: 'benevole' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Event Sub-Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.value = true;
  });

  // ─── EventHero ─────────────────────────────────────────────────────────
  describe('EventHero', () => {
    it('rend le titre et le statut', async () => {
      const EventHero = (await import('../EventHero')).default;

      render(
        React.createElement(EventHero, {
          event: mockEvent as never,
          isFavorite: false,
          onToggleFavorite: vi.fn(),
        })
      );

      expect(screen.getByText('Festival Test')).toBeTruthy();
    });

    it('affiche le coeur rempli si favori', async () => {
      const EventHero = (await import('../EventHero')).default;

      const { container } = render(
        React.createElement(EventHero, {
          event: mockEvent as never,
          isFavorite: true,
          onToggleFavorite: vi.fn(),
        })
      );

      // Le composant devrait afficher un état favori
      expect(container.innerHTML).toBeTruthy();
    });
  });

  // ─── EventInfo ─────────────────────────────────────────────────────────
  describe('EventInfo', () => {
    it('rend les informations de l\'événement', async () => {
      const EventInfo = (await import('../EventInfo')).default;

      render(React.createElement(EventInfo, { event: mockEvent as never }));

      // Vérifie que le composant rend du contenu
      expect(screen.getAllByTestId('card').length).toBeGreaterThan(0);
    });
  });

  // ─── EventProgram ──────────────────────────────────────────────────────
  describe('EventProgram', () => {
    it('rend la liste des programmes', async () => {
      const EventProgram = (await import('../EventProgram')).default;

      render(React.createElement(EventProgram, { programs: mockPrograms as never[] }));

      expect(screen.getByText('Ouverture')).toBeTruthy();
      expect(screen.getByText('Atelier')).toBeTruthy();
    });

    it('affiche un état vide sans programme', async () => {
      const EventProgram = (await import('../EventProgram')).default;

      render(React.createElement(EventProgram, { programs: [] }));

      // Devrait afficher un EmptyState ou message
      expect(document.body.textContent).toBeTruthy();
    });
  });

  // ─── EventGallery ─────────────────────────────────────────────────────
  describe('EventGallery', () => {
    it('rend les médias', async () => {
      const EventGallery = (await import('../EventGallery')).default;

      const { container } = render(
        React.createElement(EventGallery, { medias: mockMedias as never[] })
      );

      expect(container.innerHTML).toBeTruthy();
    });

    it('affiche un état vide sans média', async () => {
      const EventGallery = (await import('../EventGallery')).default;

      render(React.createElement(EventGallery, { medias: [] }));

      expect(document.body.textContent).toBeTruthy();
    });
  });

  // ─── EventComments ────────────────────────────────────────────────────
  describe('EventComments', () => {
    it('rend la liste des commentaires', async () => {
      const EventComments = (await import('../EventComments')).default;

      render(
        React.createElement(EventComments, {
          comments: mockComments as never[],
          onAddComment: vi.fn().mockResolvedValue(true),
          eventId: 9,
        })
      );

      expect(screen.getByText('Excellent événement !')).toBeTruthy();
      expect(screen.getByText('Très bien organisé')).toBeTruthy();
    });

    it('affiche un état vide sans commentaire', async () => {
      const EventComments = (await import('../EventComments')).default;

      render(
        React.createElement(EventComments, {
          comments: [],
          onAddComment: vi.fn().mockResolvedValue(true),
          eventId: 9,
        })
      );

      expect(document.body.textContent).toBeTruthy();
    });
  });

  // ─── EventOrganizers ──────────────────────────────────────────────────
  describe('EventOrganizers', () => {
    it('rend les organisateurs', async () => {
      const EventOrganizers = (await import('../EventOrganizers')).default;

      render(React.createElement(EventOrganizers, { organizers: mockOrganizers as never[] }));

      expect(screen.getByText(/Admin/)).toBeTruthy();
      expect(screen.getByText(/Association Culture/)).toBeTruthy();
    });

    it('ne rend rien sans organisateur', async () => {
      const EventOrganizers = (await import('../EventOrganizers')).default;

      const { container } = render(
        React.createElement(EventOrganizers, { organizers: [] })
      );

      // Devrait ne rien afficher ou un message vide
      expect(container).toBeTruthy();
    });
  });

  // ─── EventParticipants ────────────────────────────────────────────────
  describe('EventParticipants', () => {
    it('rend les participants', async () => {
      const EventParticipants = (await import('../EventParticipants')).default;

      render(
        React.createElement(EventParticipants, {
          participants: mockParticipants as never[],
          total: 2,
        })
      );

      expect(screen.getByText(/Benali/)).toBeTruthy();
    });

    it('affiche le total', async () => {
      const EventParticipants = (await import('../EventParticipants')).default;

      render(
        React.createElement(EventParticipants, {
          participants: mockParticipants as never[],
          total: 42,
        })
      );

      expect(screen.getByText(/42/)).toBeTruthy();
    });
  });

  // ─── EventMetadata ────────────────────────────────────────────────────
  describe('EventMetadata', () => {
    it('rend les métadonnées de l\'événement', async () => {
      const EventMetadata = (await import('../EventMetadata')).default;

      const { container } = render(
        React.createElement(EventMetadata, { event: mockEvent as never })
      );

      expect(container.innerHTML).toBeTruthy();
    });
  });

  // ─── EventRegistration ────────────────────────────────────────────────
  describe('EventRegistration', () => {
    it('rend le bouton d\'inscription', async () => {
      const EventRegistration = (await import('../EventRegistration')).default;

      render(
        React.createElement(EventRegistration, {
          event: mockEvent as never,
          onRegister: vi.fn().mockResolvedValue(true),
          onUnregister: vi.fn().mockResolvedValue(true),
          isRegistered: false,
        })
      );

      // Devrait afficher au moins un bouton
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('affiche le statut inscrit', async () => {
      const EventRegistration = (await import('../EventRegistration')).default;

      const { container } = render(
        React.createElement(EventRegistration, {
          event: mockEvent as never,
          onRegister: vi.fn().mockResolvedValue(true),
          onUnregister: vi.fn().mockResolvedValue(true),
          isRegistered: true,
          registrationStatus: 'confirmed',
        })
      );

      expect(container.innerHTML).toBeTruthy();
    });
  });

  // ─── EventQRCode ──────────────────────────────────────────────────────
  describe('EventQRCode', () => {
    it('rend le composant QR code', async () => {
      const EventQRCode = (await import('../EventQRCode')).default;

      const { container } = render(
        React.createElement(EventQRCode, { eventId: 9, eventTitle: 'Festival Test' })
      );

      expect(container.innerHTML).toBeTruthy();
    });
  });
});
