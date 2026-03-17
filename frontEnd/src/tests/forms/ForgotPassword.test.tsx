/**
 * ForgotPassword.test.tsx — Tests automatisés du formulaire "Mot de passe oublié"
 *
 * Couverture :
 *   - Anti-énumération (affiche toujours un succès même si email inconnu)
 *   - Bouton disabled pendant le loading
 *   - Email invalide affiche une erreur
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ---------------------------------------------------------------------------
// vi.hoisted — variables accessibles dans les factories vi.mock (hoisted)
// ---------------------------------------------------------------------------

const { mockToast, mockForgotPassword } = vi.hoisted(() => ({
  mockToast: vi.fn(),
  mockForgotPassword: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...rest }: any) => <a href={to} {...rest}>{children}</a>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: 'fr', changeLanguage: vi.fn() },
  }),
}));

vi.mock('@/hooks/useRTL', () => ({
  useRTL: () => ({
    isRTL: false,
    direction: 'ltr',
    rtlClasses: { flexRow: '', marginEnd: () => '', marginStart: () => '' },
  }),
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
  toast: mockToast,
}));

vi.mock('@/services/user.service', () => ({
  userService: {
    forgotPassword: mockForgotPassword,
  },
}));

vi.mock('@/components/Header', () => ({ default: () => <header data-testid="header" /> }));
vi.mock('@/components/Footer', () => ({ default: () => <footer data-testid="footer" /> }));

// ---------------------------------------------------------------------------
// Import APRÈS les mocks
// ---------------------------------------------------------------------------

import ForgotPassword from '@/pages/ForgotPassword';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderForgotPassword() {
  return render(<ForgotPassword />);
}

function getEmailInput() {
  return screen.getByLabelText(/auth\.forgotPassword\.emailLabel/i) as HTMLInputElement;
}

function getSubmitButton() {
  return screen.getByRole('button', { name: /auth\.forgotPassword\.submit/i });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ForgotPassword — Mot de passe oublié', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    mockForgotPassword.mockResolvedValue({ success: true });
  });

  test('affiche toujours un message de succès même si email inconnu — anti-énumération', async () => {
    // L'API rejette (email inconnu / erreur serveur)
    mockForgotPassword.mockRejectedValue(new Error('User not found'));

    renderForgotPassword();

    await user.type(getEmailInput(), 'inconnu@example.com');

    // Soumettre le formulaire
    await user.click(getSubmitButton());

    // Malgré l'erreur, la vue "email envoyé" s'affiche
    await waitFor(() => {
      expect(screen.getByText('auth.forgotPassword.emailSentTitle')).toBeInTheDocument();
    });

    // Aucun message d'erreur technique visible pour l'utilisateur
    expect(screen.queryByText('User not found')).not.toBeInTheDocument();
  });

  test('bouton disabled pendant loading', async () => {
    // Le service ne résout jamais pendant ce test
    let resolveForgot!: (value: any) => void;
    mockForgotPassword.mockImplementation(
      () => new Promise(resolve => { resolveForgot = resolve; })
    );

    renderForgotPassword();

    await user.type(getEmailInput(), 'test@example.com');

    // Soumettre le formulaire
    await user.click(getSubmitButton());

    // Le bouton doit afficher "sending" et être disabled
    await waitFor(() => {
      const sendingBtn = screen.getByRole('button', { name: /auth\.forgotPassword\.sending/i });
      expect(sendingBtn).toBeDisabled();
    });

    // Cleanup — débloquer la promesse
    await act(async () => {
      resolveForgot({ success: true });
    });
  });

  test('email invalide affiche une erreur', async () => {
    renderForgotPassword();

    // Taper un email invalide
    await user.type(getEmailInput(), 'pas-un-email');
    await user.tab(); // blur => validation

    await waitFor(() => {
      expect(screen.getByText("Format d'email invalide")).toBeInTheDocument();
    });

    // Le champ est marqué aria-invalid avec aria-describedby
    const emailInput = getEmailInput();
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    expect(emailInput).toHaveAttribute('aria-describedby', 'forgot-email-error');

    // Le message d'erreur a le bon id et role
    const errorMsg = screen.getByText("Format d'email invalide");
    expect(errorMsg).toHaveAttribute('id', 'forgot-email-error');
    expect(errorMsg).toHaveAttribute('role', 'alert');

    // Le service n'a PAS été appelé
    expect(mockForgotPassword).not.toHaveBeenCalled();
  });
});
