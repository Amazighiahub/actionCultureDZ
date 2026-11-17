/**
 * Anti-retour (2026-11-17) : un onglet ouvert avant une mise en ligne propose de recharger dès que le
 * site en ligne a un autre script principal ; rien en développement ni quand la version est la même.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_k: string, d?: string) => d || _k }) }));

import NouvelleVersion, { scriptActuel } from '../NouvelleVersion';

const page = (script: string) => `<!doctype html><html><head><script type="module" crossorigin src="${script}"></script></head></html>`;

describe('Bandeau « nouvelle version »', () => {
  let script: HTMLScriptElement;
  beforeEach(() => {
    script = document.createElement('script');
    script.type = 'module';
    script.setAttribute('src', '/assets/index-ANCIEN.js');
    document.head.appendChild(script);
  });
  afterEach(() => { script.remove(); vi.unstubAllGlobals(); });

  it('lit le script principal de la page ; aucun en développement', () => {
    expect(scriptActuel()).toBe('/assets/index-ANCIEN.js');
    script.setAttribute('src', '/src/main.tsx');
    expect(scriptActuel()).toBeNull();
  });

  it('nouvelle version en ligne : le bandeau propose de recharger au retour sur l’onglet', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => page('/assets/index-NOUVEAU.js') }));
    render(<NouvelleVersion />);
    await act(async () => { window.dispatchEvent(new Event('focus')); await new Promise((r) => setTimeout(r, 0)); });
    expect(screen.getByRole('status').textContent).toMatch(/nouvelle version/);
    expect(screen.getByRole('button', { name: 'Recharger' })).toBeTruthy();
  });

  it('même version : rien ne s’affiche', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => page('/assets/index-ANCIEN.js') }));
    render(<NouvelleVersion />);
    await act(async () => { window.dispatchEvent(new Event('focus')); await new Promise((r) => setTimeout(r, 0)); });
    expect(screen.queryByRole('status')).toBeNull();
  });
});
