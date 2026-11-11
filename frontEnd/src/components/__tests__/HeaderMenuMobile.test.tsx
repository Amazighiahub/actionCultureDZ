import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null, isAuthenticated: false, logout: vi.fn() }) }));
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ isAdmin: false, isProfessional: false, needsValidation: false, canCreateOeuvre: false, canCreateEvent: false, canAccessProfessionalDashboard: false }),
}));
vi.mock('@/components/LanguageSelector', () => ({ default: () => null }));
vi.mock('@/components/NotificationBell', () => ({ default: () => null }));
vi.mock('@/components/shared/PiedDePageApplication', () => ({ InstallerTalaDz: () => null }));

import Header from '../Header';

describe('menu sur téléphone (audit V11 UX-12)', () => {
  it('propose la contribution, les organisations, les wilayas et le guide', () => {
    render(<MemoryRouter><Header /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Ouvrir le menu/i }));
    const menu = within(document.getElementById('mobile-menu') as HTMLElement);
    expect(menu.getByRole('link', { name: /proposer un lieu/i })).toHaveAttribute('href', '/ajouter-patrimoine');
    expect(menu.getByRole('link', { name: /Organisations/i })).toHaveAttribute('href', '/organisations');
    expect(menu.getByRole('link', { name: /wilayas/i })).toHaveAttribute('href', '/wilayas');
    expect(menu.getByRole('link', { name: /Guide du contributeur/i }).getAttribute('href')).toMatch(/^\/guide\//);
  });
});
