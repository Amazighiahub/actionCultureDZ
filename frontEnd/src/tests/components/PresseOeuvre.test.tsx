/**
 * Anti-retour (2026-11-23, conseil d'une écrivaine) : la presse est liée aux œuvres.
 * - sur la page de son œuvre, l'auteur voit « Ajouter un article de presse sur cette œuvre », même sans lien ;
 * - un visiteur ne voit rien tant qu'aucun article n'est rattaché ;
 * - le bouton ouvre « Mon portfolio » avec le formulaire prêt, l'œuvre déjà choisie.
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const get = vi.fn();
let pro = false;

vi.mock('react-i18next', async (original) => ({
  ...(await original<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (_: string, d?: string | Record<string, unknown>) => (typeof d === 'string' ? d : _), i18n: { language: 'fr' } }),
}));
vi.mock('@/services/httpClient', () => ({ httpClient: { get: (...a: unknown[]) => get(...a) } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isProfessional: pro }) }));
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

import { LiensDuContenu } from '@/components/shared/LiensExternes';
import GestionLiens from '@/components/pro/GestionLiens';

const rendre = (el: React.ReactNode, url = '/') => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[url]}>{el}</MemoryRouter>
  </QueryClientProvider>,
);

beforeEach(() => {
  get.mockReset();
  get.mockImplementation((url: string) => {
    if (url === '/liens/mes-contenus') return Promise.resolve({ success: true, data: { oeuvres: [{ id_oeuvre: 7, titre: 'Mon roman' }], evenements: [] } });
    return Promise.resolve({ success: true, data: [] });
  });
});

describe('Presse liée aux œuvres', () => {
  test('auteur : bouton vers le portfolio avec l’œuvre choisie, même sans article', async () => {
    pro = true;
    rendre(<LiensDuContenu type="oeuvre" id={7} />);
    const lien = await screen.findByRole('link', { name: /Ajouter un article de presse sur cette œuvre/ });
    expect(lien).toHaveAttribute('href', '/dashboard-user?onglet=portfolio&lier=oeuvre:7');
  });

  test('visiteur : rien tant qu’aucun article n’est rattaché', async () => {
    pro = false;
    const { container } = rendre(<LiensDuContenu type="oeuvre" id={7} />);
    await waitFor(() => expect(get).toHaveBeenCalledWith('/liens/oeuvre/7'));
    expect(container).toBeEmptyDOMElement();
    expect(get).not.toHaveBeenCalledWith('/liens/mes-contenus');
  });

  test('pro mais pas l’auteur : pas de bouton', async () => {
    pro = true;
    const { container } = rendre(<LiensDuContenu type="oeuvre" id={99} />);
    await waitFor(() => expect(get).toHaveBeenCalledWith('/liens/mes-contenus'));
    expect(container).toBeEmptyDOMElement();
  });

  test('?lier=oeuvre:7 : le formulaire s’ouvre, prêt à coller le lien', async () => {
    pro = true;
    rendre(<GestionLiens />, '/dashboard-user?onglet=portfolio&lier=oeuvre:7');
    expect(await screen.findByLabelText('Collez le lien')).toBeInTheDocument();
    expect(await screen.findByText('Mon roman')).toBeInTheDocument();
  });

  test('?lier invalide : formulaire fermé', async () => {
    rendre(<GestionLiens />, '/dashboard-user?onglet=portfolio&lier=autre:abc');
    await waitFor(() => expect(get).toHaveBeenCalledWith('/liens/mes-liens'));
    expect(screen.queryByLabelText('Collez le lien')).not.toBeInTheDocument();
  });
});
