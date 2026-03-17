/**
 * AdminModeration.test.tsx — Tests automatisés de la modération des signalements (admin)
 *
 * Couverture :
 *   - La queue de modération affiche les contenus signalés
 *   - Valider un contenu (Ignorer) le retire de la queue
 *   - Rejeter un contenu (Supprimer) appelle moderateSignalement avec l'action
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ---------------------------------------------------------------------------
// vi.hoisted — variables accessibles dans les factories vi.mock (hoisted)
// ---------------------------------------------------------------------------

const {
  mockModerateSignalement,
  mockRefreshAll,
  mockModerationQueue,
} = vi.hoisted(() => ({
  mockModerateSignalement: vi.fn(),
  mockRefreshAll: vi.fn(),
  mockModerationQueue: {
    value: null as any,
  },
}));

// ---------------------------------------------------------------------------
// Données de test
// ---------------------------------------------------------------------------

const MOCK_SIGNALEMENTS = {
  items: [
    {
      id: 10,
      type: 'commentaire',
      entity_id: 100,
      entity_title: 'Commentaire offensant sur Tlemcen',
      reason: 'contenu_inapproprie',
      reported_by: { id: 5, nom: 'Ahmed Benali' },
      date_signalement: '2026-03-10',
      status: 'pending',
    },
    {
      id: 11,
      type: 'oeuvre',
      entity_id: 200,
      entity_title: 'Œuvre plagiée — Les montagnes du Djurdjura',
      reason: 'droits_auteur',
      reported_by: { id: 8, nom: 'Sara Mansouri' },
      date_signalement: '2026-03-12',
      status: 'pending',
    },
    {
      id: 12,
      type: 'evenement',
      entity_id: 300,
      entity_title: 'Événement spam publicitaire',
      reason: 'spam',
      reported_by: { id: 12, nom: 'Youcef Kaddour' },
      date_signalement: '2026-03-14',
      status: 'pending',
    },
  ],
};

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: any) => {
      if (typeof fallback === 'string') return fallback;
      if (typeof fallback === 'object' && fallback !== null) {
        let text = key;
        for (const [k, v] of Object.entries(fallback)) {
          text = text.replace(`{{${k}}}`, String(v));
        }
        return text;
      }
      return key;
    },
    i18n: { language: 'fr', changeLanguage: vi.fn() },
  }),
}));

vi.mock('@/hooks/useDashboardAdmin', () => ({
  useDashboardAdmin: () => ({
    moderationQueue: mockModerationQueue.value,
    loadingModeration: false,
    errorModeration: null,
    moderateSignalement: mockModerateSignalement,
    refreshAll: mockRefreshAll,
  }),
}));

vi.mock('@/hooks/useDebouncedValue', () => ({
  useDebouncedValue: (value: any) => value,
}));

vi.mock('@/hooks/useFormatDate', () => ({
  useFormatDate: () => ({
    formatDate: (d: string) => d || '',
  }),
}));

vi.mock('@/components/shared', () => ({
  EmptyState: ({ title, description }: any) => (
    <div data-testid="empty-state">
      <p>{title}</p>
      <p>{description}</p>
    </div>
  ),
  LoadingSkeleton: () => <div data-testid="loading-skeleton" />,
}));

// -- Radix Select -> native HTML for jsdom --
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

// ---------------------------------------------------------------------------
// Import APRÈS les mocks
// ---------------------------------------------------------------------------

import AdminModerationTab from '@/pages/admin/AdminModerationTab';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AdminModerationTab — Modération des signalements', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    mockModerationQueue.value = MOCK_SIGNALEMENTS;
    mockModerateSignalement.mockResolvedValue(undefined);
  });

  test('la queue de modération affiche les contenus signalés', () => {
    render(<AdminModerationTab />);

    // All 3 signalements should be visible with their entity titles
    expect(screen.getByText('Commentaire offensant sur Tlemcen')).toBeInTheDocument();
    expect(screen.getByText(/Œuvre plagiée/)).toBeInTheDocument();
    expect(screen.getByText(/spam publicitaire/)).toBeInTheDocument();

    // Each signalement card has action buttons (Ignorer, Avertir, Supprimer, Suspendre)
    // 3 signalements × 4 actions = 12 action buttons minimum
    const ignorerButtons = screen.getAllByRole('button', { name: /ignorer/i });
    expect(ignorerButtons.length).toBe(3);

    // Signalement count text rendered
    const countTexts = screen.getAllByText(/signalement/i);
    expect(countTexts.length).toBeGreaterThanOrEqual(1);

    // Header title "Modération" is rendered (multiple matches include reportedBy keys)
    const moderationTexts = screen.getAllByText(/mod[eé]ration/i);
    expect(moderationTexts.length).toBeGreaterThanOrEqual(1);
  });

  test('valider un contenu (Ignorer) appelle moderateSignalement avec action aucune', async () => {
    render(<AdminModerationTab />);

    // Find all "Ignorer" buttons (one per signalement → 3)
    const ignorerButtons = screen.getAllByRole('button', { name: /ignorer/i });
    expect(ignorerButtons.length).toBe(3);

    // Click the first Ignorer button (signalement id: 10)
    await user.click(ignorerButtons[0]);

    expect(mockModerateSignalement).toHaveBeenCalledWith({
      signalementId: 10,
      action: 'aucune',
    });
  });

  test('rejeter un contenu (Supprimer) appelle moderateSignalement avec action suppression_contenu', async () => {
    render(<AdminModerationTab />);

    // Find all "Supprimer" buttons (one per signalement → 3)
    const supprimerButtons = screen.getAllByRole('button', { name: /supprimer/i });
    expect(supprimerButtons.length).toBe(3);

    // Click the second Supprimer button (signalement id: 11, the oeuvre)
    await user.click(supprimerButtons[1]);

    expect(mockModerateSignalement).toHaveBeenCalledWith({
      signalementId: 11,
      action: 'suppression_contenu',
    });
  });
});
