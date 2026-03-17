/**
 * ResetPassword.test.tsx — Tests automatisés du formulaire de réinitialisation de mot de passe
 *
 * Couverture :
 *   - Mot de passe doit respecter les mêmes règles que l'inscription
 *   - Confirmation doit correspondre
 *   - Token invalide affiche un message d'erreur
 *   - Redirection après succès
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ---------------------------------------------------------------------------
// vi.hoisted — variables accessibles dans les factories vi.mock (hoisted)
// ---------------------------------------------------------------------------

const {
  mockNavigate,
  mockToast,
  mockResetPassword,
  mockParams,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockToast: vi.fn(),
  mockResetPassword: vi.fn(),
  mockParams: { value: { token: 'valid-token-abc123' } as Record<string, string> },
}));

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('react-router-dom', () => ({
  useParams: () => mockParams.value,
  useNavigate: () => mockNavigate,
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
    resetPassword: mockResetPassword,
  },
}));

vi.mock('@/components/Header', () => ({ default: () => <header data-testid="header" /> }));
vi.mock('@/components/Footer', () => ({ default: () => <footer data-testid="footer" /> }));

vi.mock('@/components/auth/PasswordStrengthIndicator', () => ({
  PasswordStrengthIndicator: () => <div data-testid="password-strength" />,
}));

// ---------------------------------------------------------------------------
// Import APRÈS les mocks
// ---------------------------------------------------------------------------

import ResetPassword from '@/pages/ResetPassword';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderResetPassword() {
  return render(<ResetPassword />);
}

function getPasswordInput() {
  return screen.getByLabelText(/auth\.resetPassword\.newPassword/i) as HTMLInputElement;
}

function getConfirmInput() {
  return screen.getByLabelText(/auth\.resetPassword\.confirmPassword/i) as HTMLInputElement;
}

function getSubmitButton() {
  return screen.getByRole('button', { name: /auth\.resetPassword\.submit/i });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ResetPassword — Réinitialisation du mot de passe', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    mockParams.value = { token: 'valid-token-abc123' };
    mockResetPassword.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('mot de passe doit respecter les mêmes règles que l inscription', async () => {
    renderResetPassword();

    const passwordInput = getPasswordInput();
    const confirmInput = getConfirmInput();
    const form = getSubmitButton().closest('form')!;

    // Règle 1 : Minimum 12 caractères
    await user.type(passwordInput, 'Short1!Aa');
    await user.type(confirmInput, 'Short1!Aa');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Minimum 12 caractères')).toBeInTheDocument();
    });

    // Règle 2 : Doit contenir une majuscule
    await user.clear(passwordInput);
    await user.clear(confirmInput);
    await user.type(passwordInput, 'nouppercase123!');
    await user.type(confirmInput, 'nouppercase123!');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Doit contenir une majuscule')).toBeInTheDocument();
    });

    // Règle 3 : Doit contenir une minuscule
    await user.clear(passwordInput);
    await user.clear(confirmInput);
    await user.type(passwordInput, 'NOLOWERCASE123!');
    await user.type(confirmInput, 'NOLOWERCASE123!');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Doit contenir une minuscule')).toBeInTheDocument();
    });

    // Règle 4 : Doit contenir un chiffre
    await user.clear(passwordInput);
    await user.clear(confirmInput);
    await user.type(passwordInput, 'NoDigitHereAa!!');
    await user.type(confirmInput, 'NoDigitHereAa!!');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Doit contenir un chiffre')).toBeInTheDocument();
    });

    // Règle 5 : Doit contenir un caractère spécial
    await user.clear(passwordInput);
    await user.clear(confirmInput);
    await user.type(passwordInput, 'NoSpecialChar1A');
    await user.type(confirmInput, 'NoSpecialChar1A');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Doit contenir un caractère spécial')).toBeInTheDocument();
    });

    // Le service n'a JAMAIS été appelé (toutes les soumissions ont échoué côté client)
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  test('confirmation doit correspondre', async () => {
    renderResetPassword();

    // Mot de passe valide mais confirmation différente
    await user.type(getPasswordInput(), 'ValidPass123!@');
    await user.type(getConfirmInput(), 'DifferentPass1!');

    const form = getSubmitButton().closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('auth.errors.passwordMismatch')).toBeInTheDocument();
    });

    // Le service n'a PAS été appelé
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  test('token invalide affiche un message d erreur', () => {
    // Simuler l'absence de token dans l'URL
    mockParams.value = {};

    renderResetPassword();

    // La vue "token invalide" s'affiche
    expect(screen.getByText('auth.resetPassword.invalidTokenTitle')).toBeInTheDocument();
    expect(screen.getByText('auth.resetPassword.invalidTokenDescription')).toBeInTheDocument();

    // Un lien vers /forgot-password est proposé
    const link = screen.getByRole('link', { name: /auth\.resetPassword\.requestNewLink/i });
    expect(link).toHaveAttribute('href', '/forgot-password');

    // Aucun formulaire n'est rendu
    expect(screen.queryByLabelText(/auth\.resetPassword\.newPassword/i)).not.toBeInTheDocument();
  });

  test('redirection après succès', async () => {
    vi.useFakeTimers();

    mockResetPassword.mockResolvedValue({ success: true });

    renderResetPassword();

    // Remplir les champs avec fireEvent (compatible fake timers)
    fireEvent.change(getPasswordInput(), { target: { value: 'SecurePass123!' } });
    fireEvent.change(getConfirmInput(), { target: { value: 'SecurePass123!' } });

    // Soumettre et flusher les microtasks (await resetPassword)
    await act(async () => {
      fireEvent.submit(getSubmitButton().closest('form')!);
      await vi.advanceTimersByTimeAsync(0);
    });

    // Vue de succès affichée
    expect(screen.getByText('auth.resetPassword.successTitle')).toBeInTheDocument();

    // Toast de succès appelé
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'auth.resetPassword.successTitle',
      })
    );

    // navigate pas encore appelé (timer de 3s)
    expect(mockNavigate).not.toHaveBeenCalled();

    // Avancer de 3 secondes
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Redirection vers la page de connexion
    expect(mockNavigate).toHaveBeenCalledWith('/auth');
  });
});
