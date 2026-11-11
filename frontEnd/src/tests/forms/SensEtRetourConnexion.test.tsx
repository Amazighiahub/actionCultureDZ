/**
 * Audit V11 UX-22, UX-29, UX-36 :
 *   - en arabe, e-mail et mot de passe restent écrits de gauche à droite (dir="ltr"), même affiché en clair ;
 *   - « Mot de passe oublié » a un vrai titre de niveau 1 ;
 *   - sans compte, « Créer la page de mon organisation » mène à l'inscription puis revient au formulaire.
 */
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
    i18n: { language: 'ar', changeLanguage: vi.fn() },
  }),
}));

vi.mock('@/hooks/useRTL', () => ({
  useRTL: () => ({ isRTL: true, direction: 'rtl', rtlClasses: { flexRow: '', marginEnd: () => '', marginStart: () => '' } }),
}));

vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }), toast: vi.fn() }));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: false, login: vi.fn(), loginLoading: false }),
}));

vi.mock('@/services/user.service', () => ({ userService: { forgotPassword: vi.fn() } }));
vi.mock('@/services/httpClient', () => ({
  httpClient: { get: vi.fn().mockResolvedValue({ success: true, data: { organisations: [], categories: {}, wilayas: [] } }) },
}));

vi.mock('@/components/Header', () => ({ default: () => <header /> }));
vi.mock('@/components/Footer', () => ({ default: () => <footer /> }));
vi.mock('@/components/SEOHead', () => ({ default: () => null }));
vi.mock('@/components/shared/ErrorBoundary', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/shared', () => ({ LoadingSkeleton: () => null }));

import LoginForm from '@/pages/auth/LoginForm';
import ForgotPassword from '@/pages/ForgotPassword';
import OrganisationsAnnuaire from '@/pages/OrganisationsAnnuaire';

const dansRouteur = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('Champs de gauche à droite en arabe (UX-22)', () => {
  test('connexion : e-mail et mot de passe en dir="ltr", aussi une fois le mot de passe affiché', () => {
    dansRouteur(<LoginForm onSwitchToRegister={vi.fn()} />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('dir', 'ltr');
    const motDePasse = screen.getByLabelText('Mot de passe');
    expect(motDePasse).toHaveAttribute('type', 'password');
    expect(motDePasse).toHaveAttribute('dir', 'ltr');
    fireEvent.click(screen.getByRole('button', { name: 'Afficher' }));
    expect(motDePasse).toHaveAttribute('type', 'text');
    expect(motDePasse).toHaveAttribute('dir', 'ltr');
  });

  test('mot de passe oublié : titre h1 et e-mail en dir="ltr" (UX-36)', () => {
    dansRouteur(<ForgotPassword />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(document.getElementById('email')).toHaveAttribute('dir', 'ltr');
  });
});

describe('Retour au formulaire après la connexion (UX-29)', () => {
  test('annuaire des organisations : inscription puis retour à /ajouter-organisation', () => {
    dansRouteur(<OrganisationsAnnuaire />);
    const lien = screen.getByRole('link', { name: 'Créer la page de mon organisation' });
    expect(lien).toHaveAttribute('href', '/auth?tab=inscription&redirect=%2Fajouter-organisation');
  });
});
