import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/components/Header', () => ({ default: () => null }));
vi.mock('@/components/Footer', () => ({ default: () => null }));
vi.mock('@/components/SEOHead', () => ({ default: () => null }));

const reponses: Record<string, unknown> = {
  '/patrimoine/search': [{ id_lieu: 24, nom: 'Timgad', Commune: { nom: 'Batna' } }],
  '/evenements/search': [{ id_evenement: 72, nom_evenement: 'Soirée chaâbi', date_debut: '2026-11-24T19:00:00Z' }],
  '/oeuvres/search': { oeuvres: [] },
  '/users/professionals': [],
  '/organisations': { organisations: [] },
  '/metadata/wilayas': [{ id_wilaya: 13, nom: 'تلمسان', wilaya_name_ascii: 'Tlemcen' }, { id_wilaya: 5, nom: 'باتنة', wilaya_name_ascii: 'Batna' }],
};
const get = vi.fn(async (adresse: string, _params?: unknown) => {
  if (adresse === '/evenements/search') throw Object.assign(new Error('panne'), { status: 500 });
  return { success: true, data: reponses[adresse] };
});
vi.mock('@/services/httpClient', () => ({ httpClient: { get: (a: string, p?: unknown) => get(a, p) } }));

import Recherche from '../Recherche';

const afficher = (q: string) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[`/recherche?q=${encodeURIComponent(q)}`]}><Recherche /></MemoryRouter>
  </QueryClientProvider>,
);

describe('recherche générale (audit V11 UX-13)', () => {
  it('résultats groupés par type ; une recherche en panne n\'empêche pas les autres', async () => {
    afficher('tlemcen');
    const wilayas = await screen.findByRole('region', { name: 'Wilayas' });
    expect(within(wilayas).getByRole('link', { name: /Tlemcen/ })).toHaveAttribute('href', expect.stringMatching(/^\/wilayas\/13/));
    const lieux = await screen.findByRole('region', { name: 'Lieux et patrimoine' });
    expect(within(lieux).getByRole('link', { name: /Timgad/ })).toHaveAttribute('href', expect.stringMatching(/^\/patrimoine\/24/));
    // Événements en panne (500) : groupe absent, le reste s'affiche
    expect(screen.queryByRole('region', { name: 'Événements' })).not.toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/patrimoine/search', { q: 'tlemcen', limit: 6 });
  });

  it('moins de 2 lettres : aide, aucune recherche lancée', () => {
    get.mockClear();
    afficher('t');
    expect(screen.getByText(/au moins 2 lettres/)).toBeInTheDocument();
    expect(get).not.toHaveBeenCalledWith('/patrimoine/search', expect.anything());
  });
});
