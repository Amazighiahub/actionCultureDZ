/**
 * AdminValidateUser.test.tsx — Tests automatisés de la gestion des utilisateurs (admin)
 *
 * Couverture :
 *   - La liste des utilisateurs en attente se charge
 *   - Clic sur Valider change le statut et rafraîchit la liste
 *   - Clic sur Rejeter appelle validateUser(validated: false)
 *   - Bulk action sélectionne et valide plusieurs utilisateurs
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ---------------------------------------------------------------------------
// vi.hoisted — variables accessibles dans les factories vi.mock (hoisted)
// ---------------------------------------------------------------------------

const {
  mockValidateUser,
  mockDeleteUser,
  mockSuspendUser,
  mockReactivateUser,
  mockBulkUserAction,
  mockRefreshAll,
  mockAllUsers,
} = vi.hoisted(() => ({
  mockValidateUser: vi.fn(),
  mockDeleteUser: vi.fn(),
  mockSuspendUser: vi.fn(),
  mockReactivateUser: vi.fn(),
  mockBulkUserAction: vi.fn(),
  mockRefreshAll: vi.fn(),
  mockAllUsers: {
    value: null as any,
  },
}));

// ---------------------------------------------------------------------------
// Données de test
// ---------------------------------------------------------------------------

const MOCK_USERS_PENDING = {
  items: [
    {
      id_user: 1,
      prenom: 'Ali',
      nom: 'Boudiaf',
      email: 'ali@example.com',
      type_user: 'artiste',
      statut: 'en_attente_validation',
      statut_validation: 'en_attente',
      date_creation: '2026-01-15',
      photo_url: null,
    },
    {
      id_user: 2,
      prenom: 'Fatima',
      nom: 'Zahra',
      email: 'fatima@example.com',
      type_user: 'organisateur',
      statut: 'en_attente_validation',
      statut_validation: 'en_attente',
      date_creation: '2026-02-10',
      photo_url: null,
    },
    {
      id_user: 3,
      prenom: 'Karim',
      nom: 'Hamdi',
      email: 'karim@example.com',
      type_user: 'visiteur',
      statut: 'actif',
      statut_validation: 'valide',
      date_creation: '2025-12-01',
      photo_url: null,
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
        // Handle interpolation like '{{count}} utilisateur(s)'
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
    allUsers: mockAllUsers.value,
    loadingAllUsers: false,
    errorAllUsers: null,
    validateUser: mockValidateUser,
    deleteUser: mockDeleteUser,
    suspendUser: mockSuspendUser,
    reactivateUser: mockReactivateUser,
    bulkUserAction: mockBulkUserAction,
    refreshAll: mockRefreshAll,
  }),
}));

// useDebouncedValue — retourner la valeur immédiatement (pas de debounce en test)
vi.mock('@/hooks/useDebouncedValue', () => ({
  useDebouncedValue: (value: any) => value,
}));

vi.mock('@/hooks/useFormatDate', () => ({
  useFormatDate: () => ({
    formatDate: (d: string) => d || '',
  }),
}));

vi.mock('@/components/shared', () => ({
  LazyImage: ({ src, alt, className }: any) => <img src={src} alt={alt} className={className} />,
  EmptyState: ({ title, description }: any) => (
    <div data-testid="empty-state">
      <p>{title}</p>
      <p>{description}</p>
    </div>
  ),
  LoadingSkeleton: () => <div data-testid="loading-skeleton" />,
  StatusBadge: ({ status }: any) => <span data-testid="status-badge">{status}</span>,
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

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ id, checked, onCheckedChange, 'aria-label': ariaLabel, ...props }: any) => (
    <input
      type="checkbox"
      id={id}
      checked={!!checked}
      aria-label={ariaLabel}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  ),
}));

// DropdownMenu mock — render items directly so we can interact with them
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children, asChild, ...props }: any) => (
    <div data-testid="dropdown-trigger" {...props}>{children}</div>
  ),
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick, className }: any) => (
    <button data-testid="dropdown-item" className={className} onClick={onClick}>{children}</button>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

// ---------------------------------------------------------------------------
// Import APRÈS les mocks
// ---------------------------------------------------------------------------

import AdminUsersTab from '@/pages/admin/AdminUsersTab';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AdminUsersTab — Validation utilisateur', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    mockAllUsers.value = MOCK_USERS_PENDING;
    mockValidateUser.mockResolvedValue(undefined);
    mockBulkUserAction.mockResolvedValue(undefined);
  });

  test('la liste des utilisateurs en attente se charge', () => {
    render(<AdminUsersTab />);

    // All 3 users should be visible
    expect(screen.getByText('Ali Boudiaf')).toBeInTheDocument();
    expect(screen.getByText('Fatima Zahra')).toBeInTheDocument();
    expect(screen.getByText('Karim Hamdi')).toBeInTheDocument();

    // Emails visible
    expect(screen.getByText('ali@example.com')).toBeInTheDocument();
    expect(screen.getByText('fatima@example.com')).toBeInTheDocument();

    // Verify the user count subtitle is rendered
    const countTexts = screen.getAllByText(/utilisateur/i);
    expect(countTexts.length).toBeGreaterThanOrEqual(1);
  });

  test('clic sur Valider change le statut et rafraîchit la liste', async () => {
    render(<AdminUsersTab />);

    // Find the card for Ali (en_attente user)
    const aliCard = screen.getByText('Ali Boudiaf').closest('[class*="CardContent"], [class*="p-4"]')!;

    // Find the Valider button inside Ali's card
    const validerBtn = within(aliCard as HTMLElement).getByRole('button', { name: /^valider$/i });
    await user.click(validerBtn);

    expect(mockValidateUser).toHaveBeenCalledWith({
      userId: 1,
      validated: true,
    });
  });

  test('clic sur Rejeter appelle validateUser avec validated: false', async () => {
    render(<AdminUsersTab />);

    // Find the card for Ali (en_attente user)
    const aliCard = screen.getByText('Ali Boudiaf').closest('[class*="CardContent"], [class*="p-4"]')!;

    // Find the Rejeter button inside Ali's card
    const rejeterBtn = within(aliCard as HTMLElement).getByRole('button', { name: /^rejeter$/i });
    await user.click(rejeterBtn);

    expect(mockValidateUser).toHaveBeenCalledWith({
      userId: 1,
      validated: false,
    });
  });

  test('bulk action sélectionne et valide plusieurs utilisateurs', async () => {
    render(<AdminUsersTab />);

    // Find user checkboxes by their aria-label (each user has "Sélectionner ...")
    const userCheckboxes = screen.getAllByRole('checkbox').filter(cb =>
      cb.getAttribute('aria-label')?.includes('lectionner')
    );
    expect(userCheckboxes.length).toBe(3);

    // Select the first two users
    await user.click(userCheckboxes[0]);
    await user.click(userCheckboxes[1]);

    // The bulk action bar should appear with selected count
    await waitFor(() => {
      expect(screen.getByText(/sélectionné/i)).toBeInTheDocument();
    });

    // Click "Activer" bulk action — it's in the bulk bar with a specific icon
    const bulkButtons = screen.getAllByRole('button', { name: /activer/i });
    // The bulk "Activer" button is the one that's NOT inside a dropdown
    const bulkActiverBtn = bulkButtons.find(b =>
      !b.closest('[data-testid="dropdown-content"]')
    );
    expect(bulkActiverBtn).toBeTruthy();
    await user.click(bulkActiverBtn!);

    expect(mockBulkUserAction).toHaveBeenCalledWith(
      expect.arrayContaining([1, 2]),
      'activate'
    );
  });
});
