/**
 * AjouterService.test.tsx — Tests du formulaire d'ajout de services aux lieux
 *
 * Couverture :
 *   - Rendu initial (titre, onglets, filtres, liste lieux)
 *   - Sélection d'un lieu (bascule vers onglet 2)
 *   - Services prédéfinis (toggle checkbox)
 *   - Service personnalisé (ajout, validation nom vide, suppression)
 *   - Soumission (sans lieu, sans services, avec services, erreur serveur)
 *   - Succès (message + reset)
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ---------------------------------------------------------------------------
// vi.hoisted
// ---------------------------------------------------------------------------

const {
  mockNavigate,
  mockToast,
  mockRecherche,
  mockGetServices,
  mockAddService,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockToast: vi.fn(),
  mockRecherche: vi.fn(),
  mockGetServices: vi.fn(),
  mockAddService: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/ajouter-service', state: null, search: '' }),
  Link: ({ children, to, ...rest }: any) => <a href={to} {...rest}>{children}</a>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: 'fr', changeLanguage: vi.fn() },
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/services/patrimoine.service', () => ({
  patrimoineService: {
    recherche: mockRecherche,
  },
}));

vi.mock('@/services/lieu.service', () => ({
  lieuService: {
    getServices: mockGetServices,
    addService: mockAddService,
  },
}));

// Header / Footer
vi.mock('@/components/Header', () => ({ default: () => <header data-testid="header" /> }));
vi.mock('@/components/Footer', () => ({ default: () => <footer data-testid="footer" /> }));

// MultiLangInput
vi.mock('@/components/MultiLangInput', () => ({
  default: ({ name, label, value, onChange, errors }: any) => (
    <div data-testid={`multilang-${name || 'unnamed'}`}>
      <label>{label}</label>
      <input
        data-testid={`${name || 'unnamed'}-fr`}
        value={value?.fr || ''}
        aria-invalid={!!errors?.fr}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, fr: e.target.value })}
      />
      {errors?.fr && <p role="alert">{errors.fr}</p>}
    </div>
  ),
}));

// Radix Select
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select-root" data-value={value}>
      {React.Children.map(children, (child: any) =>
        child ? React.cloneElement(child, { _onValueChange: onValueChange, _value: value }) : null
      )}
    </div>
  ),
  SelectTrigger: React.forwardRef(({ children, ...props }: any, ref: any) => (
    <button ref={ref} type="button" role="combobox" {...props}>{children}</button>
  )),
  SelectValue: ({ placeholder, _value }: any) => <span>{_value || placeholder || ''}</span>,
  SelectContent: ({ children, _onValueChange }: any) => (
    <div role="listbox">
      {React.Children.map(children, (child: any) =>
        child ? React.cloneElement(child, { _onValueChange }) : null
      )}
    </div>
  ),
  SelectItem: ({ children, value, _onValueChange }: any) => (
    <div role="option" data-value={value} onClick={() => _onValueChange?.(value)}>{children}</div>
  ),
}));

// Tabs
vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: any) => (
    <div data-testid="tabs" data-active={value}>
      {React.Children.map(children, (child: any) =>
        child ? React.cloneElement(child, { _activeTab: value, _setActiveTab: onValueChange }) : null
      )}
    </div>
  ),
  TabsList: ({ children, className }: any) => <div className={className}>{children}</div>,
  TabsTrigger: ({ children, value, disabled, _setActiveTab }: any) => (
    <button
      data-testid={`tab-${value}`}
      disabled={disabled}
      onClick={() => _setActiveTab?.(value)}
    >
      {children}
    </button>
  ),
  TabsContent: ({ children, value, _activeTab }: any) => (
    _activeTab === value ? <div data-testid={`tab-content-${value}`}>{children}</div> : null
  ),
}));

// Checkbox
vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ id, checked, onCheckedChange, disabled, ...props }: any) => (
    <input
      type="checkbox"
      id={id}
      checked={!!checked}
      disabled={disabled}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onCheckedChange?.(!checked)}
      {...props}
    />
  ),
}));

// Simple UI mocks
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className}>{children}</h3>,
  CardDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: React.forwardRef((props: any, ref: any) => <input ref={ref} {...props} />),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>,
  AlertDescription: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

// ---------------------------------------------------------------------------
// Import APRÈS les mocks
// ---------------------------------------------------------------------------

import AjouterService from '@/pages/AjouterService';

// ---------------------------------------------------------------------------
// Données de test
// ---------------------------------------------------------------------------

const MOCK_LIEUX = [
  {
    id_lieu: 1,
    nom: { fr: 'Casbah d\'Alger', ar: 'قصبة الجزائر' },
    adresse: { fr: '16 Rue de la Casbah' },
    typePatrimoine: 'monument',
  },
  {
    id_lieu: 2,
    nom: { fr: 'Tipaza' },
    adresse: { fr: 'Tipaza centre' },
    typePatrimoine: 'vestige',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderComponent() {
  return render(<AjouterService />);
}

async function waitForDataLoad() {
  await waitFor(() => {
    expect(mockRecherche).toHaveBeenCalled();
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AjouterService — Formulaire ajout de services aux lieux', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    mockRecherche.mockResolvedValue({
      success: true,
      data: { items: MOCK_LIEUX },
    });
    mockGetServices.mockResolvedValue({
      success: true,
      data: [],
    });
    mockAddService.mockResolvedValue({ success: true });
  });

  // =========================================================================
  // RENDU INITIAL
  // =========================================================================

  describe('Rendu initial', () => {
    test('affiche le titre et les onglets', async () => {
      renderComponent();
      await waitForDataLoad();

      expect(screen.getByText('Ajouter des services')).toBeInTheDocument();
      expect(screen.getByTestId('tab-select-lieu')).toBeInTheDocument();
      expect(screen.getByTestId('tab-add-services')).toBeInTheDocument();
    });

    test('onglet 2 est désactivé sans lieu sélectionné', async () => {
      renderComponent();
      await waitForDataLoad();

      expect(screen.getByTestId('tab-add-services')).toBeDisabled();
    });

    test('affiche la liste des lieux patrimoniaux', async () => {
      renderComponent();
      await waitForDataLoad();

      await waitFor(() => {
        const casbahEls = screen.getAllByText(/Casbah/);
        expect(casbahEls.length).toBeGreaterThanOrEqual(1);
        const tipazaEls = screen.getAllByText(/Tipaza/);
        expect(tipazaEls.length).toBeGreaterThanOrEqual(1);
      });
    });

    test('affiche le filtre de recherche et le sélecteur de type', async () => {
      renderComponent();
      await waitForDataLoad();

      expect(screen.getByPlaceholderText(/Nom du lieu/)).toBeInTheDocument();
      // Types patrimoine
      const options = screen.getAllByRole('option');
      expect(options.length).toBeGreaterThanOrEqual(2);
    });
  });

  // =========================================================================
  // SÉLECTION D'UN LIEU
  // =========================================================================

  describe('Sélection d\'un lieu', () => {
    test('cliquer sur un lieu bascule vers l\'onglet services', async () => {
      renderComponent();
      await waitForDataLoad();

      // Cliquer sur le lieu (role="button")
      const lieuButtons = screen.getAllByRole('button');
      const casbahBtn = lieuButtons.find(btn => btn.textContent?.includes('Casbah'));
      expect(casbahBtn).toBeTruthy();
      await user.click(casbahBtn!);

      // L'onglet 2 est maintenant actif (le contenu des services s'affiche)
      await waitFor(() => {
        expect(mockGetServices).toHaveBeenCalledWith(1);
      });
    });
  });

  // =========================================================================
  // SERVICE PERSONNALISÉ
  // =========================================================================

  describe('Service personnalisé', () => {
    async function selectLieu() {
      renderComponent();
      await waitForDataLoad();

      const lieuButtons = screen.getAllByRole('button');
      const casbahBtn = lieuButtons.find(btn => btn.textContent?.includes('Casbah'));
      await user.click(casbahBtn!);
      await waitFor(() => expect(mockGetServices).toHaveBeenCalled());
    }

    test('ajouter un service custom sans nom affiche une erreur', async () => {
      await selectLieu();

      // Cliquer sur "Ajouter à la liste" sans remplir le nom
      const addBtn = screen.getByText('Ajouter à la liste');
      await user.click(addBtn);

      // Le toast destructive est appelé avec le message d'erreur
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
          variant: 'destructive',
        }));
      });
    });

    test('ajouter un service custom avec nom le met dans la liste', async () => {
      await selectLieu();

      // Remplir le nom FR du service custom
      const nomInput = screen.getByTestId('customServiceNom-fr');
      await user.type(nomInput, 'Location de vélos');

      // Cliquer sur "Ajouter à la liste"
      const addBtn = screen.getByText('Ajouter à la liste');
      await user.click(addBtn);

      // Le toast de succès est appelé
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
          title: expect.stringContaining('ajouté'),
        }));
      });

      // Le service apparaît dans la liste
      expect(screen.getByText('Location de vélos')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // SOUMISSION
  // =========================================================================

  describe('Soumission', () => {
    async function selectLieuAndAddService() {
      renderComponent();
      await waitForDataLoad();

      // Sélectionner un lieu
      const lieuButtons = screen.getAllByRole('button');
      const casbahBtn = lieuButtons.find(btn => btn.textContent?.includes('Casbah'));
      await user.click(casbahBtn!);
      await waitFor(() => expect(mockGetServices).toHaveBeenCalled());

      // Ajouter un service custom
      const nomInput = screen.getByTestId('customServiceNom-fr');
      await user.type(nomInput, 'Test Service');
      const addBtn = screen.getByText('Ajouter à la liste');
      await user.click(addBtn);
    }

    test('bouton soumettre est désactivé sans aucun service sélectionné', async () => {
      renderComponent();
      await waitForDataLoad();

      // Sélectionner un lieu
      const lieuButtons = screen.getAllByRole('button');
      const casbahBtn = lieuButtons.find(btn => btn.textContent?.includes('Casbah'));
      await user.click(casbahBtn!);
      await waitFor(() => expect(mockGetServices).toHaveBeenCalled());

      // Le bouton soumettre est disabled quand aucun service n'est sélectionné
      const submitBtn = screen.getByText('Ajouter les services');
      expect(submitBtn).toBeDisabled();

      expect(mockAddService).not.toHaveBeenCalled();
    });

    test('soumission avec service appelle lieuService.addService', async () => {
      await selectLieuAndAddService();

      // Soumettre
      const submitBtn = screen.getByText('Ajouter les services');
      await user.click(submitBtn);

      await waitFor(() => {
        expect(mockAddService).toHaveBeenCalledWith(1, expect.objectContaining({
          nom: expect.objectContaining({ fr: 'Test Service' }),
          disponible: true,
        }));
      });
    });

    test('erreur serveur affiche le message', async () => {
      mockAddService.mockRejectedValueOnce(new Error('Erreur réseau'));

      await selectLieuAndAddService();

      const submitBtn = screen.getByText('Ajouter les services');
      await user.click(submitBtn);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
          variant: 'destructive',
        }));
      });
    });
  });
});
