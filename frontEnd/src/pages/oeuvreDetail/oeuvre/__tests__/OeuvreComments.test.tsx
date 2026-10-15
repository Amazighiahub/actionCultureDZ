/**
 * OeuvreComments.test.tsx — Tests unitaires du composant OeuvreComments
 *
 * Couverture :
 *   Groupe A — Formulaires : erreur sur saisie invalide
 *     4. Commentaire de 2 caractères → "au moins 3 caractères"
 *     5. Commentaire vide → "Veuillez écrire un commentaire"
 *   Groupe B — Boutons désactivés pendant l'envoi
 *     6. isSubmitting=true → bouton "Publier" disabled
 *     7. isSubmitting=true → icône Send n'est plus visible (bouton disabled suffit)
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ---------------------------------------------------------------------------
// vi.hoisted
// ---------------------------------------------------------------------------

const { mockToast, mockIsAuthenticated } = vi.hoisted(() => ({
  mockToast: vi.fn(),
  mockIsAuthenticated: { value: true },
}));

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: 'fr' },
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated.value,
    user: null,
    loading: false,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/hooks/useLocalizedDate', () => ({
  useLocalizedDate: () => ({
    formatDate: (date: string) => date,
  }),
}));

vi.mock('@/utils/getLocalizedText', () => ({
  getLocalizedText: (v: unknown) => (typeof v === 'string' ? v : String(v ?? '')),
}));

// Composants partagés — mocks légers
vi.mock('@/components/shared', () => ({
  LazyImage: ({ src, alt, className }: any) => (
    <img src={src} alt={alt} className={className} data-testid="lazy-image" />
  ),
  EmptyState: ({ title, description }: any) => (
    <div data-testid="empty-state">
      <p>{title}</p>
      <p>{description}</p>
    </div>
  ),
}));

vi.mock('@/components/shared/StarRating', () => ({
  default: ({ value, onChange, readonly, size }: any) => (
    <div data-testid="star-rating" data-value={value} data-readonly={readonly}>
      {!readonly && onChange && (
        <button type="button" onClick={() => onChange(5)}>★</button>
      )}
    </div>
  ),
}));

vi.mock('@/lib/Utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

// Shadcn UI — mocks minimalistes
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, type, onClick, ...props }: any) => (
    <button type={type || 'button'} disabled={disabled} onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ id, value, onChange, placeholder, className, maxLength, 'aria-invalid': ariaInvalid, 'aria-describedby': ariaDescribedby }: any) => (
    <textarea
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      maxLength={maxLength}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedby}
    />
  ),
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

// ---------------------------------------------------------------------------
// Import APRÈS les mocks
// ---------------------------------------------------------------------------

import OeuvreComments from '@/pages/oeuvreDetail/oeuvre/OeuvreComments';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SAMPLE_COMMENT = {
  id_commentaire: 1,
  contenu: 'Très belle œuvre !',
  note: 5,
  date_creation: '2024-01-15T10:00:00Z',
  User: {
    id_user: 42,
    nom: 'Dupont',
    prenom: 'Marie',
    photo_url: '/avatar.jpg',
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderComments({
  comments = [],
  onAddComment = vi.fn().mockResolvedValue(true),
  oeuvreId = 1,
} = {}) {
  return render(
    <OeuvreComments
      comments={comments}
      onAddComment={onAddComment}
      oeuvreId={oeuvreId}
    />
  );
}

function getCommentTextarea() {
  return screen.getByRole('textbox') as HTMLTextAreaElement;
}

function getSubmitButton() {
  // Le bouton contient "Publier" (clé: comments.submit)
  return screen.getByRole('button', { name: /comments\.submit|Publier/i });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OeuvreComments', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    mockIsAuthenticated.value = true;
  });

  // =========================================================================
  // GROUPE A — Validation du commentaire
  // =========================================================================

  describe('Groupe A — Validation du commentaire', () => {
    // Couvre : Groupe A, test 4 — commentaire de 2 caractères → erreur min 3 chars
    test('affiche une erreur "au moins 3 caractères" pour un commentaire de 2 chars', async () => {
      renderComments();

      const textarea = getCommentTextarea();
      await user.type(textarea, 'ab');
      await user.click(getSubmitButton());

      await waitFor(() => {
        expect(
          screen.getByText(/au moins 3 caractères|comments\.errorTooShort/i)
        ).toBeInTheDocument();
      });
    });

    // Couvre : Groupe A, test 4 — variante : 1 seul caractère
    test('affiche une erreur "au moins 3 caractères" pour un commentaire d\'1 caractère', async () => {
      renderComments();

      await user.type(getCommentTextarea(), 'x');
      await user.click(getSubmitButton());

      await waitFor(() => {
        expect(
          screen.getByText(/au moins 3 caractères|comments\.errorTooShort/i)
        ).toBeInTheDocument();
      });
    });

    // Couvre : Groupe A, test 5 — commentaire vide → erreur "Veuillez écrire un commentaire"
    test('affiche une erreur "Veuillez écrire un commentaire" pour un commentaire vide', async () => {
      renderComments();

      // Ne rien taper — soumettre directement
      await user.click(getSubmitButton());

      await waitFor(() => {
        expect(
          screen.getByText(/Veuillez écrire un commentaire|comments\.errorEmpty/i)
        ).toBeInTheDocument();
      });
    });

    // Couvre : Groupe A, test 5 — variante : espaces uniquement (trim → vide)
    test('affiche une erreur pour un commentaire composé uniquement d\'espaces', async () => {
      renderComments();

      await user.type(getCommentTextarea(), '   ');
      await user.click(getSubmitButton());

      await waitFor(() => {
        expect(
          screen.getByText(/Veuillez écrire un commentaire|comments\.errorEmpty/i)
        ).toBeInTheDocument();
      });
    });

    // Test complémentaire : 3 caractères exacts — PAS d'erreur, appelle onAddComment
    test('soumet correctement un commentaire de 3 caractères ou plus', async () => {
      const mockOnAddComment = vi.fn().mockResolvedValue(true);
      renderComments({ onAddComment: mockOnAddComment });

      await user.type(getCommentTextarea(), 'abc');
      await user.click(getSubmitButton());

      await waitFor(() => {
        expect(mockOnAddComment).toHaveBeenCalledWith('abc', undefined);
      });

      // Pas de message d'erreur
      expect(screen.queryByText(/au moins 3 caractères/i)).not.toBeInTheDocument();
    });

    // Test complémentaire : succès → toast affiché et champ réinitialisé
    test('affiche un toast de succès et réinitialise le champ après soumission réussie', async () => {
      const mockOnAddComment = vi.fn().mockResolvedValue(true);
      renderComments({ onAddComment: mockOnAddComment });

      await user.type(getCommentTextarea(), 'Super commentaire de test !');
      await user.click(getSubmitButton());

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringMatching(/comments\.successTitle|Commentaire publié/i),
          })
        );
      });

      // Le champ est réinitialisé
      await waitFor(() => {
        expect(getCommentTextarea()).toHaveValue('');
      });
    });
  });

  // =========================================================================
  // GROUPE B — Bouton désactivé pendant l'envoi
  // =========================================================================

  describe('Groupe B — Bouton "Publier" désactivé pendant isSubmitting', () => {
    // Couvre : Groupe B, test 6 — pendant isSubmitting, bouton disabled
    test('le bouton "Publier" est disabled pendant la soumission', async () => {
      // onAddComment ne se résout pas immédiatement → isSubmitting reste true un instant
      let resolveSubmit!: (val: boolean) => void;
      const pendingSubmit = new Promise<boolean>((resolve) => {
        resolveSubmit = resolve;
      });
      const mockOnAddComment = vi.fn().mockReturnValue(pendingSubmit);

      renderComments({ onAddComment: mockOnAddComment });

      await user.type(getCommentTextarea(), 'Commentaire valide pour test');
      await user.click(getSubmitButton());

      // Pendant que la Promise est en attente, le bouton doit être disabled
      await waitFor(() => {
        expect(getSubmitButton()).toBeDisabled();
      });

      // Résoudre la Promise et vérifier que le bouton redevient actif
      resolveSubmit(true);

      await waitFor(() => {
        expect(getSubmitButton()).not.toBeDisabled();
      });
    });

    // Couvre : Groupe B, test 7 — le bouton "Publier" reste le seul visible (Send toujours dans le DOM car pas de spinner conditionnel dans OeuvreComments)
    // Note : OeuvreComments N'IMPLÉMENTE PAS le remplacement de Send par Loader2.
    // Le bouton est simplement `disabled` — l'icône Send reste dans le DOM.
    test('le bouton "Publier" est disabled lors d\'un envoi en cours', async () => {
      let resolveSubmit!: (val: boolean) => void;
      const pendingSubmit = new Promise<boolean>((resolve) => {
        resolveSubmit = resolve;
      });
      const mockOnAddComment = vi.fn().mockReturnValue(pendingSubmit);

      renderComments({ onAddComment: mockOnAddComment });

      await user.type(getCommentTextarea(), 'Test disabled state');
      await user.click(getSubmitButton());

      await waitFor(() => {
        const btn = getSubmitButton();
        expect(btn).toBeDisabled();
        // Le texte "Publier" est toujours présent (pas de remplacement par spinner)
        expect(btn).toHaveTextContent(/comments\.submit|Publier/i);
      });

      resolveSubmit(true);
    });
  });

  // =========================================================================
  // AFFICHAGE SELON AUTHENTIFICATION
  // =========================================================================

  describe('Affichage selon l\'état d\'authentification', () => {
    test('affiche le formulaire de commentaire quand l\'utilisateur est connecté', () => {
      mockIsAuthenticated.value = true;
      renderComments();

      expect(getCommentTextarea()).toBeInTheDocument();
      expect(getSubmitButton()).toBeInTheDocument();
    });

    test('affiche un message de connexion requise quand l\'utilisateur n\'est pas connecté', () => {
      mockIsAuthenticated.value = false;
      renderComments();

      expect(
        screen.getByText(/Connectez-vous pour laisser un avis|comments\.loginRequired/i)
      ).toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // LISTE DES COMMENTAIRES
  // =========================================================================

  describe('Affichage des commentaires', () => {
    test('affiche EmptyState quand il n\'y a aucun commentaire', () => {
      renderComments({ comments: [] });

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(
        screen.getByText(/Aucun avis pour le moment|comments\.empty/i)
      ).toBeInTheDocument();
    });

    test('affiche les commentaires existants', () => {
      renderComments({ comments: [SAMPLE_COMMENT] });

      expect(screen.getByText('Très belle œuvre !')).toBeInTheDocument();
      expect(screen.getByText(/Marie/)).toBeInTheDocument();
    });
  });
});
