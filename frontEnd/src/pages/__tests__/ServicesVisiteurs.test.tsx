import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const get = vi.fn();
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, d?: unknown) => (typeof d === 'string' ? d : k), i18n: { language: 'fr' } })
}));
vi.mock('@/services/httpClient', () => ({ httpClient: { get: (...a: unknown[]) => get(...a) } }));
vi.mock('@/components/Header', () => ({ default: () => <header /> }));
vi.mock('@/components/Footer', () => ({ default: () => <footer /> }));
vi.mock('@/components/SEOHead', () => ({ default: () => null }));
vi.mock('@/components/shared/ErrorBoundary', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/hooks/useDebouncedValue', () => ({ useDebouncedValue: (v: unknown) => v }));

import ServicesVisiteurs from '../ServicesVisiteurs';

const afficher = () => render(<MemoryRouter><ServicesVisiteurs /></MemoryRouter>);

describe('Services aux visiteurs', () => {
  beforeEach(() => vi.clearAllMocks());

  test('une carte par service, qui mène à sa fiche, avec son lieu et sa wilaya', async () => {
    get.mockResolvedValue({ success: true, data: {
      services: [{ id: 7, nom: { fr: 'Gîte Dar Yemma' }, type_service: 'hotel', tarif_min: '4500.00', tarif_max: '7000.00',
        lieu: { id_lieu: 69, nom: { fr: 'Casbah d’Alger' } }, wilaya: { id_wilaya: 16, nom: 'الجزائر', wilaya_name_ascii: 'Alger' } }],
      wilayas: [{ id_wilaya: 16, nom: 'الجزائر', wilaya_name_ascii: 'Alger' }]
    } });
    afficher();
    expect(await screen.findByRole('link', { name: 'Gîte Dar Yemma' })).toHaveAttribute('href', '/services/7');
    expect(screen.getByText('Casbah d’Alger · Alger')).toBeInTheDocument();
  });

  test('le choix d’un type relance la recherche avec ce type', async () => {
    get.mockResolvedValue({ success: true, data: { services: [], wilayas: [] } });
    afficher();
    await screen.findByText('Aucun service pour l’instant');
    fireEvent.click(screen.getByRole('button', { name: /^guide$/i }));
    await vi.waitFor(() => expect(get).toHaveBeenLastCalledWith('/services/annuaire', { type: 'guide' }));
    expect(await screen.findByText('Aucun service ne correspond à votre recherche')).toBeInTheDocument();
  });
});
