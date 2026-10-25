import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const getUpcoming = vi.fn();
const get = vi.fn();
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, d?: unknown) => (typeof d === 'string' ? d : (d as { defaultValue?: string })?.defaultValue?.replace('{{count}}', String((d as { count?: number }).count)) ?? k), i18n: { language: 'fr' } })
}));
vi.mock('@/services/evenement.service', () => ({ evenementService: { getUpcoming: (...a: unknown[]) => getUpcoming(...a) } }));
vi.mock('@/services/httpClient', () => ({ httpClient: { get: (...a: unknown[]) => get(...a) } }));
vi.mock('@/hooks/useFormatDate', () => ({ useFormatDate: () => ({ formatDate: (d: string | Date) => new Date(d).toISOString().slice(0, 10) }) }));

import ALaUne from '../ALaUne';
import ALire from '../ALire';

const afficher = (ui: React.ReactElement) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter>{ui}</MemoryRouter>
  </QueryClientProvider>
);

describe('À la une (prochains événements)', () => {
  beforeEach(() => vi.clearAllMocks());

  test('le prochain événement en grand, avec son lieu, et les suivants à côté', async () => {
    const dans = (j: number) => new Date(Date.now() + j * 86400000).toISOString();
    getUpcoming.mockResolvedValue({ success: true, data: { data: [
      { id_evenement: 1, nom_evenement: 'Salon de la poterie d’Aït Smaïl', date_debut: dans(5), date_fin: dans(6), Lieu: { nom: 'Aït Smaïl' }, TypeEvenement: { nom_type: 'Salon' } },
      { id_evenement: 2, nom_evenement: 'Festival du film amazigh', date_debut: dans(20) }
    ] } });
    afficher(<ALaUne />);
    expect(await screen.findByRole('heading', { name: 'Salon de la poterie d’Aït Smaïl' })).toBeInTheDocument();
    expect(screen.getByText('Aït Smaïl')).toBeInTheDocument();
    expect(screen.getByText('Salon')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir le programme' })).toHaveAttribute('href', '/evenements/1-salon-de-la-poterie-d-ait-smail');
    expect(screen.getByRole('link', { name: /Festival du film amazigh/ })).toHaveAttribute('href', '/evenements/2-festival-du-film-amazigh');
  });

  test('aucun événement à venir : la section n’apparaît pas', async () => {
    getUpcoming.mockResolvedValue({ success: true, data: { data: [] } });
    const { container } = afficher(<ALaUne />);
    await vi.waitFor(() => expect(getUpcoming).toHaveBeenCalled());
    await vi.waitFor(() => expect(container.querySelector('section')).toBeNull());
  });
});

describe('À lire (derniers articles)', () => {
  beforeEach(() => vi.clearAllMocks());

  test('l’article le plus récent en grand avec son fil « Lieu › Section », les autres en liste', async () => {
    get.mockResolvedValue({ success: true, data: [
      { id_oeuvre: 58, titre: { fr: 'La rechta, le fil des jours de fête' }, resume: { fr: 'Des pâtes si fines…' }, image: null, auteur: 'Équipe Tala DZ',
        lieu: { id_lieu: 69, nom: { fr: 'Casbah d’Alger' }, section_patrimoine: 'gastronomie' }, personnalite: null },
      { id_oeuvre: 59, titre: { fr: 'El Anka, la voix de la Casbah' }, resume: null, image: null, auteur: null, lieu: null,
        personnalite: { id_intervenant: 33, nom: { fr: 'El Anka' }, prenom: { fr: 'El Hadj M’hamed' } } }
    ] });
    afficher(<ALire />);
    expect(await screen.findByText('La rechta, le fil des jours de fête')).toBeInTheDocument();
    expect(screen.getByText(/Casbah d’Alger ›/)).toBeInTheDocument();
    expect(screen.getByText('El Hadj M’hamed El Anka')).toBeInTheDocument();
    expect(screen.getByText('Équipe Tala DZ')).toBeInTheDocument();
    expect(screen.getAllByRole('link').map(a => a.getAttribute('href'))).toEqual(['/articles/58', '/articles/59']);
  });

  test('aucun article publié : la section n’apparaît pas', async () => {
    get.mockResolvedValue({ success: true, data: [] });
    const { container } = afficher(<ALire />);
    await vi.waitFor(() => expect(get).toHaveBeenCalled());
    await vi.waitFor(() => expect(container.querySelector('section')).toBeNull());
  });
});
