/**
 * AjouterEvenement.test.tsx — Tests automatises du formulaire de creation d'evenement
 *
 * Couverture :
 *   - Rendu (champs requis, selects dynamiques)
 *   - Validation (nom, type, dates, capacite, prix)
 *   - Upload image (preview, rejet type/taille, mode edition)
 *   - Brouillon (exigences minimales)
 *   - Soumission (FormData, loading, redirect, cache invalidation)
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
  mockInvalidateQueries,
  mockIsAuthenticated,
  mockGetWilayas,
  mockGetTypesEvenements,
  mockCreate,
  mockUpdate,
  mockGetById,
  mockHttpGet,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockToast: vi.fn(),
  mockInvalidateQueries: vi.fn(),
  mockIsAuthenticated: vi.fn().mockReturnValue(true),
  mockGetWilayas: vi.fn(),
  mockGetTypesEvenements: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockGetById: vi.fn(),
  mockHttpGet: vi.fn(),
}));

let mockParams: Record<string, string> = {};

// ---------------------------------------------------------------------------
// Donnees de reference
// ---------------------------------------------------------------------------

const MOCK_TYPES = [
  { id_type_evenement: 1, nom_type: 'Festival' },
  { id_type_evenement: 2, nom_type: 'Conference' },
];
const MOCK_WILAYAS = [
  { id_wilaya: 16, codeW: '16', wilaya_name_ascii: 'Alger' },
  { id_wilaya: 31, codeW: '31', wilaya_name_ascii: 'Oran' },
];
const MOCK_ORGANISATIONS = [
  { id_organisation: 10, nom: 'Association Culture DZ' },
];

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
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

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
  QueryClient: vi.fn(),
  QueryClientProvider: ({ children }: any) => children,
}));

vi.mock('@/services/auth.service', () => ({
  authService: { isAuthenticated: (...args: any[]) => mockIsAuthenticated(...args) },
}));

vi.mock('@/services/metadata.service', () => ({
  metadataService: {
    getWilayas: (...args: any[]) => mockGetWilayas(...args),
    getTypesEvenements: (...args: any[]) => mockGetTypesEvenements(...args),
  },
}));

vi.mock('@/services/evenement.service', () => ({
  evenementService: {
    create: (...args: any[]) => mockCreate(...args),
    update: (...args: any[]) => mockUpdate(...args),
    getById: (...args: any[]) => mockGetById(...args),
  },
}));

vi.mock('@/services/httpClient', () => ({
  httpClient: {
    get: (...args: any[]) => mockHttpGet(...args),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    postFormData: vi.fn(),
  },
}));

vi.mock('@/config/api', () => ({
  API_ENDPOINTS: { organisations: { me: '/organisations/me' } },
}));

// -- Radix Select → native HTML select pour jsdom --
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

vi.mock('@/components/LieuSelector', () => ({
  LieuSelector: ({ value, onChange }: any) => (
    <button data-testid="lieu-selector" onClick={() => onChange(1, { adresse: '123 Rue Test' })}>
      {value ? `Lieu #${value}` : 'Choisir un lieu'}
    </button>
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
              {requiredLanguages.includes(l) && <span data-testid={`required-${l}`}>*</span>}
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

// Checkbox mock (Radix Checkbox also has issues in jsdom)
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

// ---------------------------------------------------------------------------
// Import APRES les mocks
// ---------------------------------------------------------------------------
import AjouterEvenement from '@/pages/AjouterEvenement';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockFile(name: string, sizeKB: number, type: string): File {
  const content = new Uint8Array(sizeKB * 1024);
  return new File([content], name, { type });
}

/** Attend que les donnees de reference soient chargees (wilayas, types, orgs) */
async function waitForDataLoad() {
  await waitFor(() => {
    expect(mockGetTypesEvenements).toHaveBeenCalled();
    expect(mockGetWilayas).toHaveBeenCalled();
    expect(mockHttpGet).toHaveBeenCalled(); // organisations
  });
  // Attendre que le bouton publish soit enabled (hasOrganisation=true)
  await waitFor(() => {
    const btn = screen.getByRole('button', { name: /publishEvent/i });
    expect(btn).not.toBeDisabled();
  });
}

/** Selectionne un type d'evenement dans le mock select */
async function selectEventType(user: ReturnType<typeof userEvent.setup>) {
  const typeOptions = screen.getAllByRole('option');
  const festivalOpt = typeOptions.find(o => o.textContent?.includes('Festival'));
  if (festivalOpt) await user.click(festivalOpt);
}

/** Submit le formulaire via fireEvent (contourne les limites jsdom/requestSubmit) */
function submitForm() {
  const form = document.querySelector('form')!;
  fireEvent.submit(form);
}

/** Remplir le formulaire avec les champs minimaux pour soumission complete */
async function fillMinimalForm(user: ReturnType<typeof userEvent.setup>) {
  // Nom FR
  const nomInput = screen.getByTestId('input-nom-fr');
  await user.clear(nomInput);
  await user.type(nomInput, 'Festival Culturel');

  // Type evenement
  await selectEventType(user);

  // Date debut
  const dateDebut = document.getElementById('date-debut') as HTMLInputElement;
  await user.type(dateDebut, '2026-06-15');

  // Lieu
  await user.click(screen.getByTestId('lieu-selector'));

  // Image
  const fileInput = document.getElementById('affiche-upload') as HTMLInputElement;
  const file = createMockFile('affiche.jpg', 200, 'image/jpeg');
  await user.upload(fileInput, file);
}

// ---------------------------------------------------------------------------
// TESTS
// ---------------------------------------------------------------------------

describe('AjouterEvenement', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = {};
    user = userEvent.setup();

    mockIsAuthenticated.mockReturnValue(true);
    mockGetWilayas.mockResolvedValue({ success: true, data: MOCK_WILAYAS });
    mockGetTypesEvenements.mockResolvedValue({ success: true, data: MOCK_TYPES });
    mockHttpGet.mockResolvedValue({ success: true, data: MOCK_ORGANISATIONS });
    mockCreate.mockResolvedValue({ success: true, data: { id_evenement: 42 } });
    mockUpdate.mockResolvedValue({ success: true, data: { id_evenement: 1 } });

    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:preview-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  // =========================================================================
  // RENDU
  // =========================================================================

  describe('Rendu', () => {
    test('affiche tous les champs requis', async () => {
      render(<AjouterEvenement />);
      await waitForDataLoad();

      // Nom (multilang)
      expect(screen.getByTestId('multilang-nom')).toBeInTheDocument();
      // Description (multilang)
      expect(screen.getByTestId('multilang-description')).toBeInTheDocument();
      // Type select (mock renders options)
      expect(screen.getAllByRole('option').length).toBeGreaterThanOrEqual(2);
      // Date debut
      expect(document.getElementById('date-debut')).toBeInTheDocument();
      // Date fin
      expect(document.getElementById('date-fin')).toBeInTheDocument();
      // Max participants
      expect(document.getElementById('max-participants')).toBeInTheDocument();
      // Image upload
      expect(document.getElementById('affiche-upload')).toBeInTheDocument();
    });

    test('les types d evenements se chargent dans le select', async () => {
      render(<AjouterEvenement />);
      await waitForDataLoad();

      const options = screen.getAllByRole('option');
      const texts = options.map(o => o.textContent);
      expect(texts).toContain('Festival');
      expect(texts).toContain('Conference');
    });

    test('les wilayas se chargent dans le select de lieu', async () => {
      render(<AjouterEvenement />);
      await waitForDataLoad();

      // Les wilayas sont rendues dans un select mock
      const allOptions = screen.getAllByRole('option');
      const wilayaTexts = allOptions.map(o => o.textContent || '');
      expect(wilayaTexts.some(t => t.includes('Alger'))).toBe(true);
      expect(wilayaTexts.some(t => t.includes('Oran'))).toBe(true);
    });
  });

  // =========================================================================
  // VALIDATION
  // =========================================================================

  describe('Validation', () => {
    test('bloque la soumission si le nom est vide dans toutes les langues', async () => {
      render(<AjouterEvenement />);
      await waitForDataLoad();

      submitForm();

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ variant: 'destructive' })
        );
      });
      expect(mockCreate).not.toHaveBeenCalled();
    });

    test('bloque si aucun type selectionne', async () => {
      render(<AjouterEvenement />);
      await waitForDataLoad();

      await user.type(screen.getByTestId('input-nom-fr'), 'Mon evenement');

      submitForm();

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ variant: 'destructive' })
        );
      });
      expect(mockCreate).not.toHaveBeenCalled();
    });

    test('bloque si pas de date de debut', async () => {
      render(<AjouterEvenement />);
      await waitForDataLoad();

      await user.type(screen.getByTestId('input-nom-fr'), 'Mon evenement');
      await selectEventType(user);

      submitForm();

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ variant: 'destructive' })
        );
      });
      expect(mockCreate).not.toHaveBeenCalled();
    });

    test('erreur si date fin avant date debut', async () => {
      render(<AjouterEvenement />);
      await waitForDataLoad();

      await user.type(screen.getByTestId('input-nom-fr'), 'Mon evenement');
      await selectEventType(user);
      await user.type(document.getElementById('date-debut')!, '2026-06-15');
      await user.type(document.getElementById('date-fin')!, '2026-06-10');
      await user.click(screen.getByTestId('lieu-selector'));
      await user.upload(
        document.getElementById('affiche-upload') as HTMLInputElement,
        createMockFile('img.jpg', 100, 'image/jpeg')
      );

      submitForm();

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ variant: 'destructive' })
        );
      });
      expect(mockCreate).not.toHaveBeenCalled();
    });

    test('erreur si capacite negative', async () => {
      render(<AjouterEvenement />);
      await waitForDataLoad();

      const maxInput = document.getElementById('max-participants') as HTMLInputElement;

      // Le guard onChange bloque les negatives :
      // if (val === '' || (Number(val) >= 0 && Number(val) <= 100000))
      await user.clear(maxInput);
      await user.type(maxInput, '-5');

      // Le '-' seul est rejete par Number(val) >= 0
      expect(maxInput.value === '' || Number(maxInput.value) >= 0).toBe(true);
    });

    test('erreur si prix negatif', async () => {
      render(<AjouterEvenement />);
      await waitForDataLoad();

      // Le tarif est visible car gratuit=false par defaut
      const tarifInput = document.getElementById('tarif') as HTMLInputElement;

      await user.clear(tarifInput);
      await user.type(tarifInput, '-100');

      // Guard: Number(val) >= 0 && Number(val) <= 1000000
      expect(tarifInput.value === '' || Number(tarifInput.value) >= 0).toBe(true);
    });
  });

  // =========================================================================
  // UPLOAD IMAGE
  // =========================================================================

  describe('Upload Image', () => {
    test('le preview s affiche apres selection d une image', async () => {
      render(<AjouterEvenement />);
      await waitForDataLoad();

      const fileInput = document.getElementById('affiche-upload') as HTMLInputElement;
      await user.upload(fileInput, createMockFile('photo.jpg', 500, 'image/jpeg'));

      await waitFor(() => {
        const preview = screen.getByAltText(/aper[cç]u/i);
        expect(preview).toBeInTheDocument();
        expect(preview).toHaveAttribute('src', 'blob:preview-url');
      });
    });

    test('rejette un fichier non-image', async () => {
      render(<AjouterEvenement />);
      await waitForDataLoad();

      const fileInput = document.getElementById('affiche-upload') as HTMLInputElement;
      // L'attribut accept="image/*" protege cote navigateur
      expect(fileInput.getAttribute('accept')).toBe('image/*');
    });

    test('rejette un fichier trop gros', async () => {
      render(<AjouterEvenement />);
      await waitForDataLoad();

      const fileInput = document.getElementById('affiche-upload') as HTMLInputElement;
      const hugeFile = createMockFile('huge.jpg', 20_000, 'image/jpeg');
      await user.upload(fileInput, hugeFile);

      // La validation client rejette les fichiers > 5 Mo avec un toast destructive
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ variant: 'destructive' })
        );
      });
      // Pas de preview affiche
      expect(screen.queryByAltText(/aper[cç]u/i)).not.toBeInTheDocument();
    });

    test('en mode edition, l image existante est affichee sans re-upload obligatoire', async () => {
      mockParams = { id: '7' };
      mockGetById.mockResolvedValue({
        success: true,
        data: {
          id_evenement: 7,
          nom_evenement: { fr: 'Existant', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' },
          description: { fr: 'Desc', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' },
          id_type_evenement: 1,
          date_debut: '2026-07-01',
          image_url: 'https://cdn.example.com/event7.jpg',
          tarif: 0,
          id_lieu: 1,
          id_organisation: 10,
        },
      });

      render(<AjouterEvenement />);

      await waitFor(() => expect(mockGetById).toHaveBeenCalledWith(7));

      await waitFor(() => {
        const preview = screen.getByAltText(/aper[cç]u/i);
        expect(preview).toBeInTheDocument();
        expect(preview).toHaveAttribute('src', 'https://cdn.example.com/event7.jpg');
      });
    });
  });

  // =========================================================================
  // BROUILLON
  // =========================================================================

  describe('Brouillon', () => {
    test('le brouillon exige au minimum un nom et un type', async () => {
      render(<AjouterEvenement />);
      await waitForDataLoad();

      // Bouton brouillon (texte = i18n key "events.create.saveAsDraft")
      const draftBtn = screen.getByRole('button', { name: /saveAsDraft/i });
      await user.click(draftBtn);

      // Toast d'erreur pour le nom manquant
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive' })
      );
      expect(mockCreate).not.toHaveBeenCalled();

      vi.clearAllMocks();
      mockCreate.mockResolvedValue({ success: true, data: { id_evenement: 42 } });

      // Remplir le nom sans le type
      await user.type(screen.getByTestId('input-nom-fr'), 'Mon brouillon');
      await user.click(draftBtn);

      // Toast d'erreur pour le type manquant
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive' })
      );
      expect(mockCreate).not.toHaveBeenCalled();
    });

    test('le brouillon ne bloque pas sur les champs optionnels', async () => {
      render(<AjouterEvenement />);
      await waitForDataLoad();

      // Nom + Type seulement (sans date, lieu, image)
      await user.type(screen.getByTestId('input-nom-fr'), 'Brouillon rapide');
      await selectEventType(user);

      const draftBtn = screen.getByRole('button', { name: /saveAsDraft/i });
      await user.click(draftBtn);

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalled();
        const fd = mockCreate.mock.calls[0][0] as FormData;
        expect(fd.get('statut')).toBe('brouillon');
      });
    });
  });

  // =========================================================================
  // SOUMISSION
  // =========================================================================

  describe('Soumission', () => {
    test('envoie un FormData avec image et donnees', async () => {
      render(<AjouterEvenement />);
      await waitForDataLoad();

      await fillMinimalForm(user);
      submitForm();

      await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));

      const fd = mockCreate.mock.calls[0][0] as FormData;
      expect(fd).toBeInstanceOf(FormData);

      const nom = JSON.parse(fd.get('nom_evenement') as string);
      expect(nom.fr).toBe('Festival Culturel');
      expect(fd.get('id_type_evenement')).toBeTruthy();
      expect(fd.get('date_debut')).toBe('2026-06-15');
      expect(fd.get('statut')).toBe('publie');

      const affiche = fd.get('affiche');
      expect(affiche).toBeInstanceOf(File);
      expect((affiche as File).name).toBe('affiche.jpg');
    });

    test('bouton disabled pendant loading', async () => {
      mockCreate.mockImplementation(
        () => new Promise(resolve =>
          setTimeout(() => resolve({ success: true, data: { id_evenement: 99 } }), 500)
        )
      );

      render(<AjouterEvenement />);
      await waitForDataLoad();

      await fillMinimalForm(user);
      submitForm();

      await waitFor(() => {
        const publishBtn = screen.getAllByRole('button').find(b =>
          b.textContent?.match(/publishEvent|publishing|Publication/i)
        );
        expect(publishBtn).toBeDisabled();
      });
    });

    test('redirige vers l evenement apres creation', async () => {
      render(<AjouterEvenement />);
      await waitForDataLoad();

      await fillMinimalForm(user);
      submitForm();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard-pro');
      });
    });

    test('invalide le cache React Query apres succes', async () => {
      render(<AjouterEvenement />);
      await waitForDataLoad();

      await fillMinimalForm(user);
      submitForm();

      await waitFor(() => {
        expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['evenements'] });
        expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['dashboard-pro-evenements'] });
        expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['evenement-stats'] });
      });
    });
  });

  // =========================================================================
  // MULTILINGUE
  // =========================================================================

  describe('Multilingue', () => {
    test('les onglets de langue sont affiches', async () => {
      render(<AjouterEvenement />);
      await waitForDataLoad();

      const nomContainer = screen.getByTestId('multilang-nom');
      const tabs = within(nomContainer).getAllByRole('tab');

      expect(tabs).toHaveLength(5);
      expect(tabs.map(t => t.getAttribute('data-lang'))).toEqual([
        'fr', 'ar', 'en', 'tz-ltn', 'tz-tfng',
      ]);
    });

    test('seules les langues requises bloquent la validation', async () => {
      render(<AjouterEvenement />);
      await waitForDataLoad();

      const nomContainer = screen.getByTestId('multilang-nom');

      // seul fr est requise (requiredLanguages={['fr']})
      expect(within(nomContainer).getByTestId('required-fr')).toBeInTheDocument();

      // en, tz-ltn, tz-tfng ne sont PAS requises
      expect(within(nomContainer).queryByTestId('required-en')).not.toBeInTheDocument();
      expect(within(nomContainer).queryByTestId('required-tz-ltn')).not.toBeInTheDocument();
      expect(within(nomContainer).queryByTestId('required-tz-tfng')).not.toBeInTheDocument();

      // FR seul suffit (validation: !fr.trim() && !ar.trim())
      await user.type(screen.getByTestId('input-nom-fr'), 'Nom en francais seulement');
      await selectEventType(user);
      await user.type(document.getElementById('date-debut')!, '2026-06-15');
      await user.click(screen.getByTestId('lieu-selector'));
      await user.upload(
        document.getElementById('affiche-upload') as HTMLInputElement,
        createMockFile('img.jpg', 100, 'image/jpeg')
      );

      submitForm();

      await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    });
  });
});
