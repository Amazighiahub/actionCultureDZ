/**
 * VerifyEmailPage.test.tsx — Tests de la page de vérification email
 *
 * Couverture :
 *   - Sans token → affiche erreur "token manquant"
 *   - Token valide → affiche succès + redirection vers /
 *   - Token invalide (réponse erreur) → affiche message d'erreur
 *   - Erreur réseau → affiche message d'erreur serveur
 *   - Bouton retour affiché en cas d'erreur
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// vi.hoisted — stableT pour éviter la boucle useEffect([..., t])
// ---------------------------------------------------------------------------

const {
  mockNavigate,
  mockParams,
  mockVerifyEmail,
  stableT,
} = vi.hoisted(() => {
  const stableT = (key: string): string => key;
  return {
    mockNavigate: vi.fn(),
    mockParams: { value: {} as Record<string, string | undefined> },
    mockVerifyEmail: vi.fn(),
    stableT,
  };
});

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockParams.value,
  Link: ({ children, to, ...rest }: any) => <a href={to} {...rest}>{children}</a>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: stableT,
    i18n: { language: 'fr', changeLanguage: vi.fn() },
  }),
}));

vi.mock('@/services/auth.service', () => ({
  authService: {
    verifyEmail: mockVerifyEmail,
  },
}));

vi.mock('lucide-react', () => ({
  Loader2: ({ className }: any) => <span className={className}>loader</span>,
}));

// Simple UI mocks
vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant, ...props }: any) => (
    <div data-variant={variant} {...props}>{children}</div>
  ),
  AlertTitle: ({ children }: any) => <h4>{children}</h4>,
  AlertDescription: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, ...props }: any) => {
    if (asChild && React.isValidElement(children)) {
      return children;
    }
    return <button {...props}>{children}</button>;
  },
}));

// ---------------------------------------------------------------------------
// Import APRÈS les mocks
// ---------------------------------------------------------------------------

import VerifyEmailPage from '@/pages/VerifyEmailPage';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('VerifyEmailPage — Vérification email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams.value = { token: 'valid-token-123' };
    mockVerifyEmail.mockResolvedValue({ success: true });
  });

  // =========================================================================
  // SANS TOKEN
  // =========================================================================

  test('sans token affiche une erreur immédiate', async () => {
    mockParams.value = {};

    render(<VerifyEmailPage />);

    // Le message d'erreur "noToken" s'affiche
    await waitFor(() => {
      expect(screen.getByText('verifyemailpage.noToken')).toBeInTheDocument();
    });

    // Le service n'est PAS appelé
    expect(mockVerifyEmail).not.toHaveBeenCalled();

    // Le titre d'erreur est visible
    expect(screen.getByText('verifyemailpage.erreur_lors_vrification')).toBeInTheDocument();

    // Le lien retour est visible
    expect(screen.getByText('verifyemailpage.retour_page_daccueil')).toBeInTheDocument();
  });

  // =========================================================================
  // TOKEN VALIDE
  // =========================================================================

  test('token valide affiche le message de succès', async () => {
    render(<VerifyEmailPage />);

    // D'abord le loading s'affiche
    expect(screen.getByText('verifyemailpage.verifying')).toBeInTheDocument();

    // Puis succès
    await waitFor(() => {
      expect(screen.getByText('verifyemailpage.vrification_russie')).toBeInTheDocument();
    });

    // Le message de succès avec redirection
    expect(screen.getByText('verifyemailpage.successRedirect')).toBeInTheDocument();

    // verifyEmail a été appelé avec le bon token
    expect(mockVerifyEmail).toHaveBeenCalledWith('valid-token-123');
  });

  test('token valide redirige vers / après 3 secondes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText('verifyemailpage.vrification_russie')).toBeInTheDocument();
    });

    // Avant les 3 secondes → pas de navigation
    expect(mockNavigate).not.toHaveBeenCalled();

    // Avancer de 3 secondes
    vi.advanceTimersByTime(3000);

    // La redirection a lieu
    expect(mockNavigate).toHaveBeenCalledWith('/');

    vi.useRealTimers();
  });

  // =========================================================================
  // TOKEN INVALIDE
  // =========================================================================

  test('token invalide (réponse erreur API) affiche le message', async () => {
    mockVerifyEmail.mockResolvedValueOnce({
      success: false,
      error: 'Token expiré ou invalide',
    });

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText('Token expiré ou invalide')).toBeInTheDocument();
    });

    // Le titre d'erreur
    expect(screen.getByText('verifyemailpage.erreur_lors_vrification')).toBeInTheDocument();

    // Le lien retour
    expect(screen.getByText('verifyemailpage.retour_page_daccueil')).toBeInTheDocument();
  });

  // =========================================================================
  // ERREUR RÉSEAU
  // =========================================================================

  test('erreur réseau affiche le message serveur', async () => {
    mockVerifyEmail.mockRejectedValueOnce({
      response: { data: { error: 'Erreur serveur 500' } },
    });

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText('Erreur serveur 500')).toBeInTheDocument();
    });

    expect(screen.getByText('verifyemailpage.erreur_lors_vrification')).toBeInTheDocument();
  });

  test('erreur réseau sans response.data affiche le fallback i18n', async () => {
    mockVerifyEmail.mockRejectedValueOnce(new Error('Network failure'));

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText('verifyemailpage.serverError')).toBeInTheDocument();
    });
  });
});
