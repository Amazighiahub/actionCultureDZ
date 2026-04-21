/**
 * AjouterArtisanat.test.tsx — Tests automatises du formulaire de creation d'artisanat
 *
 * Couverture :
 *   - Rendu (champs requis, selects dynamiques)
 *   - Validation (nom, materiau, technique)
 *   - Upload image (preview, suppression, accept)
 *   - Tags (ajout, suppression, doublons)
 *   - Soumission (donnees, loading, redirect)
 *   - Edition (chargement des donnees existantes)
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
  mockGetMateriaux,
  mockGetTechniques,
  mockCreate,
  mockUpdate,
  mockGetById,
  mockUploadMedias,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockToast: vi.fn(),
  mockGetMateriaux: vi.fn(),
  mockGetTechniques: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockGetById: vi.fn(),
  mockUploadMedias: vi.fn(),
}));

let mockParams: Record<string, string> = {};

// ---------------------------------------------------------------------------
// Donnees de reference
// ---------------------------------------------------------------------------

const MOCK_MATERIAUX = [
  { id_materiau: 1, nom: 'Laine' },
  { id_materiau: 2, nom: 'Bois' },
];
const MOCK_TECHNIQUES = [
  { id_technique: 1, nom: 'Tissage' },
  { id_technique: 2, nom: 'Sculpture' },
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

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
  toast: mockToast,
}));

vi.mock('@/services/metadata.service', () => ({
  metadataService: {
    getMateriaux: (...args: any[]) => mockGetMateriaux(...args),
    getTechniques: (...args: any[]) => mockGetTechniques(...args),
  },
}));

vi.mock('@/services/artisanat.service', () => ({
  artisanatService: {
    create: (...args: any[]) => mockCreate(...args),
    update: (...args: any[]) => mockUpdate(...args),
    getById: (...args: any[]) => mockGetById(...args),
    uploadMedias: (...args: any[]) => mockUploadMedias(...args),
  },
}));

// -- Radix Select -> native HTML select pour jsdom --
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

// ---------------------------------------------------------------------------
// Import APRES les mocks
// ---------------------------------------------------------------------------
import AjouterArtisanat from '@/pages/AjouterArtisanat';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Attend que les metadonnees soient chargees (materiaux, techniques) */
async function waitForDataLoad() {
  await waitFor(() => {
    expect(mockGetMateriaux).toHaveBeenCalled();
    expect(mockGetTechniques).toHaveBeenCalled();
  });
  // Attendre que le loading metadata soit termine (le formulaire est affiche)
  await waitFor(() => {
    expect(screen.getByTestId('multilang-nom')).toBeInTheDocument();
  });
}

/** Submit le formulaire via fireEvent (contourne les limites jsdom/requestSubmit) */
function submitForm() {
  const form = document.querySelector('form')!;
  fireEvent.submit(form);
}

/** Selectionne un materiau dans le mock select */
async function selectMateriau(user: ReturnType<typeof userEvent.setup>) {
  const options = screen.getAllByRole('option');
  const laineOpt = options.find(o => o.textContent?.includes('Laine'));
  if (laineOpt) await user.click(laineOpt);
}

/** Selectionne une technique dans le mock select */
async function selectTechnique(user: ReturnType<typeof userEvent.setup>) {
  const options = screen.getAllByRole('option');
  const tissageOpt = options.find(o => o.textContent?.includes('Tissage'));
  if (tissageOpt) await user.click(tissageOpt);
}

/** Remplir le formulaire avec les champs minimaux pour soumission complete */
async function fillMinimalForm(user: ReturnType<typeof userEvent.setup>) {
  // Nom FR
  const nomInput = screen.getByTestId('input-nom-fr');
  await user.clear(nomInput);
  await user.type(nomInput, 'Tapis berbere');

  // Materiau
  await selectMateriau(user);

  // Technique
  await selectTechnique(user);
}

// ---------------------------------------------------------------------------
// TESTS
// ---------------------------------------------------------------------------

describe('AjouterArtisanat', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockParams = {};
    user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    mockGetMateriaux.mockResolvedValue({ success: true, data: MOCK_MATERIAUX });
    mockGetTechniques.mockResolvedValue({ success: true, data: MOCK_TECHNIQUES });
    mockCreate.mockResolvedValue({ success: true, data: { id: 42 } });
    mockUpdate.mockResolvedValue({ success: true, data: { id: 1 } });
    mockUploadMedias.mockResolvedValue({ success: true, data: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // =========================================================================
  // RENDU
  // =========================================================================

  describe('Rendu', () => {
    test('affiche tous les champs requis', async () => {
      render(<AjouterArtisanat />);
      await waitForDataLoad();

      // Nom (multilang)
      expect(screen.getByTestId('multilang-nom')).toBeInTheDocument();
      // Description (multilang)
      expect(screen.getByTestId('multilang-description')).toBeInTheDocument();
      // Materiaux et techniques (options rendues)
      expect(screen.getAllByRole('option').length).toBeGreaterThanOrEqual(4);
      // Media upload
      expect(document.getElementById('media-upload')).toBeInTheDocument();
      // Submit button
      expect(screen.getByRole('button', { name: /Cr[eé]er/i })).toBeInTheDocument();
    });

    test('les materiaux se chargent dans le select', async () => {
      render(<AjouterArtisanat />);
      await waitForDataLoad();

      const options = screen.getAllByRole('option');
      const texts = options.map(o => o.textContent);
      expect(texts).toContain('Laine');
      expect(texts).toContain('Bois');
    });

    test('les techniques se chargent dans le select', async () => {
      render(<AjouterArtisanat />);
      await waitForDataLoad();

      const options = screen.getAllByRole('option');
      const texts = options.map(o => o.textContent);
      expect(texts).toContain('Tissage');
      expect(texts).toContain('Sculpture');
    });
  });

  // =========================================================================
  // VALIDATION
  // =========================================================================

  describe('Validation', () => {
    test('bloque si nom vide dans toutes les langues', async () => {
      render(<AjouterArtisanat />);
      await waitForDataLoad();

      // Select materiau and technique but leave nom empty
      await selectMateriau(user);
      await selectTechnique(user);

      submitForm();

      await waitFor(() => {
        // Error should be displayed in the alert
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      expect(mockCreate).not.toHaveBeenCalled();
    });

    test('bloque si aucun materiau selectionne', async () => {
      render(<AjouterArtisanat />);
      await waitForDataLoad();

      // Fill nom but skip materiau
      await user.type(screen.getByTestId('input-nom-fr'), 'Mon artisanat');
      await selectTechnique(user);

      submitForm();

      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        expect(alerts.length).toBeGreaterThan(0);
      });
      expect(mockCreate).not.toHaveBeenCalled();
    });

    test('bloque si aucune technique selectionnee', async () => {
      render(<AjouterArtisanat />);
      await waitForDataLoad();

      // Fill nom and materiau but skip technique
      await user.type(screen.getByTestId('input-nom-fr'), 'Mon artisanat');
      await selectMateriau(user);

      submitForm();

      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        expect(alerts.length).toBeGreaterThan(0);
      });
      expect(mockCreate).not.toHaveBeenCalled();
    });

    test('affiche le message d erreur en cas de validation echouee', async () => {
      render(<AjouterArtisanat />);
      await waitForDataLoad();

      // Submit with nothing filled
      submitForm();

      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        expect(alerts.length).toBeGreaterThan(0);
        // At least one alert should have text content
        expect(alerts.some(a => a.textContent?.trim())).toBe(true);
      });
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // UPLOAD
  // =========================================================================

  describe('Upload', () => {
    test('le preview s affiche apres selection d une image', async () => {
      render(<AjouterArtisanat />);
      await waitForDataLoad();

      const fileInput = document.getElementById('media-upload') as HTMLInputElement;
      const file = new File(['pixel'], 'photo.jpg', { type: 'image/jpeg' });

      // The component uses FileReader.readAsDataURL, so we need to trigger it
      await user.upload(fileInput, file);

      await waitFor(() => {
        const preview = screen.getByAltText(/Preview 1/i);
        expect(preview).toBeInTheDocument();
      });
    });

    test('supprimer une image retire le preview', async () => {
      render(<AjouterArtisanat />);
      await waitForDataLoad();

      const fileInput = document.getElementById('media-upload') as HTMLInputElement;
      const file = new File(['pixel'], 'photo.jpg', { type: 'image/jpeg' });
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByAltText(/Preview 1/i)).toBeInTheDocument();
      });

      // Click the X button to remove
      const removeButtons = screen.getAllByRole('button').filter(b => {
        // The remove button is inside the preview grid, it has an X icon
        return b.closest('.relative') && b.querySelector('svg');
      });
      // There should be at least one remove button
      expect(removeButtons.length).toBeGreaterThan(0);
      await user.click(removeButtons[0]);

      await waitFor(() => {
        expect(screen.queryByAltText(/Preview 1/i)).not.toBeInTheDocument();
      });
    });

    test('accept accepte image, vidéo et pdf', async () => {
      render(<AjouterArtisanat />);
      await waitForDataLoad();

      const fileInput = document.getElementById('media-upload') as HTMLInputElement;
      // Le formulaire accepte désormais images + vidéos + PDF (voir AjouterArtisanat.tsx).
      expect(fileInput.getAttribute('accept')).toBe('image/*,video/*,.pdf');
    });
  });

  // =========================================================================
  // TAGS
  // =========================================================================

  describe('Tags', () => {
    test('ajouter un tag l affiche dans la liste', async () => {
      render(<AjouterArtisanat />);
      await waitForDataLoad();

      // Find the tag input by placeholder
      const tagInput = screen.getByPlaceholderText(/tag/i);
      await user.type(tagInput, 'artisanal');

      // Click the add button (Plus icon button next to input)
      const addButtons = screen.getAllByRole('button').filter(b =>
        b.closest('.flex.gap-2') && b.querySelector('svg')
      );
      // The Plus button is the one beside the tag input
      const addBtn = addButtons[0];
      await user.click(addBtn);

      await waitFor(() => {
        expect(screen.getByText('artisanal')).toBeInTheDocument();
      });
    });

    test('supprimer un tag le retire de la liste', async () => {
      render(<AjouterArtisanat />);
      await waitForDataLoad();

      // Add a tag
      const tagInput = screen.getByPlaceholderText(/tag/i);
      await user.type(tagInput, 'berbere');

      const addButtons = screen.getAllByRole('button').filter(b =>
        b.closest('.flex.gap-2') && b.querySelector('svg')
      );
      await user.click(addButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('berbere')).toBeInTheDocument();
      });

      // Remove the tag by clicking the X button inside the badge
      const badge = screen.getByText('berbere').closest('[class*="badge"], [class*="Badge"]') || screen.getByText('berbere').parentElement;
      const removeBtn = badge!.querySelector('button')!;
      await user.click(removeBtn);

      await waitFor(() => {
        expect(screen.queryByText('berbere')).not.toBeInTheDocument();
      });
    });

    test('empeche les tags en double', async () => {
      render(<AjouterArtisanat />);
      await waitForDataLoad();

      const tagInput = screen.getByPlaceholderText(/tag/i);

      // Add tag the first time
      await user.type(tagInput, 'unique');
      const addButtons = screen.getAllByRole('button').filter(b =>
        b.closest('.flex.gap-2') && b.querySelector('svg')
      );
      await user.click(addButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('unique')).toBeInTheDocument();
      });

      // Try to add the same tag again
      await user.type(tagInput, 'unique');
      await user.click(addButtons[0]);

      // Should still only have one instance
      const occurrences = screen.getAllByText('unique');
      expect(occurrences).toHaveLength(1);
    });
  });

  // =========================================================================
  // VALIDATION PRIX ET CHAMPS BACKEND
  // =========================================================================

  describe('Validation prix et champs backend', () => {
    test('prix min > prix max affiche une erreur', async () => {
      render(<AjouterArtisanat />);
      await waitForDataLoad();

      await fillMinimalForm(user);

      // Set prix_min > prix_max using userEvent for proper React state updates
      const allPriceInputs = screen.getAllByPlaceholderText('0.00');
      const prixMin = allPriceInputs[0];
      const prixMax = allPriceInputs[1];

      await user.clear(prixMin);
      await user.type(prixMin, '5000');
      await user.clear(prixMax);
      await user.type(prixMax, '1000');

      submitForm();

      await waitFor(() => {
        // Error appears in both top-level alert and field-level error
        const errors = screen.getAllByText(/prix minimum ne peut pas être supérieur au prix maximum/i);
        expect(errors.length).toBeGreaterThanOrEqual(1);
      });
      expect(mockCreate).not.toHaveBeenCalled();
    });

    test('prix négatif est empêché par l attribut HTML min=0', async () => {
      render(<AjouterArtisanat />);
      await waitForDataLoad();

      // The price inputs have HTML5 min={0} attribute
      const allPriceInputs = screen.getAllByPlaceholderText('0.00');
      const prixMin = allPriceInputs[0] as HTMLInputElement;
      const prixMax = allPriceInputs[1] as HTMLInputElement;

      expect(prixMin).toHaveAttribute('min', '0');
      expect(prixMax).toHaveAttribute('min', '0');
    });

    test('la soumission envoie tous les champs backend attendus', async () => {
      render(<AjouterArtisanat />);
      await waitForDataLoad();

      await fillMinimalForm(user);

      // Fill optional fields
      const allPriceInputs = screen.getAllByPlaceholderText('0.00');
      await user.clear(allPriceInputs[0]);
      await user.type(allPriceInputs[0], '2000');
      await user.clear(allPriceInputs[1]);
      await user.type(allPriceInputs[1], '8000');

      submitForm();

      await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));

      const data = mockCreate.mock.calls[0][0];
      // Verify all expected backend fields are present
      expect(data).toHaveProperty('nom');
      expect(data).toHaveProperty('description');
      expect(data).toHaveProperty('id_materiau');
      expect(data).toHaveProperty('id_technique');
      expect(data).toHaveProperty('prix_min');
      expect(data).toHaveProperty('prix_max');
      expect(data).toHaveProperty('delai_fabrication');
      expect(data).toHaveProperty('sur_commande');
      expect(data).toHaveProperty('en_stock');
      expect(data).toHaveProperty('tags');

      // Verify types/values
      expect(data.id_materiau).toBe(1);
      expect(data.id_technique).toBe(1);
      expect(data.prix_min).toBe(2000);
      expect(data.prix_max).toBe(8000);
    });
  });

  // =========================================================================
  // SOUMISSION
  // =========================================================================

  describe('Soumission', () => {
    test('envoie les donnees correctes au service', async () => {
      render(<AjouterArtisanat />);
      await waitForDataLoad();

      await fillMinimalForm(user);
      submitForm();

      await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));

      const data = mockCreate.mock.calls[0][0];
      const nom = JSON.parse(data.nom);
      expect(nom.fr).toBe('Tapis berbere');
      expect(data.id_materiau).toBe(1);
      expect(data.id_technique).toBe(1);
    });

    test('bouton disabled pendant le loading', async () => {
      mockCreate.mockImplementation(
        () => new Promise(resolve =>
          setTimeout(() => resolve({ success: true, data: { id: 99 } }), 5000)
        )
      );

      render(<AjouterArtisanat />);
      await waitForDataLoad();

      await fillMinimalForm(user);
      submitForm();

      await waitFor(() => {
        const submitBtn = screen.getByRole('button', { name: /en cours/i });
        expect(submitBtn).toBeDisabled();
      });
    });

    test('redirige apres creation reussie', async () => {
      render(<AjouterArtisanat />);
      await waitForDataLoad();

      await fillMinimalForm(user);
      submitForm();

      await waitFor(() => expect(mockCreate).toHaveBeenCalled());

      // The component uses setTimeout(2000) before navigating
      vi.advanceTimersByTime(2500);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard-pro');
      });
    });
  });

  // =========================================================================
  // EDITION
  // =========================================================================

  describe('Edition', () => {
    test('en mode edition charge les donnees existantes', async () => {
      mockParams = { id: '5' };
      mockGetById.mockResolvedValue({
        success: true,
        data: {
          id: 5,
          nom: { fr: 'Tapis ancien', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' },
          description: { fr: 'Un beau tapis', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' },
          id_materiau: 1,
          id_technique: 2,
          prix_min: 5000,
          prix_max: 15000,
          delai_fabrication: 30,
          sur_commande: true,
          en_stock: 3,
          tags: ['traditionnel', 'berbere'],
        },
      });

      render(<AjouterArtisanat />);
      await waitForDataLoad();

      await waitFor(() => expect(mockGetById).toHaveBeenCalledWith(5));

      // Check that the form is populated
      await waitFor(() => {
        const nomInput = screen.getByTestId('input-nom-fr');
        expect(nomInput).toHaveValue('Tapis ancien');
      });

      // Tags should be loaded
      await waitFor(() => {
        expect(screen.getByText('traditionnel')).toBeInTheDocument();
        expect(screen.getByText('berbere')).toBeInTheDocument();
      });
    });
  });
});
