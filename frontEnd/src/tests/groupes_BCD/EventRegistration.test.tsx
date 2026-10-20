/**
 * EventRegistration.test.tsx — Tests Groupes B & D
 *
 * Couvre :
 *   Groupe B, test 8 — bouton de soumission disabled pendant isSubmitting
 *   Groupe D, test 12 — cliquer le bouton "Annuler mon inscription" ouvre la Dialog
 *   Groupe D, test 13 — cliquer "Retour" dans la Dialog ferme la Dialog sans annuler
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ---------------------------------------------------------------------------
// vi.hoisted
// ---------------------------------------------------------------------------

const { mockToast, mockIsAuthenticated, mockIsProfessional } = vi.hoisted(() => ({
  mockToast: vi.fn(),
  mockIsAuthenticated: { value: true },
  mockIsProfessional: { value: false },
}));

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...rest }: any) => <a href={to} {...rest}>{children}</a>,
  useNavigate: () => vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: 'fr' },
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated.value,
    isProfessional: mockIsProfessional.value,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/hooks/useLocalizedDate', () => ({
  useLocalizedDate: () => ({ formatDate: (d: string) => d }),
}));

vi.mock('@/hooks/useLocalizedNumber', () => ({
  useLocalizedNumber: () => ({ formatPrice: (n: number) => `${n} DZD` }),
}));

vi.mock('@/hooks/useTranslateData', () => ({
  useTranslateData: () => ({
    td: (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v)),
    safe: (v: unknown, fallback = '') => (v != null ? String(v) : fallback),
  }),
}));

vi.mock('@/services/oeuvre.service', () => ({
  oeuvreService: {
    getMyOeuvres: vi.fn().mockResolvedValue({ success: true, data: { oeuvres: [] } }),
  },
}));

vi.mock('@/services/httpClient', () => ({
  httpClient: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('@/lib/Utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

// Shadcn UI — Dialog simplifié pour jsdom
// Architecture : Dialog passe `open` en context aux enfants via data-open sur la racine.
// DialogTrigger rend ses enfants directement pour que les boutons soient accessibles.
// DialogContent se masque via CSS (display:none) si dialog-root[data-open="false"].
// On utilise une approche plus simple : Dialog rend les enfants, DialogContent est
// conditionnel selon la prop open transmise par Dialog via un contexte minimal.
vi.mock('@/components/ui/dialog', () => {
  const DialogContext = React.createContext<{ open: boolean; onOpenChange?: (v: boolean) => void }>({
    open: false,
  });
  return {
    Dialog: ({ children, open, onOpenChange }: any) => (
      <DialogContext.Provider value={{ open: open ?? false, onOpenChange }}>
        <div data-testid="dialog-root" data-open={open}>
          {children}
        </div>
      </DialogContext.Provider>
    ),
    DialogTrigger: ({ children, asChild }: any) => {
      const { onOpenChange } = React.useContext(DialogContext);
      if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement<any>, {
          onClick: (...args: any[]) => {
            (children as any).props.onClick?.(...args);
            onOpenChange?.(true);
          },
        });
      }
      return <>{children}</>;
    },
    DialogContent: ({ children }: any) => {
      const { open } = React.useContext(DialogContext);
      if (!open) return null;
      return <div data-testid="dialog-content" role="dialog">{children}</div>;
    },
    DialogHeader: ({ children }: any) => <div>{children}</div>,
    DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
    DialogDescription: ({ children }: any) => <p>{children}</p>,
    DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
  };
});

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
  CardFooter: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, type, onClick, asChild, variant, ...props }: any) => {
    if (asChild && children) {
      return React.cloneElement(children, { disabled, ...props });
    }
    return (
      <button type={type || 'button'} disabled={disabled} onClick={onClick} data-variant={variant} {...props}>
        {children}
      </button>
    );
  },
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, variant }: any) => (
    <span className={className} data-variant={variant}>{children}</span>
  ),
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: any) => (
    <div role="progressbar" aria-valuenow={value} className={className} />
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ id, value, onChange, type, min, max }: any) => (
    <input id={id} value={value} onChange={onChange} type={type} min={min} max={max} />
  ),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ id, value, onChange, placeholder }: any) => (
    <textarea id={id} value={value} onChange={onChange} placeholder={placeholder} />
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor, ...props }: any) => (
    <label htmlFor={htmlFor} {...props}>{children}</label>
  ),
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange }: any) => (
    <input type="checkbox" checked={checked} onChange={(e) => onCheckedChange?.(e.target.checked)} />
  ),
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

// ---------------------------------------------------------------------------
// Import APRÈS les mocks
// ---------------------------------------------------------------------------

import EventRegistration from '@/pages/event/EventRegistration';
import type { Evenement } from '@/types/models/evenement.types';

// ---------------------------------------------------------------------------
// Fixture événement minimal
// ---------------------------------------------------------------------------

// Événement de test partiel : seuls les champs utiles au composant sont renseignés
const makeEvent = (overrides = {}) => ({
  id_evenement: 1,
  nom_evenement: 'Festival Test',
  date_debut: new Date(Date.now() + 86400000 * 30).toISOString(), // dans 30 jours
  date_fin: null,
  date_limite_inscription: null,
  capacite_max: 100,
  nombre_inscrits: 20,
  tarif: 0,
  gratuit: true,
  statut: 'a_venir',
  inscription_requise: false,
  accepte_soumissions: false,
  config_soumission: null,
  est_complet: false,
  contact_email: null,
  contact_telephone: null,
  ...overrides,
}) as unknown as Evenement;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EventRegistration', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    mockIsAuthenticated.value = true;
    mockIsProfessional.value = false;
  });

  // =========================================================================
  // GROUPE B, test 8 — bouton de soumission disabled pendant isSubmitting
  // =========================================================================

  describe('Groupe B — Bouton de soumission disabled pendant isSubmitting', () => {
    // Couvre : Groupe B, test 8
    // Note : EventRegistration gère l'ouverture de la Dialog en interne via isDialogOpen.
    // Notre mock Dialog affiche le DialogContent seulement quand open=true.
    // Le DialogTrigger contient le bouton — on le trouve via son texte.
    test('le bouton "Confirmer l\'inscription" est disabled pendant la soumission', async () => {
      let resolveRegister!: (val: boolean) => void;
      const pendingRegister = new Promise<boolean>((resolve) => {
        resolveRegister = resolve;
      });
      const mockOnRegister = vi.fn().mockReturnValue(pendingRegister);

      render(
        <EventRegistration
          event={makeEvent()}
          onRegister={mockOnRegister}
          isRegistered={false}
        />
      );

      // DialogTrigger rend ses enfants directement → le bouton S'inscrire est accessible
      const inscriptionBtn = screen.getByRole('button', {
        name: /event\.registration\.register|S'inscrire/i,
      });
      await user.click(inscriptionBtn);

      // Après le clic (DialogTrigger.onClick appelle onOpenChange(true) → isDialogOpen=true)
      // DialogContent s'affiche conditionnellement
      const confirmBtn = await screen.findByRole('button', {
        name: /event\.registration\.confirm|Confirmer/i,
      });
      await user.click(confirmBtn);

      // Pendant que la Promise est en attente → bouton disabled
      await waitFor(() => {
        expect(confirmBtn).toBeDisabled();
      });

      resolveRegister(true);
    });
  });

  // =========================================================================
  // GROUPE D — Comportements interactifs
  // =========================================================================

  describe('Groupe D — Dialog d\'annulation d\'inscription', () => {
    // Couvre : Groupe D, test 12 — cliquer "Annuler mon inscription" ouvre la Dialog
    test('cliquer le bouton "Annuler mon inscription" ouvre la Dialog de confirmation', async () => {
      render(
        <EventRegistration
          event={makeEvent()}
          onRegister={vi.fn()}
          onUnregister={vi.fn()}
          isRegistered={true}
          registrationStatus="confirme"
        />
      );

      // La Dialog de confirmation (showCancelConfirm) ne doit pas être ouverte au départ
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // Trouver le bouton "Annuler mon inscription" (contient UserMinus icon + texte)
      // Il y a potentiellement plusieurs éléments qui contiennent ce texte
      // → on cherche spécifiquement le bouton dans CardFooter (variant destructive)
      const allButtons = screen.getAllByRole('button');
      const cancelBtn = allButtons.find(
        btn => btn.textContent?.match(/event\.registration\.cancel|Annuler mon inscription/i)
      );
      expect(cancelBtn).toBeDefined();
      await user.click(cancelBtn!);

      // La Dialog de confirmation doit être visible
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Le titre de la dialog (DialogTitle) est présent
      // On utilise getByTestId('dialog-title') pour éviter l'ambiguïté avec le bouton
      const dialogTitle = screen.getByTestId('dialog-title');
      expect(dialogTitle).toHaveTextContent(
        /event\.registration\.cancelTitle|Annuler mon inscription/i
      );
    });

    // Couvre : Groupe D, test 13 — cliquer "Retour" dans la Dialog ferme sans annuler
    test('cliquer "Retour" dans la Dialog ferme la Dialog sans appeler onUnregister', async () => {
      const mockOnUnregister = vi.fn();

      render(
        <EventRegistration
          event={makeEvent()}
          onRegister={vi.fn()}
          onUnregister={mockOnUnregister}
          isRegistered={true}
          registrationStatus="confirme"
        />
      );

      // Ouvrir la Dialog
      const cancelBtn = screen.getByRole('button', { name: /event\.registration\.cancel|Annuler mon inscription/i });
      await user.click(cancelBtn);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Cliquer "Retour" (common.back)
      const backBtn = screen.getByRole('button', { name: /common\.back|Retour/i });
      await user.click(backBtn);

      // La Dialog doit être fermée
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // onUnregister NE DOIT PAS avoir été appelé
      expect(mockOnUnregister).not.toHaveBeenCalled();
    });

    // Test complémentaire : cliquer "Confirmer l'annulation" appelle onUnregister
    test('cliquer "Confirmer l\'annulation" appelle onUnregister', async () => {
      const mockOnUnregister = vi.fn().mockResolvedValue(true);

      render(
        <EventRegistration
          event={makeEvent()}
          onRegister={vi.fn()}
          onUnregister={mockOnUnregister}
          isRegistered={true}
          registrationStatus="confirme"
        />
      );

      // Ouvrir la Dialog
      await user.click(
        screen.getByRole('button', { name: /event\.registration\.cancel|Annuler mon inscription/i })
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Confirmer l'annulation
      const confirmCancelBtn = screen.getByRole('button', {
        name: /event\.registration\.confirmCancel|Confirmer l'annulation/i,
      });
      await user.click(confirmCancelBtn);

      await waitFor(() => {
        expect(mockOnUnregister).toHaveBeenCalledTimes(1);
      });
    });
  });

  // =========================================================================
  // Formulaire propre au type d'événement (Chantier-école)
  // =========================================================================

  describe('Formulaire du type d\'événement', () => {
    const configChantier = {
      remplace_formulaire_base: true,
      sections: [{
        titre: 'Vous',
        champs: [
          { cle: 'ville', type: 'texte', requis: true, label: 'Ville ou wilaya' },
          {
            cle: 'presence', type: 'choix', requis: true, label: 'Présence',
            options: [{ valeur: 'Toute la durée', label: 'Toute la durée' }, { valeur: 'Partielle', label: 'Partielle' }]
          },
          { cle: 'jours', type: 'nombre', requis: true, min: 1, max: 12, label: 'Combien de jours ?', condition: { cle: 'presence', valeur: 'Partielle' } },
          { cle: 'frais', type: 'accord', requis: true, label: 'Le chantier est payant' }
        ]
      }]
    };
    const eventChantier = () => makeEvent({ TypeEvenement: { id_type_evenement: 13, nom_type: 'Chantier-école', config_inscription: configChantier } });

    test('remplace le formulaire de base et bloque l\'envoi tant que les réponses obligatoires manquent', async () => {
      const mockOnRegister = vi.fn().mockResolvedValue(true);
      render(<EventRegistration event={eventChantier() as any} onRegister={mockOnRegister} isRegistered={false} />);

      await user.click(screen.getByRole('button', { name: /S'inscrire/i }));

      expect(await screen.findByLabelText(/Ville ou wilaya/)).toBeInTheDocument();
      expect(screen.queryByLabelText(/Nombre de personnes/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Combien de jours/)).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /Confirmer l'inscription/i }));

      expect(mockOnRegister).not.toHaveBeenCalled();
      expect(screen.getByText(/manquantes ou invalides/i)).toBeInTheDocument();
      expect(screen.getAllByText('Réponse obligatoire').length).toBe(2);
      expect(screen.getByText('Veuillez cocher cette case')).toBeInTheDocument();
    });

    test('affiche la question conditionnelle et envoie seulement les réponses visibles', async () => {
      const mockOnRegister = vi.fn().mockResolvedValue(true);
      render(<EventRegistration event={eventChantier() as any} onRegister={mockOnRegister} isRegistered={false} />);

      await user.click(screen.getByRole('button', { name: /S'inscrire/i }));
      await user.type(await screen.findByLabelText(/Ville ou wilaya/), 'Batna');
      await user.click(screen.getByRole('radio', { name: 'Partielle' }));
      await user.type(await screen.findByLabelText(/Combien de jours/), '4');
      await user.click(screen.getByRole('checkbox'));
      await user.click(screen.getByRole('button', { name: /Confirmer l'inscription/i }));

      await waitFor(() => expect(mockOnRegister).toHaveBeenCalledTimes(1));
      expect(mockOnRegister).toHaveBeenCalledWith({
        oeuvres: undefined,
        reponses: { ville: 'Batna', presence: 'Partielle', jours: '4', frais: true }
      });
    });
  });

  // =========================================================================
  // Rendu selon état d'authentification
  // =========================================================================

  describe('Rendu selon état d\'authentification', () => {
    test('affiche le lien de connexion quand l\'utilisateur n\'est pas connecté', () => {
      mockIsAuthenticated.value = false;

      render(
        <EventRegistration
          event={makeEvent()}
          onRegister={vi.fn()}
          isRegistered={false}
        />
      );

      expect(
        screen.getByText(/event\.registration\.loginToRegister|Se connecter pour s'inscrire/i)
      ).toBeInTheDocument();

      // Le bouton S'inscrire ne doit PAS être visible
      expect(
        screen.queryByRole('button', { name: /event\.registration\.register|S'inscrire/i })
      ).not.toBeInTheDocument();
    });

    test('statut "inscrit" : demande en attente, sans planter', () => {
      render(
        <EventRegistration
          event={makeEvent()}
          onRegister={vi.fn()}
          onUnregister={vi.fn()}
          isRegistered={true}
          registrationStatus="inscrit"
        />
      );

      expect(screen.getByText('En attente')).toBeInTheDocument();
      expect(screen.getByText(/en attente de validation/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Annuler mon inscription/i })).toBeInTheDocument();
    });

    test('statut "annule" : inscription non retenue, sans bouton d\'annulation', () => {
      render(
        <EventRegistration
          event={makeEvent()}
          onRegister={vi.fn()}
          onUnregister={vi.fn()}
          isRegistered={true}
          registrationStatus="annule"
        />
      );

      expect(screen.getByText('Non retenue')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Annuler mon inscription/i })).not.toBeInTheDocument();
    });

    test('affiche le message "Inscription non disponible" quand l\'événement est complet', () => {
      render(
        <EventRegistration
          event={makeEvent({ est_complet: true })}
          onRegister={vi.fn()}
          isRegistered={false}
        />
      );

      expect(
        screen.getByRole('button', {
          name: /event\.registration\.unavailable|Inscription non disponible/i,
        })
      ).toBeDisabled();
    });
  });
});
