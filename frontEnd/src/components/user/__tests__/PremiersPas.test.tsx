import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const abonnement = vi.fn();
vi.mock('@/utils/applicationMobile', () => ({ abonnementActuel: () => abonnement() }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, d: string, o?: Record<string, unknown>) => d.replace(/\{\{(\w+)\}\}/g, (_m, n) => String(o?.[n] ?? '')) }),
}));

import PremiersPas, { type EtapePremiersPas } from '../PremiersPas';

const etapes = (photo: boolean): EtapePremiersPas[] => [
  { cle: 'photo', titre: 'Ajoutez votre photo', fait: photo, lien: '/dashboard-user?onglet=profil' },
  { cle: 'notifications', titre: 'Notifications', fait: 'notifications', lien: '/guide/telephone', statique: true },
];

describe('Premiers pas', () => {
  // Le fichier de préparation des tests remplace localStorage par des fonctions vides : petite mémoire ici
  let memoire: Record<string, string> = {};
  beforeEach(() => {
    memoire = {};
    vi.mocked(localStorage.getItem).mockImplementation((k: string) => memoire[k] ?? null);
    vi.mocked(localStorage.setItem).mockImplementation((k: string, v: string) => { memoire[k] = v; });
    abonnement.mockReset().mockResolvedValue(null);
  });

  it('affiche les étapes et l’avancement ; une étape faite est cochée', async () => {
    render(<MemoryRouter><PremiersPas idUser={5} etapes={etapes(true)} /></MemoryRouter>);
    expect(await screen.findByText('1 sur 2')).toBeTruthy();
    expect(screen.getByText('(fait)')).toBeTruthy();
    // Étape à faire : un lien ; page statique : lien classique vers le guide
    expect(screen.getByRole('link', { name: /Notifications/ }).getAttribute('href')).toBe('/guide/telephone');
  });

  it('disparaît quand tout est fait (notifications actives sur l’appareil)', async () => {
    abonnement.mockResolvedValue({ endpoint: 'x' });
    const { container } = render(<MemoryRouter><PremiersPas idUser={5} etapes={etapes(true)} /></MemoryRouter>);
    await waitFor(() => expect(container.innerHTML).toBe(''));
  });

  it('« Plus tard » le masque pour de bon sur cet appareil', () => {
    const { unmount } = render(<MemoryRouter><PremiersPas idUser={5} etapes={etapes(false)} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Masquer, plus tard' }));
    expect(screen.queryByTestId('premiers-pas')).toBeNull();
    unmount();
    render(<MemoryRouter><PremiersPas idUser={5} etapes={etapes(false)} /></MemoryRouter>);
    expect(screen.queryByTestId('premiers-pas')).toBeNull();
  });
});
