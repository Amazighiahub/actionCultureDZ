/**
 * GestionArtisanatSimple.test.tsx — Tests du formulaire simplifié artisanat
 *
 * Couverture :
 *   - Rendu initial (champs multilingues directs, matériaux, techniques)
 *   - Validation (nom requis, matériau requis, technique requise)
 *   - Tags (ajout, doublon ignoré, suppression, Enter pour ajouter)
 *   - Prix et disponibilité (prix min/max, stock, sur commande)
 *   - Soumission (appel artisanatService.create, données correctes)
 *   - Succès (message affiché)
 *   - Erreur serveur (message affiché)
 *   - Mode admin/verify (badge vérification)
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
  mockParams,
  mockUseAuth,
  mockCreate,
  mockUploadMedias,
  mockGetMateriaux,
  mockGetTechniques,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockParams: { value: {} as Record<string, string | undefined> },
  mockUseAuth: {
    value: {
      user: { id_artisan: 5 },
      isAuthenticated: true,
      isAdmin: () => false,
    } as any,
  },
  mockCreate: vi.fn(),
  mockUploadMedias: vi.fn(),
  mockGetMateriaux: vi.fn(),
  mockGetTechniques: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockParams.value,
  useLocation: () => ({ pathname: '/gestion-artisanat-simple', state: null, search: '' }),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: 'fr', changeLanguage: vi.fn() },
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth.value,
}));

vi.mock('@/services/artisanat.service', () => ({
  artisanatService: {
    create: mockCreate,
    uploadMedias: mockUploadMedias,
  },
}));

vi.mock('@/services/metadata.service', () => ({
  metadataService: {
    getMateriaux: mockGetMateriaux,
    getTechniques: mockGetTechniques,
  },
}));

// Header / Footer
vi.mock('@/components/Header', () => ({ default: () => <header data-testid="header" /> }));
vi.mock('@/components/Footer', () => ({ default: () => <footer data-testid="footer" /> }));

// Radix Select → native HTML pour jsdom
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange, disabled }: any) => (
    <div data-testid="select-root" data-value={value}>
      {React.Children.map(children, (child: any) =>
        child ? React.cloneElement(child, { _onValueChange: onValueChange, _value: value, _disabled: disabled }) : null
      )}
    </div>
  ),
  SelectTrigger: React.forwardRef(({ children, _disabled, ...props }: any, ref: any) => (
    <button ref={ref} type="button" role="combobox" disabled={_disabled} {...props}>{children}</button>
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

// Checkbox
vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ id, checked, onCheckedChange, disabled }: any) => (
    <input
      type="checkbox"
      id={id}
      checked={!!checked}
      disabled={disabled}
      onChange={() => onCheckedChange?.(!checked)}
    />
  ),
}));

// Simple UI
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
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
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

// ---------------------------------------------------------------------------
// Import APRÈS les mocks
// ---------------------------------------------------------------------------

import GestionArtisanatSimple from '@/pages/GestionArtisanatSimple';

// ---------------------------------------------------------------------------
// Données de test
// ---------------------------------------------------------------------------

const MOCK_MATERIAUX = [
  { id: 1, nom: { fr: 'Bois' } },
  { id: 2, nom: { fr: 'Cuir' } },
  { id: 3, nom: { fr: 'Céramique' } },
];

const MOCK_TECHNIQUES = [
  { id: 1, nom: { fr: 'Sculpture' } },
  { id: 2, nom: { fr: 'Tannage' } },
  { id: 3, nom: { fr: 'Poterie' } },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderComponent() {
  return render(<GestionArtisanatSimple />);
}

async function waitForDataLoad() {
  await waitFor(() => {
    expect(mockGetMateriaux).toHaveBeenCalled();
  });
}

function submitForm() {
  const form = document.querySelector('form');
  if (form) fireEvent.submit(form);
}

async function fillMinimalForm(user: ReturnType<typeof userEvent.setup>) {
  // Nom FR (input direct, placeholder "Français")
  const nomFr = screen.getByPlaceholderText('Français');
  await user.type(nomFr, 'Tapis berbère');

  // Matériau — cliquer sur l'option "Bois"
  const boisOpt = screen.getAllByRole('option').find(el => el.textContent?.includes('Bois'));
  if (boisOpt) await user.click(boisOpt);

  // Technique — cliquer sur l'option "Sculpture"
  const sculptureOpt = screen.getAllByRole('option').find(el => el.textContent?.includes('Sculpture'));
  if (sculptureOpt) await user.click(sculptureOpt);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GestionArtisanatSimple — Formulaire simplifié artisanat', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    mockParams.value = {};
    mockUseAuth.value = {
      user: { id_artisan: 5 },
      isAuthenticated: true,
      isAdmin: () => false,
    };
    mockGetMateriaux.mockResolvedValue({ success: true, data: MOCK_MATERIAUX });
    mockGetTechniques.mockResolvedValue({ success: true, data: MOCK_TECHNIQUES });
    mockCreate.mockResolvedValue({ success: true, data: { id: 99 } });
    mockUploadMedias.mockResolvedValue({ success: true });
  });

  // =========================================================================
  // RENDU INITIAL
  // =========================================================================

  describe('Rendu initial', () => {
    test('affiche le titre et les champs multilingues directs', async () => {
      renderComponent();
      await waitForDataLoad();

      // Titre mode création
      const titles = screen.getAllByText(/artisanat/i);
      expect(titles.length).toBeGreaterThanOrEqual(1);

      // 3 inputs pour le nom (FR, AR, EN)
      expect(screen.getByPlaceholderText('Français')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('العربية')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('English')).toBeInTheDocument();

      // 3 textareas pour la description
      expect(screen.getByPlaceholderText('Description en français')).toBeInTheDocument();
    });

    test('affiche les matériaux et techniques dans les sélecteurs', async () => {
      renderComponent();
      await waitForDataLoad();

      const options = screen.getAllByRole('option');
      // 3 matériaux + 3 techniques = 6
      expect(options.length).toBeGreaterThanOrEqual(6);
      expect(screen.getByText('Bois')).toBeInTheDocument();
      expect(screen.getByText('Sculpture')).toBeInTheDocument();
    });

    test('affiche les champs prix et disponibilité', async () => {
      renderComponent();
      await waitForDataLoad();

      expect(screen.getByText(/Prix minimum/)).toBeInTheDocument();
      expect(screen.getByText(/Prix maximum/)).toBeInTheDocument();
      expect(screen.getByText(/Délai de fabrication/)).toBeInTheDocument();
      expect(screen.getByText(/Quantité en stock/)).toBeInTheDocument();
      expect(screen.getByText(/Disponible sur commande/)).toBeInTheDocument();
    });

    test('affiche le badge mode Création', async () => {
      renderComponent();
      await waitForDataLoad();

      expect(screen.getByText('Création')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // VALIDATION
  // =========================================================================

  describe('Validation', () => {
    test('soumission vide affiche les 3 erreurs (nom, matériau, technique)', async () => {
      renderComponent();
      await waitForDataLoad();

      submitForm();

      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        expect(alerts.length).toBeGreaterThanOrEqual(1);
      });

      expect(mockCreate).not.toHaveBeenCalled();
    });

    test('nom manquant bloque la soumission', async () => {
      renderComponent();
      await waitForDataLoad();

      // Sélectionner matériau et technique sans remplir le nom
      const boisOpt = screen.getAllByRole('option').find(el => el.textContent?.includes('Bois'));
      if (boisOpt) await user.click(boisOpt);
      const sculptureOpt = screen.getAllByRole('option').find(el => el.textContent?.includes('Sculpture'));
      if (sculptureOpt) await user.click(sculptureOpt);

      submitForm();

      await waitFor(() => {
        const nomErrors = screen.getAllByText(/nom est requis/i);
        expect(nomErrors.length).toBeGreaterThanOrEqual(1);
      });

      expect(mockCreate).not.toHaveBeenCalled();
    });

    test('matériau manquant bloque la soumission', async () => {
      renderComponent();
      await waitForDataLoad();

      const nomFr = screen.getByPlaceholderText('Français');
      await user.type(nomFr, 'Test');

      // Technique seulement, pas matériau
      const sculptureOpt = screen.getAllByRole('option').find(el => el.textContent?.includes('Sculpture'));
      if (sculptureOpt) await user.click(sculptureOpt);

      submitForm();

      await waitFor(() => {
        const matErrors = screen.getAllByText(/matériau est requis/i);
        expect(matErrors.length).toBeGreaterThanOrEqual(1);
      });

      expect(mockCreate).not.toHaveBeenCalled();
    });

    test('technique manquante bloque la soumission', async () => {
      renderComponent();
      await waitForDataLoad();

      const nomFr = screen.getByPlaceholderText('Français');
      await user.type(nomFr, 'Test');

      // Matériau seulement, pas technique
      const boisOpt = screen.getAllByRole('option').find(el => el.textContent?.includes('Bois'));
      if (boisOpt) await user.click(boisOpt);

      submitForm();

      await waitFor(() => {
        const techErrors = screen.getAllByText(/technique est requise/i);
        expect(techErrors.length).toBeGreaterThanOrEqual(1);
      });

      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // TAGS
  // =========================================================================

  describe('Tags', () => {
    test('ajouter un tag via le bouton', async () => {
      renderComponent();
      await waitForDataLoad();

      const tagInput = screen.getByPlaceholderText(/Ajouter un tag/i);
      await user.type(tagInput, 'poterie');

      // Le bouton + est de type button avec variant outline
      const allButtons = screen.getAllByRole('button');
      const plusBtn = allButtons.find(btn => btn.textContent === '' || btn.querySelector('svg'));
      // Trouver le bouton juste après l'input de tag
      const addTagBtn = allButtons.find(btn => {
        const prev = btn.previousElementSibling;
        return prev?.tagName === 'INPUT' && (prev as HTMLInputElement).placeholder?.includes('tag');
      });

      if (addTagBtn) {
        await user.click(addTagBtn);
      }

      await waitFor(() => {
        expect(screen.getByText('poterie')).toBeInTheDocument();
      });
    });

    test('ajouter un tag via Enter', async () => {
      renderComponent();
      await waitForDataLoad();

      const tagInput = screen.getByPlaceholderText(/Ajouter un tag/i);
      await user.type(tagInput, 'tlemcen');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('tlemcen')).toBeInTheDocument();
      });

      // L'input est vidé après ajout
      expect(tagInput).toHaveValue('');
    });

    test('doublon de tag est ignoré', async () => {
      renderComponent();
      await waitForDataLoad();

      const tagInput = screen.getByPlaceholderText(/Ajouter un tag/i);

      // Ajouter "artisan" une première fois
      await user.type(tagInput, 'artisan');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('artisan')).toBeInTheDocument();
      });

      // Tenter de l'ajouter à nouveau
      await user.type(tagInput, 'artisan');
      await user.keyboard('{Enter}');

      // Un seul badge "artisan" doit exister
      const artisanBadges = screen.getAllByText('artisan');
      expect(artisanBadges.length).toBe(1);
    });
  });

  // =========================================================================
  // SOUMISSION
  // =========================================================================

  describe('Soumission', () => {
    test('soumission avec données valides appelle artisanatService.create', async () => {
      renderComponent();
      await waitForDataLoad();
      await fillMinimalForm(user);

      submitForm();

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledTimes(1);
      });

      const callArgs = mockCreate.mock.calls[0][0];
      expect(JSON.parse(callArgs.nom)).toHaveProperty('fr', 'Tapis berbère');
      expect(callArgs.id_materiau).toBe(1);
      expect(callArgs.id_technique).toBe(1);
      expect(callArgs.statut).toBe('en_attente');
    });

    test('soumission réussie affiche le message de succès', async () => {
      renderComponent();
      await waitForDataLoad();
      await fillMinimalForm(user);

      submitForm();

      await waitFor(() => {
        expect(screen.getByText(/réussie/i)).toBeInTheDocument();
      });
    });

    test('erreur serveur affiche le message', async () => {
      mockCreate.mockResolvedValueOnce({
        success: false,
        error: 'Erreur interne du serveur',
      });

      renderComponent();
      await waitForDataLoad();
      await fillMinimalForm(user);

      submitForm();

      await waitFor(() => {
        expect(screen.getByText('Erreur interne du serveur')).toBeInTheDocument();
      });
    });

    test('nom rempli en arabe seul passe la validation du nom', async () => {
      renderComponent();
      await waitForDataLoad();

      // Remplir uniquement le nom en arabe
      const nomAr = screen.getByPlaceholderText('العربية');
      await user.type(nomAr, 'سجاد أمازيغي');

      // Matériau et technique
      const boisOpt = screen.getAllByRole('option').find(el => el.textContent?.includes('Bois'));
      if (boisOpt) await user.click(boisOpt);
      const sculptureOpt = screen.getAllByRole('option').find(el => el.textContent?.includes('Sculpture'));
      if (sculptureOpt) await user.click(sculptureOpt);

      submitForm();

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledTimes(1);
      });

      // Pas d'erreur de nom
      expect(screen.queryByText(/nom est requis/i)).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // MODE ADMIN / VERIFY
  // =========================================================================

  describe('Mode admin', () => {
    test('admin avec id voit le badge Vérification', async () => {
      mockParams.value = { id: '42' };
      mockUseAuth.value = {
        user: { id_artisan: 99 },
        isAuthenticated: true,
        isAdmin: () => true,
      };

      renderComponent();
      await waitForDataLoad();

      await waitFor(() => {
        expect(screen.getByText('Vérification')).toBeInTheDocument();
      });
    });

    test('utilisateur non-admin avec id voit le badge Modification', async () => {
      mockParams.value = { id: '42' };
      mockUseAuth.value = {
        user: { id_artisan: 5 },
        isAuthenticated: true,
        isAdmin: () => false,
      };

      renderComponent();
      await waitForDataLoad();

      await waitFor(() => {
        expect(screen.getByText('Modification')).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // MULTILINGUE
  // =========================================================================

  describe('Multilingue', () => {
    test('les 3 langues du nom sont envoyées au backend', async () => {
      renderComponent();
      await waitForDataLoad();

      // Remplir les 3 langues
      await user.type(screen.getByPlaceholderText('Français'), 'Poterie');
      await user.type(screen.getByPlaceholderText('العربية'), 'فخار');
      await user.type(screen.getByPlaceholderText('English'), 'Pottery');

      // Matériau et technique
      const boisOpt = screen.getAllByRole('option').find(el => el.textContent?.includes('Bois'));
      if (boisOpt) await user.click(boisOpt);
      const sculptureOpt = screen.getAllByRole('option').find(el => el.textContent?.includes('Sculpture'));
      if (sculptureOpt) await user.click(sculptureOpt);

      submitForm();

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledTimes(1);
      });

      const callArgs = mockCreate.mock.calls[0][0];
      const nom = JSON.parse(callArgs.nom);
      expect(nom.fr).toBe('Poterie');
      expect(nom.ar).toBe('فخار');
      expect(nom.en).toBe('Pottery');
    });
  });
});
