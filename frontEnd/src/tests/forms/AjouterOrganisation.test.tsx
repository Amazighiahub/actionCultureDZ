/**
 * AjouterOrganisation.test.tsx — Tests automatises du formulaire de creation d'organisation
 *
 * Couverture :
 *   - Rendu (champs requis, select types dynamique)
 *   - Validation (nom, type)
 *   - Soumission (donnees, loading, redirect, toast erreur)
 *   - Multilingue (onglets, langues requises)
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ---------------------------------------------------------------------------
// vi.hoisted — variables accessibles dans les factories vi.mock (hoisted)
// ---------------------------------------------------------------------------

const {
  mockNavigate,
  mockToast,
  mockHttpGet,
  mockHttpPost,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockToast: vi.fn(),
  mockHttpGet: vi.fn(),
  mockHttpPost: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Donnees de reference
// ---------------------------------------------------------------------------

const MOCK_TYPES = [
  { id_type_organisation: 1, nom: { fr: 'Association', ar: '', en: '' } },
  { id_type_organisation: 2, nom: { fr: 'Entreprise', ar: '', en: '' } },
];

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('react-router-dom', () => ({
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

vi.mock('@/services/httpClient', () => ({
  httpClient: {
    get: (...args: any[]) => mockHttpGet(...args),
    post: (...args: any[]) => mockHttpPost(...args),
    put: vi.fn(),
    delete: vi.fn(),
    postFormData: vi.fn(),
  },
}));

vi.mock('@/config/api', () => ({
  API_ENDPOINTS: {
    organisations: {
      types: '/organisations/types',
      create: '/organisations',
      me: '/organisations/me',
    },
  },
}));

// -- Radix Select -> native HTML pour jsdom --
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

vi.mock('@/components/Header', () => ({ default: () => <header data-testid="header" /> }));
vi.mock('@/components/Footer', () => ({ default: () => <footer data-testid="footer" /> }));

vi.mock('@/components/MultiLangInput', () => ({
  __esModule: true,
  default: ({ name, label, value, onChange, requiredLanguages = [] }: any) => {
    const langs = ['fr', 'ar', 'en', 'tz-ltn', 'tz-tfng'];
    const [active, setActive] = React.useState('fr');
    return (
      <div data-testid={`multilang-${name}`}>
        <div role="tablist">
          {langs.map((l: string) => (
            <button
              key={l}
              role="tab"
              aria-selected={active === l}
              data-lang={l}
              onClick={() => setActive(l)}
            >
              {l}
              {requiredLanguages.includes(l) && <span data-testid={`required-${name}-${l}`}>*</span>}
            </button>
          ))}
        </div>
        <input
          data-testid={`input-${name}-${active}`}
          aria-label={`${label} (${active})`}
          value={value[active] || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChange({ ...value, [active]: e.target.value })
          }
        />
      </div>
    );
  },
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
import AjouterOrganisation from '@/pages/AjouterOrganisation';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Attend que les types soient charges */
async function waitForDataLoad() {
  await waitFor(() => {
    expect(mockHttpGet).toHaveBeenCalled();
  });
  // Attendre que les options soient rendues
  await waitFor(() => {
    expect(screen.getAllByRole('option').length).toBeGreaterThanOrEqual(2);
  });
}

/** Submit le formulaire via fireEvent (contourne les limites jsdom/requestSubmit) */
function submitForm() {
  const form = document.querySelector('form')!;
  fireEvent.submit(form);
}

// ---------------------------------------------------------------------------
// TESTS
// ---------------------------------------------------------------------------

describe('AjouterOrganisation', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();

    mockHttpGet.mockResolvedValue({ success: true, data: MOCK_TYPES });
    mockHttpPost.mockResolvedValue({ success: true, data: { id_organisation: 42 } });
  });

  // =========================================================================
  // RENDU
  // =========================================================================

  describe('Rendu', () => {
    test('affiche tous les champs requis', async () => {
      render(<AjouterOrganisation />);
      await waitForDataLoad();

      // Nom (multilang)
      expect(screen.getByTestId('multilang-nom')).toBeInTheDocument();
      // Description (multilang)
      expect(screen.getByTestId('multilang-description')).toBeInTheDocument();
      // Type select (mock renders options)
      expect(screen.getAllByRole('option').length).toBeGreaterThanOrEqual(2);
      // Site web input
      expect(screen.getByPlaceholderText('https://www.example.com')).toBeInTheDocument();
    });

    test('les types d organisation se chargent dans le select', async () => {
      render(<AjouterOrganisation />);
      await waitForDataLoad();

      const options = screen.getAllByRole('option');
      const texts = options.map(o => o.textContent);
      expect(texts).toContain('Association');
      expect(texts).toContain('Entreprise');
    });
  });

  // =========================================================================
  // VALIDATION
  // =========================================================================

  describe('Validation', () => {
    test('bloque si nom vide dans toutes les langues', async () => {
      render(<AjouterOrganisation />);
      await waitForDataLoad();

      submitForm();

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ variant: 'destructive' })
        );
      });
      expect(mockHttpPost).not.toHaveBeenCalled();
    });

    test('bloque si aucun type selectionne', async () => {
      render(<AjouterOrganisation />);
      await waitForDataLoad();

      // Remplir le nom FR mais pas le type
      await user.type(screen.getByTestId('input-nom-fr'), 'Mon organisation');

      submitForm();

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ variant: 'destructive' })
        );
      });
      expect(mockHttpPost).not.toHaveBeenCalled();
    });

    test('accepte si nom rempli en FR seulement', async () => {
      render(<AjouterOrganisation />);
      await waitForDataLoad();

      // Remplir le nom FR
      await user.type(screen.getByTestId('input-nom-fr'), 'Association Culture');

      // Selectionner un type
      const options = screen.getAllByRole('option');
      const assocOpt = options.find(o => o.textContent?.includes('Association'));
      if (assocOpt) await user.click(assocOpt);

      submitForm();

      await waitFor(() => expect(mockHttpPost).toHaveBeenCalledTimes(1));
    });
  });

  // =========================================================================
  // SOUMISSION
  // =========================================================================

  describe('Soumission', () => {
    test('envoie les donnees correctes au service', async () => {
      render(<AjouterOrganisation />);
      await waitForDataLoad();

      // Remplir nom FR
      await user.type(screen.getByTestId('input-nom-fr'), 'Festival Culturel DZ');

      // Selectionner type
      const options = screen.getAllByRole('option');
      const assocOpt = options.find(o => o.textContent?.includes('Association'));
      if (assocOpt) await user.click(assocOpt);

      // Remplir site web
      await user.type(screen.getByPlaceholderText('https://www.example.com'), 'https://festivalculture.dz');

      submitForm();

      await waitFor(() => expect(mockHttpPost).toHaveBeenCalledTimes(1));

      const [endpoint, body] = mockHttpPost.mock.calls[0];
      expect(endpoint).toBe('/organisations');
      expect(body.nom.fr).toBe('Festival Culturel DZ');
      expect(body.id_type_organisation).toBe(1);
      expect(body.site_web).toBe('https://festivalculture.dz');
      expect(body.description).toBeDefined();
    });

    test('bouton disabled pendant loading', async () => {
      mockHttpPost.mockImplementation(
        () => new Promise(resolve =>
          setTimeout(() => resolve({ success: true, data: { id_organisation: 99 } }), 500)
        )
      );

      render(<AjouterOrganisation />);
      await waitForDataLoad();

      // Remplir les champs
      await user.type(screen.getByTestId('input-nom-fr'), 'Mon Asso');
      const options = screen.getAllByRole('option');
      const assocOpt = options.find(o => o.textContent?.includes('Association'));
      if (assocOpt) await user.click(assocOpt);

      submitForm();

      await waitFor(() => {
        const submitBtn = screen.getByRole('button', { name: /Cr[ée]ation en cours/i });
        expect(submitBtn).toBeDisabled();
      });
    });

    test('redirige vers ajouter-evenement apres creation', async () => {
      render(<AjouterOrganisation />);
      await waitForDataLoad();

      // Remplir les champs
      await user.type(screen.getByTestId('input-nom-fr'), 'Mon Asso');
      const options = screen.getAllByRole('option');
      const assocOpt = options.find(o => o.textContent?.includes('Association'));
      if (assocOpt) await user.click(assocOpt);

      submitForm();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/ajouter-evenement');
      });
    });

    test('affiche toast erreur en cas d echec', async () => {
      mockHttpPost.mockRejectedValue(new Error('Network error'));

      render(<AjouterOrganisation />);
      await waitForDataLoad();

      // Remplir les champs
      await user.type(screen.getByTestId('input-nom-fr'), 'Mon Asso');
      const options = screen.getAllByRole('option');
      const assocOpt = options.find(o => o.textContent?.includes('Association'));
      if (assocOpt) await user.click(assocOpt);

      submitForm();

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ variant: 'destructive' })
        );
      });
    });
  });

  // =========================================================================
  // MULTILINGUE
  // =========================================================================

  describe('Multilingue', () => {
    test('les onglets de langue sont affiches', async () => {
      render(<AjouterOrganisation />);
      await waitForDataLoad();

      const nomContainer = screen.getByTestId('multilang-nom');
      const tabs = within(nomContainer).getAllByRole('tab');

      expect(tabs).toHaveLength(5);
      expect(tabs.map(t => t.getAttribute('data-lang'))).toEqual([
        'fr', 'ar', 'en', 'tz-ltn', 'tz-tfng',
      ]);
    });

    test('fr et ar sont marques comme requis', async () => {
      render(<AjouterOrganisation />);
      await waitForDataLoad();

      const nomContainer = screen.getByTestId('multilang-nom');

      // seul fr est requise (requiredLanguages={['fr']})
      expect(within(nomContainer).getByTestId('required-nom-fr')).toBeInTheDocument();

      // en, tz-ltn, tz-tfng ne sont PAS requises
      expect(within(nomContainer).queryByTestId('required-nom-en')).not.toBeInTheDocument();
      expect(within(nomContainer).queryByTestId('required-nom-tz-ltn')).not.toBeInTheDocument();
      expect(within(nomContainer).queryByTestId('required-nom-tz-tfng')).not.toBeInTheDocument();
    });
  });
});
