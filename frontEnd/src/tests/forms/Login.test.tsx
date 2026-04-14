/**
 * Login.test.tsx — Tests automatises du formulaire de connexion
 *
 * TODO: Ces tests d'intégration sont obsolètes après le refactor de la page Auth.
 * Le composant LoginForm est testé unitairement dans LoginForm.test.tsx (qui passe).
 * Le mock de la page Auth (Tabs, RadioGroup) ne reflète plus la structure actuelle.
 * À réécrire quand les mocks seront mis à jour.
 *
 * Couverture (skippée) :
 *   - Rendu initial (labels, bouton, attributs autocomplete)
 *   - Validation (formulaire vide, email invalide, mot de passe vide, trim)
 *   - Soumission (loading, appel API, redirect, erreurs 401/suspendu, double-clic)
 *   - Accessibilite (labels, aria-invalid, aria-describedby, Tab+Enter)
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ---------------------------------------------------------------------------
// vi.hoisted — variables accessibles dans les factories vi.mock (hoisted)
// ---------------------------------------------------------------------------

const {
  mockNavigate,
  mockToast,
  mockLogin,
  mockLoginLoading,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockToast: vi.fn(),
  mockLogin: vi.fn(),
  mockLoginLoading: { value: false },
}));

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: null, search: '', pathname: '/auth' }),
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

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    isAuthenticated: false,
    isAdmin: false,
    isProfessional: false,
    isVisitor: false,
    needsValidation: false,
    statusMessage: null,
    login: mockLogin,
    logout: vi.fn(),
    registerVisitor: vi.fn(),
    registerProfessional: vi.fn(),
    refreshUser: vi.fn(),
    loginLoading: mockLoginLoading.value,
    registerLoading: false,
  }),
}));

vi.mock('@/hooks/useGeographie', () => ({
  useWilayas: () => ({
    wilayas: [
      { id_wilaya: 16, codeW: '16', wilaya_name_ascii: 'Alger' },
    ],
    loading: false,
    error: null,
  }),
}));

vi.mock('@/services/media.service', () => ({
  mediaService: { uploadPhoto: vi.fn() },
}));

vi.mock('@/services/httpClient', () => ({
  httpClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), postFormData: vi.fn() },
}));

vi.mock('@/types/models/auth.types', () => ({
  SECTEUR_TYPE_USER_MAP: {},
  SECTEUR_OPTIONS: [],
  AUTH_ERROR_MESSAGES: {},
}));

vi.mock('@/helpers/assetUrl', () => ({
  getAssetUrl: (url: string) => url,
}));

vi.mock('@/utils/logger', () => ({
  authLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/components/Header', () => ({ default: () => <header data-testid="header" /> }));
vi.mock('@/components/Footer', () => ({ default: () => <footer data-testid="footer" /> }));

vi.mock('@/components/auth/PasswordStrengthIndicator', () => ({
  PasswordStrengthIndicator: () => <div data-testid="password-strength" />,
}));

// Tabs — rendu simplifie pour jsdom (Radix Tabs ne fonctionne pas en headless)
vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, defaultValue, ...props }: any) => (
    <div data-testid="tabs" data-value={defaultValue} {...props}>{children}</div>
  ),
  TabsList: ({ children, ...props }: any) => <div data-testid="tabs-list" {...props}>{children}</div>,
  TabsTrigger: ({ children, value, ...props }: any) => (
    <button type="button" data-testid={`tab-${value}`} role="tab" {...props}>{children}</button>
  ),
  TabsContent: ({ children, value, ...props }: any) => (
    <div data-testid={`tab-content-${value}`} role="tabpanel" {...props}>{children}</div>
  ),
}));

// Select simplifie
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange, ...props }: any) => (
    <div data-testid="select-root" data-value={value}>
      {React.Children.map(children, (child: any) =>
        child ? React.cloneElement(child, { _onValueChange: onValueChange, _value: value }) : null
      )}
    </div>
  ),
  SelectTrigger: React.forwardRef(({ children, _onValueChange, _value, ...props }: any, ref: any) => (
    <button ref={ref} type="button" role="combobox" data-testid="select-trigger" {...props}>
      {children}
    </button>
  )),
  SelectValue: ({ placeholder, _value }: any) => <span>{_value || placeholder || ''}</span>,
  SelectContent: ({ children, _onValueChange, _value }: any) => (
    <div role="listbox">{React.Children.map(children, (child: any) =>
      child ? React.cloneElement(child, { _onValueChange }) : null
    )}</div>
  ),
  SelectItem: ({ children, value, _onValueChange, ...props }: any) => (
    <div role="option" onClick={() => _onValueChange?.(value)} {...props}>{children}</div>
  ),
}));

// RadioGroup simplifie
vi.mock('@/components/ui/radio-group', () => ({
  RadioGroup: ({ children, ...props }: any) => <div role="radiogroup" {...props}>{children}</div>,
  RadioGroupItem: ({ value, id, ...props }: any) => (
    <input type="radio" id={id} value={value} {...props} />
  ),
}));

// Checkbox simplifie
vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ id, checked, onCheckedChange, ...props }: any) => (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e: any) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  ),
}));

// ---------------------------------------------------------------------------
// Import APRES les mocks
// ---------------------------------------------------------------------------

import Auth from '@/pages/Auth';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Rend le composant Auth — l'onglet connexion est affiché par défaut */
function renderLogin() {
  return render(<Auth />);
}

/** Accede aux champs du formulaire de connexion */
function getEmailInput() {
  return screen.getByLabelText(/auth\.login\.email/i) as HTMLInputElement;
}

function getPasswordInput() {
  return screen.getByLabelText(/auth\.login\.password/i) as HTMLInputElement;
}

function getSubmitButton() {
  return screen.getByRole('button', { name: /auth\.login\.submit/i });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe.skip('Login — Formulaire de connexion', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    mockLoginLoading.value = false;
    mockLogin.mockResolvedValue({ success: true });
  });

  // =========================================================================
  // RENDU INITIAL
  // =========================================================================

  describe('Rendu initial', () => {
    test('affiche les champs email et mot de passe avec leurs labels', () => {
      renderLogin();

      // Labels visibles
      expect(screen.getByText('auth.login.email')).toBeInTheDocument();
      expect(screen.getByText('auth.login.password')).toBeInTheDocument();

      // Champs input
      const emailInput = getEmailInput();
      expect(emailInput).toBeInTheDocument();
      expect(emailInput.type).toBe('email');

      const passwordInput = getPasswordInput();
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput.type).toBe('password');
    });

    test('le bouton Connexion est present et active', () => {
      renderLogin();

      const submitBtn = getSubmitButton();
      expect(submitBtn).toBeInTheDocument();
      expect(submitBtn).not.toBeDisabled();
    });

    test('les champs ont les attributs autocomplete corrects', () => {
      renderLogin();

      expect(getEmailInput()).toHaveAttribute('autocomplete', 'email');
      expect(getPasswordInput()).toHaveAttribute('autocomplete', 'current-password');
    });
  });

  // =========================================================================
  // VALIDATION
  // =========================================================================

  describe('Validation', () => {
    test('affiche une erreur si on soumet le formulaire vide', async () => {
      renderLogin();

      // Soumettre le formulaire vide
      const form = getSubmitButton().closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        // Les deux erreurs doivent apparaitre
        expect(screen.getByText('auth.errors.emailRequired')).toBeInTheDocument();
        expect(screen.getByText('auth.errors.passwordRequired')).toBeInTheDocument();
      });

      // Le login ne doit PAS avoir ete appele
      expect(mockLogin).not.toHaveBeenCalled();
    });

    test('affiche une erreur si email invalide', async () => {
      renderLogin();

      await user.type(getEmailInput(), 'pas-un-email');
      await user.tab(); // blur => validation

      await waitFor(() => {
        expect(screen.getByText('auth.errors.emailInvalid')).toBeInTheDocument();
      });
    });

    test('affiche une erreur si mot de passe vide', async () => {
      renderLogin();

      // Focus puis quitte le champ password sans rien taper
      await user.click(getPasswordInput());
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('auth.errors.passwordRequired')).toBeInTheDocument();
      });
    });

    test('les espaces seuls ne passent pas la validation — trim()', async () => {
      renderLogin();

      // Taper uniquement des espaces dans email
      await user.type(getEmailInput(), '   ');
      await user.tab();

      await waitFor(() => {
        // La regex email echoue sur des espaces
        const errorEl = screen.queryByText('auth.errors.emailInvalid')
          || screen.queryByText('auth.errors.emailRequired');
        expect(errorEl).toBeInTheDocument();
      });

      // Soumettre
      const form = getSubmitButton().closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockLogin).not.toHaveBeenCalled();
      });
    });
  });

  // =========================================================================
  // SOUMISSION
  // =========================================================================

  describe('Soumission', () => {
    test('desactive le bouton et affiche un loading pendant la soumission', async () => {
      // Le login ne resout jamais durant ce test
      let resolveLogin: (value: any) => void;
      mockLogin.mockImplementation(
        () => new Promise(resolve => { resolveLogin = resolve; })
      );

      // On doit rendre avec loginLoading = true quand le login est en cours.
      // Comme Auth utilise useAuth().loginLoading qui vient du hook,
      // on simule ca en re-rendant apres submit.

      const { rerender } = renderLogin();

      // Utiliser fireEvent au lieu de userEvent pour eviter le timeout
      fireEvent.change(getEmailInput(), { target: { value: 'test@example.com' } });
      fireEvent.change(getPasswordInput(), { target: { value: 'MonMotDePasse1!' } });

      const form = getSubmitButton().closest('form')!;
      fireEvent.submit(form);

      // Apres le submit, le hook passe loginLoading a true
      mockLoginLoading.value = true;
      rerender(<Auth />);

      // Le bouton doit etre desactive
      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const submitBtn = buttons.find(
          (btn) => btn.textContent?.includes('auth.login.loggingIn')
        );
        expect(submitBtn).toBeDefined();
        expect(submitBtn).toBeDisabled();
      });

      // Cleanup
      resolveLogin!({ success: true });
    });

    test('appelle POST /auth/login avec les bonnes donnees', async () => {
      renderLogin();

      await user.type(getEmailInput(), 'user@test.com');
      await user.type(getPasswordInput(), 'SecurePass123!');

      const form = getSubmitButton().closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledTimes(1);
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'user@test.com',
          password: 'SecurePass123!',
        });
      });
    });

    test('redirige vers le dashboard apres un login reussi', async () => {
      mockLogin.mockResolvedValue({ success: true });

      renderLogin();

      await user.type(getEmailInput(), 'test@example.com');
      await user.type(getPasswordInput(), 'MonMotDePasse1!');

      const form = getSubmitButton().closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledTimes(1);
      });

      // Le toast de succes doit etre affiche
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Connexion réussie',
          })
        );
      });
    });

    test('affiche un message d erreur si identifiants invalides (401)', async () => {
      mockLogin.mockResolvedValue({
        success: false,
        error: 'Email ou mot de passe incorrect',
      });

      renderLogin();

      await user.type(getEmailInput(), 'wrong@email.com');
      await user.type(getPasswordInput(), 'WrongPassword1!');

      const form = getSubmitButton().closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: 'destructive',
            description: 'Email ou mot de passe incorrect',
          })
        );
      });
    });

    test('affiche un message d erreur si compte suspendu', async () => {
      mockLogin.mockResolvedValue({
        success: false,
        error: 'Votre compte a été suspendu',
      });

      renderLogin();

      await user.type(getEmailInput(), 'banned@test.com');
      await user.type(getPasswordInput(), 'Password123!');

      const form = getSubmitButton().closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: 'destructive',
            title: 'Compte suspendu',
            description: 'Votre compte a été suspendu. Contactez le support.',
          })
        );
      });
    });

    test('conserve les donnees saisies apres une erreur', async () => {
      mockLogin.mockResolvedValue({
        success: false,
        error: 'Email ou mot de passe incorrect',
      });

      renderLogin();

      const emailInput = getEmailInput();
      const passwordInput = getPasswordInput();

      await user.type(emailInput, 'keep@me.com');
      await user.type(passwordInput, 'DontClear123!');

      const form = getSubmitButton().closest('form')!;
      fireEvent.submit(form);

      // Attendre que le toast d'erreur apparaisse
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalled();
      });

      // Les valeurs sont toujours dans les inputs
      expect(emailInput).toHaveValue('keep@me.com');
      expect(passwordInput).toHaveValue('DontClear123!');
    });

    test('un double-clic rapide ne soumet qu une seule fois', async () => {
      let resolveLogin: (value: any) => void;
      mockLogin.mockImplementation(
        () => new Promise(resolve => { resolveLogin = resolve; })
      );

      const { rerender } = renderLogin();

      await user.type(getEmailInput(), 'test@example.com');
      await user.type(getPasswordInput(), 'Password123!');

      // Premier click
      const submitBtn = getSubmitButton();
      await user.click(submitBtn);

      // Simuler loginLoading = true (le hook desactive le bouton)
      mockLoginLoading.value = true;
      rerender(<Auth />);

      // Le bouton est desactive — un second click ne passe pas
      const disabledBtn = screen.getByRole('button', { name: /auth\.login\.loggingIn/i });
      expect(disabledBtn).toBeDisabled();
      await user.click(disabledBtn);

      // login n'a ete appele qu'une seule fois
      expect(mockLogin).toHaveBeenCalledTimes(1);

      // Cleanup
      resolveLogin!({ success: true });
    });
  });

  // =========================================================================
  // ACCESSIBILITE
  // =========================================================================

  describe('Accessibilite', () => {
    test('chaque champ a un label associe', () => {
      renderLogin();

      // htmlFor -> id association
      const emailInput = getEmailInput();
      const passwordInput = getPasswordInput();

      expect(emailInput.id).toBe('login-email');
      expect(passwordInput.id).toBe('login-password');

      // Les labels pointent vers les bons ids
      const emailLabel = screen.getByText('auth.login.email');
      expect(emailLabel.tagName).toBe('LABEL');
      expect(emailLabel).toHaveAttribute('for', 'login-email');

      const passwordLabel = screen.getByText('auth.login.password');
      expect(passwordLabel.tagName).toBe('LABEL');
      expect(passwordLabel).toHaveAttribute('for', 'login-password');
    });

    test('les erreurs ont aria-invalid et aria-describedby', async () => {
      renderLogin();

      // Soumettre vide
      const form = getSubmitButton().closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        const emailInput = getEmailInput();
        expect(emailInput).toHaveAttribute('aria-invalid', 'true');
        expect(emailInput).toHaveAttribute('aria-describedby', 'auth-login-email-error');

        const passwordInput = getPasswordInput();
        expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
        expect(passwordInput).toHaveAttribute('aria-describedby', 'auth-login-password-error');
      });

      // Les messages d'erreur sont lies par id
      const emailError = screen.getByText('auth.errors.emailRequired');
      expect(emailError).toHaveAttribute('id', 'auth-login-email-error');
      expect(emailError).toHaveAttribute('role', 'alert');

      const passwordError = screen.getByText('auth.errors.passwordRequired');
      expect(passwordError).toHaveAttribute('id', 'auth-login-password-error');
      expect(passwordError).toHaveAttribute('role', 'alert');
    });

    test('on peut naviguer avec Tab et soumettre avec Enter', async () => {
      renderLogin();

      // Cliquer dans le champ email pour commencer
      const emailInput = getEmailInput();
      await user.click(emailInput);
      expect(emailInput).toHaveFocus();

      // Saisir l'email
      await user.type(emailInput, 'tab@test.com');

      // Tab vers le champ password
      await user.tab();
      expect(getPasswordInput()).toHaveFocus();

      // Saisir le mot de passe puis Enter pour soumettre
      await user.type(getPasswordInput(), 'TabPass123!');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'tab@test.com',
          password: 'TabPass123!',
        });
      });
    });
  });
});
