/**
 * Audit V11 UX-36 : pendant le chargement de la vérification anti-robots, un indicateur accessible
 * (role="status") remplace la zone vide ; il disparaît dès que le widget est affiché.
 * Le contrôle est désactivé en mode test : on simule une clé (VITE_TURNSTILE_SITE_KEY) avant l'import.
 */
import { describe, test, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: 'fr' },
  }),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  delete window.turnstile;
  document.head.querySelectorAll('script[src*="turnstile"]').forEach((s) => s.remove());
});

describe('AntiRobot — indicateur de chargement', () => {
  test('« Vérification anti-robots… » pendant le chargement, puis plus rien une fois le widget rendu', async () => {
    vi.stubEnv('MODE', 'development');
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'cle-de-test');
    const { default: AntiRobot } = await import('@/components/shared/AntiRobot');

    render(<AntiRobot action="contact" onJeton={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Vérification anti-robots…');

    // Le script de Cloudflare se charge : le widget est rendu
    const render_ = vi.fn(() => 'widget-1');
    window.turnstile = { render: render_, reset: vi.fn(), remove: vi.fn() };
    const script = document.head.querySelector('script[src*="turnstile"]') as HTMLScriptElement;
    expect(script).not.toBeNull();
    await act(async () => { script.onload?.(new Event('load')); });

    expect(render_).toHaveBeenCalled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
