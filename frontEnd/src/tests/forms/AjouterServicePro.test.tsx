/**
 * AjouterServicePro.test.tsx — Tests automatises du formulaire de creation de service pro
 *
 * Couverture :
 *   - Rendu (champs requis, types de service, bouton submit)
 *   - Validation (nom, type, lieu, message erreur)
 *   - Tarif (min <= max, plage valide)
 *   - Soumission (donnees, loading, redirect)
 *   - Contact (email/telephone/URL format)
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent, act } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// vi.hoisted — variables accessibles dans les factories vi.mock (hoisted)
// ---------------------------------------------------------------------------

const {
  mockNavigate,
  mockToast,
  mockHttpPost,
  mockHttpGet,
  mockHttpPut,
  mockHttpUpload,
  mockGetSiteDetail,
  mockRecherche,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockToast: vi.fn(),
  mockHttpPost: vi.fn(),
  mockHttpGet: vi.fn(),
  mockHttpPut: vi.fn(),
  mockHttpUpload: vi.fn(),
  mockGetSiteDetail: vi.fn(),
  mockRecherche: vi.fn(),
}));

let mockParams: Record<string, string> = {};
let mockSearchParams: Record<string, string> = {};

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Stable reference for useSearchParams to avoid re-render on every call
const searchParamsObj = {
  get: (key: string) => mockSearchParams[key] || null,
};
const searchParamsArr = [searchParamsObj] as const;

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
  useSearchParams: () => searchParamsArr,
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

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { id_user: 1 }, isLoading: false }),
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
  toast: mockToast,
}));

vi.mock('@/services/httpClient', () => ({
  httpClient: {
    get: (...args: any[]) => mockHttpGet(...args),
    post: (...args: any[]) => mockHttpPost(...args),
    put: (...args: any[]) => mockHttpPut(...args),
    delete: vi.fn().mockResolvedValue({ success: true }),
    upload: (...args: any[]) => mockHttpUpload(...args),
    postFormData: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('@/services/patrimoine.service', () => ({
  patrimoineService: {
    getSiteDetail: (...args: any[]) => mockGetSiteDetail(...args),
    recherche: (...args: any[]) => mockRecherche(...args),
    getLieuxProximite: vi.fn().mockResolvedValue({ success: true, data: [] }),
  },
}));

// -- Radix Select -> native HTML for jsdom --
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange, ...props }: any) => {
    return (
      <div data-testid="select-root" data-value={value}>
        {React.Children.map(children, (child: any) =>
          child ? React.cloneElement(child, { _onValueChange: onValueChange, _value: value }) : null
        )}
      </div>
    );
  },
  SelectTrigger: React.forwardRef(({ children, _onValueChange, _value, ...props }: any, ref: any) => (
    <button ref={ref} type="button" role="combobox" aria-expanded="false" data-testid="select-trigger" {...props}>
      {children}
    </button>
  )),
  SelectValue: ({ placeholder, _value }: any) => (
    <span>{_value || placeholder || ''}</span>
  ),
  SelectContent: ({ children, _onValueChange, _value }: any) => (
    <div role="listbox" data-testid="select-content">
      {React.Children.map(children, (child: any) =>
        child ? React.cloneElement(child, { _onValueChange }) : null
      )}
    </div>
  ),
  SelectItem: ({ children, value, _onValueChange, ...props }: any) => (
    <div
      role="option"
      data-value={value}
      onClick={() => _onValueChange?.(value)}
      {...props}
    >
      {children}
    </div>
  ),
}));

// -- RadioGroup -> simple mock --
vi.mock('@/components/ui/radio-group', () => ({
  RadioGroup: ({ children, value, onValueChange, className, ...props }: any) => (
    <div data-testid="radio-group-lieu" className={className} data-value={value}>
      {children}
    </div>
  ),
  RadioGroupItem: ({ value, id, ...props }: any) => (
    <input type="radio" id={id} value={value} data-testid={`radio-${id}`} readOnly />
  ),
}));

vi.mock('@/components/Header', () => ({ default: () => <header data-testid="header" /> }));
vi.mock('@/components/Footer', () => ({ default: () => <footer data-testid="footer" /> }));

vi.mock('@/components/MultiLangInput', () => ({
  __esModule: true,
  default: ({ name, label, value, onChange, requiredLanguages = [] }: any) => {
    const langs = ['fr', 'ar', 'en', 'tz-ltn', 'tz-tfng'];
    const [active, setActive] = React.useState('fr');
    return (
      <div data-testid={name ? `multilang-${name}` : undefined}>
        <div role="tablist">
          {langs.map((l: string) => (
            <button
              key={l}
              role="tab"
              type="button"
              aria-selected={active === l}
              data-lang={l}
              onClick={() => setActive(l)}
            >
              {l}
              {requiredLanguages.includes(l) && <span data-testid={`required-${l}`}>*</span>}
            </button>
          ))}
        </div>
        <input
          data-testid={name ? `input-${name}-${active}` : undefined}
          aria-label={label ? `${label} (${active})` : undefined}
          value={value[active] || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChange({ ...value, [active]: e.target.value })
          }
        />
      </div>
    );
  },
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ id, checked, onCheckedChange, ...props }: any) => (
    <input
      type="checkbox"
      id={id}
      checked={!!checked}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  ),
}));

vi.mock('@/utils/keyboardHelper', () => ({
  KeyboardHelper: {
    detectTamazightKeyboard: vi.fn().mockReturnValue({ tifinagh: false, latin: false, any: false }),
    getInstallationGuide: vi.fn().mockReturnValue([]),
  },
}));

// ---------------------------------------------------------------------------
// Import APRES les mocks
// ---------------------------------------------------------------------------
import AjouterServicePro from '@/pages/AjouterServicePro';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function submitForm() {
  const form = document.querySelector('form')!;
  fireEvent.submit(form);
}

async function waitForReady() {
  await waitFor(() => {
    expect(screen.getByTestId('multilang-nom')).toBeInTheDocument();
  });
}

function typeInto(element: HTMLElement, value: string) {
  fireEvent.change(element, { target: { value } });
}

function selectServiceType(label = /Restaurant \/ Café/i) {
  fireEvent.click(screen.getByText(label));
}

// ---------------------------------------------------------------------------
// TESTS
// ---------------------------------------------------------------------------

describe('AjouterServicePro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = {};
    mockSearchParams = {};

    mockHttpPost.mockResolvedValue({ success: true, data: { id: 42 } });
    mockHttpGet.mockResolvedValue({ success: true, data: {} });
    mockHttpPut.mockResolvedValue({ success: true, data: {} });
    mockHttpUpload.mockResolvedValue({ success: true, data: { url: 'http://img.test/photo.jpg' } });
    mockRecherche.mockResolvedValue({ success: true, data: { items: [] } });
    mockGetSiteDetail.mockResolvedValue({
      success: true,
      data: { id_lieu: 5, nom: { fr: 'Casbah' }, latitude: 36.78, longitude: 3.06 },
    });
  });

  afterEach(() => {
    cleanup();
  });

  // =========================================================================
  // RENDU
  // =========================================================================

  describe('Rendu', () => {
    test('affiche tous les champs requis', async () => {
      render(<AjouterServicePro />);
      await waitForReady();

      expect(screen.getByTestId('multilang-nom')).toBeInTheDocument();
      const radiogroups = screen.getAllByRole('radiogroup');
      expect(radiogroups.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByPlaceholderText('+213 XX XX XX XX')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('contact@example.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('https://www.example.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('500')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('2000')).toBeInTheDocument();
    });

    test('les types de service sont affiches', async () => {
      render(<AjouterServicePro />);
      await waitForReady();

      expect(screen.getByText(/Restaurant \/ Café/i)).toBeInTheDocument();
      expect(screen.getByText(/Hébergement/i)).toBeInTheDocument();
      expect(screen.getByText(/Guide touristique/i)).toBeInTheDocument();
      expect(screen.getByText(/Transport/i)).toBeInTheDocument();
      expect(screen.getByText(/Artisanat \/ Boutique/i)).toBeInTheDocument();
      expect(screen.getByText(/Location \(vélos, etc\.\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Autre service/i)).toBeInTheDocument();
    });

    test('affiche le bouton de soumission', async () => {
      render(<AjouterServicePro />);
      await waitForReady();

      const submitBtn = screen.getByRole('button', { name: /Soumettre mon service/i });
      expect(submitBtn).toBeInTheDocument();
      expect(submitBtn).not.toBeDisabled();
    });
  });

  // =========================================================================
  // VALIDATION
  // =========================================================================

  describe('Validation', () => {
    test('bloque si nom vide dans toutes les langues', async () => {
      render(<AjouterServicePro />);
      await waitForReady();

      selectServiceType();
      submitForm();

      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        const errorAlert = alerts.find(a =>
          a.textContent?.includes('nom') || a.textContent?.includes('requis')
        );
        expect(errorAlert).toBeTruthy();
      });
      expect(mockHttpPost).not.toHaveBeenCalled();
    });

    test('bloque si aucun type de service selectionne', async () => {
      render(<AjouterServicePro />);
      await waitForReady();

      typeInto(screen.getByTestId('input-nom-fr'), 'Mon Service');
      submitForm();

      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        const typeError = alerts.find(a =>
          a.textContent?.includes('type') || a.textContent?.includes('requis')
        );
        expect(typeError).toBeTruthy();
      });
      expect(mockHttpPost).not.toHaveBeenCalled();
    });

    test('bloque si lieu manquant (mode existing)', async () => {
      render(<AjouterServicePro />);
      await waitForReady();

      typeInto(screen.getByTestId('input-nom-fr'), 'Mon Service');
      selectServiceType();
      submitForm();

      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        const lieuError = alerts.find(a =>
          a.textContent?.includes('lieu') || a.textContent?.includes('sélectionner')
        );
        expect(lieuError).toBeTruthy();
      });
      expect(mockHttpPost).not.toHaveBeenCalled();
    });

    test('affiche le message d erreur dans une alerte visible', async () => {
      render(<AjouterServicePro />);
      await waitForReady();

      submitForm();

      await waitFor(() => {
        const destructiveAlert = screen.getAllByRole('alert').find(a =>
          a.getAttribute('aria-live') === 'assertive'
        );
        expect(destructiveAlert).toBeTruthy();
        expect(destructiveAlert!.textContent).toBeTruthy();
      });
    });
  });

  // =========================================================================
  // TARIF
  // =========================================================================

  describe('Tarif', () => {
    test('erreur si tarif min superieur au tarif max', async () => {
      mockSearchParams = { lieu: '5' };
      render(<AjouterServicePro />);
      await waitForReady();

      typeInto(screen.getByTestId('input-nom-fr'), 'Mon Service');
      selectServiceType();

      await waitFor(() => {
        expect(mockGetSiteDetail).toHaveBeenCalledWith(5);
      });

      typeInto(screen.getByPlaceholderText('500'), '3000');
      typeInto(screen.getByPlaceholderText('2000'), '1000');

      submitForm();

      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        const tarifError = alerts.find(a =>
          a.textContent?.includes('tarif') || a.textContent?.includes('minimum')
        );
        expect(tarifError).toBeTruthy();
      });
      expect(mockHttpPost).not.toHaveBeenCalled();
    });

    test('accepte une plage de tarif valide', async () => {
      mockSearchParams = { lieu: '5' };
      render(<AjouterServicePro />);
      await waitForReady();

      typeInto(screen.getByTestId('input-nom-fr'), 'Mon Service');
      selectServiceType();

      await waitFor(() => {
        expect(mockGetSiteDetail).toHaveBeenCalledWith(5);
      });

      typeInto(screen.getByPlaceholderText('500'), '500');
      typeInto(screen.getByPlaceholderText('2000'), '2000');

      submitForm();

      await waitFor(() => {
        expect(mockHttpPost).toHaveBeenCalledWith(
          '/services',
          expect.objectContaining({
            tarif_min: 500,
            tarif_max: 2000,
          })
        );
      });
    });
  });

  // =========================================================================
  // SOUMISSION
  // =========================================================================

  describe('Soumission', () => {
    test('envoie les donnees correctes au service', async () => {
      mockSearchParams = { lieu: '5' };
      render(<AjouterServicePro />);
      await waitForReady();

      typeInto(screen.getByTestId('input-nom-fr'), 'Restaurant Le Casbah');
      selectServiceType();

      await waitFor(() => {
        expect(mockGetSiteDetail).toHaveBeenCalledWith(5);
      });

      typeInto(screen.getByPlaceholderText('contact@example.com'), 'test@example.com');
      typeInto(screen.getByPlaceholderText('+213 XX XX XX XX'), '+213 555 1234');

      submitForm();

      await waitFor(() => {
        expect(mockHttpPost).toHaveBeenCalledWith(
          '/services',
          expect.objectContaining({
            nom: expect.objectContaining({ fr: 'Restaurant Le Casbah' }),
            type_service: 'restaurant',
            email: 'test@example.com',
            telephone: '+213 555 1234',
            id_lieu: 5,
          })
        );
      });
    });

    test('bouton disabled pendant le loading', async () => {
      mockSearchParams = { lieu: '5' };
      let resolvePost: (v: any) => void;
      mockHttpPost.mockImplementation(
        () => new Promise(resolve => { resolvePost = resolve; })
      );

      render(<AjouterServicePro />);
      await waitForReady();

      typeInto(screen.getByTestId('input-nom-fr'), 'Mon Service');
      selectServiceType();

      await waitFor(() => {
        expect(mockGetSiteDetail).toHaveBeenCalledWith(5);
      });

      submitForm();

      await waitFor(() => {
        const submitBtn = screen.getByRole('button', { name: /Envoi/i });
        expect(submitBtn).toBeDisabled();
      });

      // Resolve to clean up
      await act(async () => {
        resolvePost!({ success: true, data: { id: 99 } });
      });
    });

    test('redirige apres creation reussie', async () => {
      mockSearchParams = { lieu: '5' };
      render(<AjouterServicePro />);
      await waitForReady();

      typeInto(screen.getByTestId('input-nom-fr'), 'Mon Service');
      selectServiceType();

      await waitFor(() => {
        expect(mockGetSiteDetail).toHaveBeenCalledWith(5);
      });

      submitForm();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard-pro');
      });
    });
  });

  // =========================================================================
  // CONTACT
  // =========================================================================

  describe('Contact', () => {
    test('valide le format email, telephone et URL', async () => {
      mockSearchParams = { lieu: '5' };
      render(<AjouterServicePro />);
      await waitForReady();

      typeInto(screen.getByTestId('input-nom-fr'), 'Mon Service');
      selectServiceType();

      await waitFor(() => {
        expect(mockGetSiteDetail).toHaveBeenCalledWith(5);
      });

      typeInto(screen.getByPlaceholderText('contact@example.com'), 'bad-email');
      typeInto(screen.getByPlaceholderText('https://www.example.com'), 'not-a-url');

      submitForm();

      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        const contactError = alerts.find(a =>
          a.textContent?.includes('email') ||
          a.textContent?.includes('téléphone') ||
          a.textContent?.includes('URL') ||
          a.textContent?.includes('invalide')
        );
        expect(contactError).toBeTruthy();
      });
      expect(mockHttpPost).not.toHaveBeenCalled();
    });
  });
});
