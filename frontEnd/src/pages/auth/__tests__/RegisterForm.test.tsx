/**
 * RegisterForm.test.tsx — Tests unitaires du composant RegisterForm
 *
 * Couverture :
 *   Groupe A - Formulaires : erreur sur saisie invalide
 *     1. Mot de passe < 12 caractères → message d'erreur
 *     2. Mot de passe sans caractère spécial → message d'erreur spécifique
 *     3. Soumettre sans cocher les CGU → erreur accepte_conditions
 *   Groupe B - Bouton désactivé pendant l'envoi
 *     (RegisterForm ne gère pas isSubmitting en interne — c'est registerLoading du hook)
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ---------------------------------------------------------------------------
// vi.hoisted — variables accessibles dans les factories vi.mock
// ---------------------------------------------------------------------------

const {
  mockNavigate,
  mockToast,
  mockRegisterVisitor,
  mockRegisterProfessional,
  mockRegisterLoading,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockToast: vi.fn(),
  mockRegisterVisitor: vi.fn(),
  mockRegisterProfessional: vi.fn(),
  mockRegisterLoading: { value: false },
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
    login: vi.fn(),
    logout: vi.fn(),
    registerVisitor: mockRegisterVisitor,
    registerProfessional: mockRegisterProfessional,
    refreshUser: vi.fn(),
    loginLoading: false,
    registerLoading: mockRegisterLoading.value,
  }),
}));

vi.mock('@/hooks/useGeographie', () => ({
  useWilayas: () => ({
    wilayas: [
      { id_wilaya: 16, codeW: '16', wilaya_name_ascii: 'Alger' },
      { id_wilaya: 31, codeW: '31', wilaya_name_ascii: 'Oran' },
    ],
    loading: false,
    error: null,
  }),
  useGeographicSelection: () => ({
    wilayas: [
      { id_wilaya: 16, codeW: '16', wilaya_name_ascii: 'Alger' },
      { id_wilaya: 31, codeW: '31', wilaya_name_ascii: 'Oran' },
    ],
    dairas: [],
    communes: [],
    setSelectedWilaya: () => {},
    setSelectedDaira: () => {},
    setSelectedCommune: () => {},
    wilayasLoading: false,
    dairasLoading: false,
    communesLoading: false,
  }),
}));

vi.mock('@/services/httpClient', () => ({
  httpClient: {
    get: vi.fn(), post: vi.fn(), put: vi.fn(),
    delete: vi.fn(), postFormData: vi.fn(), upload: vi.fn(),
  },
}));

vi.mock('@/types/models/auth.types', () => ({
  SECTEUR_TYPE_USER_MAP: { ecrivain: 2, artiste: 6 },
  SECTEUR_OPTIONS: [
    { value: 'ecrivain', label: 'Écrivain' },
    { value: 'artiste', label: 'Artiste' },
  ],
  AUTH_ERROR_MESSAGES: {},
}));

vi.mock('@/helpers/assetUrl', () => ({
  getAssetUrl: (url: string) => url,
}));

vi.mock('@/utils/logger', () => ({
  authLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// PasswordStrengthIndicator — mock léger
vi.mock('@/components/auth/PasswordStrengthIndicator', () => ({
  PasswordStrengthIndicator: ({ password }: { password: string }) => {
    if (!password) return null;
    return <div data-testid="password-strength">{password.length >= 12 ? 'Strong' : 'Weak'}</div>;
  },
}));

// PhoneInput — mock natif pour éviter les dépendances complexes
vi.mock('@/components/shared/PhoneInput', () => ({
  PhoneInput: ({ id, value, onChange, onBlur, error, ...rest }: any) => (
    <input
      id={id}
      type="tel"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      onBlur={onBlur}
      aria-invalid={error}
      {...rest}
    />
  ),
}));

// Shadcn UI mocks — cohérents avec Register.test.tsx existant
vi.mock('@/components/ui/radio-group', () => ({
  RadioGroup: ({ children, value, onValueChange, ...props }: any) => (
    <div role="radiogroup" data-value={value} {...props}
      onClick={(e: any) => {
        const target = e.target as HTMLInputElement;
        if (target.tagName === 'INPUT' && target.type === 'radio') {
          onValueChange?.(target.value);
        }
      }}>
      {children}
    </div>
  ),
  RadioGroupItem: ({ value, id, ...props }: any) => (
    <input type="radio" id={id} value={value} readOnly {...props} />
  ),
}));

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

// Mocks composants layout (non testés ici)
vi.mock('@/components/Header', () => ({ default: () => <header data-testid="header" /> }));
vi.mock('@/components/Footer', () => ({ default: () => <footer data-testid="footer" /> }));
vi.mock('@/components/ui/required-label', () => ({
  RequiredLabel: ({ children, htmlFor, required }: any) => (
    <label htmlFor={htmlFor}>
      {children}{required && ' *'}
    </label>
  ),
}));

// ---------------------------------------------------------------------------
// Import APRÈS les mocks
// ---------------------------------------------------------------------------

import RegisterForm from '@/pages/auth/RegisterForm';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderRegisterForm(props = {}) {
  return render(<RegisterForm onSwitchToLogin={vi.fn()} {...props} />);
}

function getPasswordInput() {
  return screen.getByLabelText(/auth\.register\.password/i) as HTMLInputElement;
}

function getConfirmInput() {
  return screen.getByLabelText(/auth\.register\.confirmPassword/i) as HTMLInputElement;
}

function getSubmitButton() {
  return screen.getByRole('button', { name: /auth\.register\.createAccount/i });
}

function getForm() {
  return getSubmitButton().closest('form')!;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RegisterForm', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    mockRegisterLoading.value = false;
    mockRegisterVisitor.mockResolvedValue({ success: true });
    mockRegisterProfessional.mockResolvedValue({ success: true });
  });

  // =========================================================================
  // GROUPE A — Formulaires : erreur sur saisie invalide
  // =========================================================================

  describe('Groupe A — Validation mot de passe', () => {
    // Couvre : Groupe A, test 1 — mot de passe < 12 caractères
    test('affiche une erreur quand le mot de passe a moins de 12 caractères (onBlur)', async () => {
      renderRegisterForm();

      // 8 caractères — trop court
      await user.type(getPasswordInput(), 'Short1!A');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('auth.errors.passwordMinLength')).toBeInTheDocument();
      });

      expect(getPasswordInput()).toHaveAttribute('aria-invalid', 'true');
    });

    // Couvre : Groupe A, test 1 — variante : soumission avec mdp court
    test('affiche une erreur au submit quand le mot de passe a moins de 12 caractères', async () => {
      renderRegisterForm();

      await user.type(getPasswordInput(), 'Short1!');
      fireEvent.submit(getForm());

      await waitFor(() => {
        expect(screen.getByText('auth.errors.passwordMinLength')).toBeInTheDocument();
      });
    });

    // Couvre : Groupe A, test 2 — mot de passe sans caractère spécial
    test('affiche le message spécifique quand le mot de passe n\'a pas de caractère spécial', async () => {
      renderRegisterForm();

      // ≥12 chars, upper, lower, digit — mais PAS de spécial
      await user.type(getPasswordInput(), 'NoSpecialChar1A');
      await user.tab();

      await waitFor(() => {
        expect(
          screen.getByText('Le mot de passe doit contenir au moins un caractère spécial')
        ).toBeInTheDocument();
      });
    });

    // Test complémentaire : mot de passe sans majuscule
    test('affiche le message spécifique quand le mot de passe n\'a pas de majuscule', async () => {
      renderRegisterForm();

      // ≥12 chars, lower, digit, special — mais PAS de majuscule
      await user.type(getPasswordInput(), 'nouppercase123!');
      await user.tab();

      await waitFor(() => {
        expect(
          screen.getByText('Le mot de passe doit contenir au moins une majuscule')
        ).toBeInTheDocument();
      });
    });

    // Test complémentaire : mot de passe valide — PAS d'erreur
    test('n\'affiche pas d\'erreur pour un mot de passe valide', async () => {
      renderRegisterForm();

      await user.type(getPasswordInput(), 'SecurePass123!');
      await user.tab();

      await waitFor(() => {
        expect(screen.queryByText('auth.errors.passwordMinLength')).not.toBeInTheDocument();
        expect(screen.queryByText(/doit contenir/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Groupe A — Validation CGU (accepte_conditions)', () => {
    // Couvre : Groupe A, test 3 — soumettre sans cocher les CGU
    test('affiche une erreur sur accepte_conditions si non cochée à la soumission', async () => {
      renderRegisterForm();

      // Soumettre le formulaire vide (sans cocher les CGU)
      fireEvent.submit(getForm());

      await waitFor(() => {
        // Le message d'erreur CGU est rendu dans un <p role="alert" id="auth-conditions-error">
        expect(screen.getByText('auth.errors.acceptTermsRequired')).toBeInTheDocument();
      });
    });

    // Couvre : Groupe A, test 3 — variante : remplir champs mais pas CGU
    test('l\'erreur CGU disparaît après avoir coché la case', async () => {
      renderRegisterForm();

      // Soumettre sans cocher
      fireEvent.submit(getForm());

      await waitFor(() => {
        expect(screen.getByText('auth.errors.acceptTermsRequired')).toBeInTheDocument();
      });

      // Cocher les CGU
      const cguCheckbox = screen.getByLabelText(/auth\.register\.acceptTerms\.prefix/i);
      await user.click(cguCheckbox);

      await waitFor(() => {
        expect(screen.queryByText('auth.errors.acceptTermsRequired')).not.toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // GROUPE B — Bouton désactivé pendant registerLoading
  // =========================================================================

  describe('Groupe B — Bouton désactivé pendant le chargement', () => {
    // Note : RegisterForm utilise `registerLoading` du hook useAuth (pas un état interne).
    // On le simule via mockRegisterLoading.value = true + re-render.

    test('le bouton de soumission est disabled quand registerLoading est true', () => {
      // Modifier la valeur AVANT le render (mock lit la valeur au moment du render)
      mockRegisterLoading.value = true;

      renderRegisterForm();

      // Quand registerLoading = true, le bouton affiche "auth.register.registering"
      const btn = screen.getByRole('button', { name: /auth\.register\.registering/i });
      expect(btn).toBeDisabled();

      mockRegisterLoading.value = false;
    });
  });
});
