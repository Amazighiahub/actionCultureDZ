/**
 * ModifierPatrimoine — modifier un site existant (la page « Modifier » ouvrait un formulaire de
 * création vide qui créait un doublon)
 *
 * Couverture :
 *   - Créateur : fiche pré-remplie (toutes les langues), enregistrement de la fiche (PUT)
 *   - Photo supprimée après confirmation
 *   - Autre compte : message, pas de formulaire
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const { mockGet, mockPut, mockDeleteMedia, mockPermissions } = vi.hoisted(() => ({
  mockGet: vi.fn(), mockPut: vi.fn(), mockDeleteMedia: vi.fn(),
  mockPermissions: { isAdmin: false, hasRole: (_r: string): boolean => false, isOwner: (id: number): boolean => id === 60 },
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: '10' }),
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>) => (typeof fallback === 'string' ? fallback : key),
    i18n: { language: 'fr' },
  }),
}));
vi.mock('@/components/Header', () => ({ default: () => null }));
vi.mock('@/components/Footer', () => ({ default: () => null }));
vi.mock('@/components/shared/GPSPicker', () => ({ default: () => <div>carte</div> }));
vi.mock('@/hooks/useRTL', () => ({ useRTL: () => ({ direction: 'ltr' }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/usePermissions', () => ({ usePermissions: () => mockPermissions }));
vi.mock('@/services/httpClient', () => ({ httpClient: { get: mockGet, put: mockPut } }));
vi.mock('@/services/patrimoine.service', () => ({
  patrimoineService: { deleteMedia: mockDeleteMedia, uploadMedias: vi.fn() },
}));

import ModifierPatrimoine from '@/pages/ModifierPatrimoine';

const site = {
  id_lieu: 10, id_createur: 60, id_lieu_parent: null,
  nom: { fr: 'Casbah de Béjaïa', ar: 'قصبة بجاية' }, adresse: { fr: 'Haute ville' },
  typePatrimoine: 'monument', latitude: 36.75, longitude: 5.08,
  DetailLieu: { description: { fr: 'Citadelle hammadide', ar: 'قلعة' }, histoire: { fr: 'XIe siècle' } },
  medias: [{ id: 3, type: 'image', url: 'https://img/1.jpg' }, { id: 4, type: 'audio', url: 'https://a/1.mp3', langue: 'tz-ltn' }],
};

describe('ModifierPatrimoine', () => {
  beforeEach(() => {
    mockGet.mockReset(); mockPut.mockReset(); mockDeleteMedia.mockReset();
    mockPermissions.isOwner = (id: number) => id === 60;
    mockPermissions.isAdmin = false;
  });

  test('créateur : fiche pré-remplie en toutes langues, enregistrée par PUT', async () => {
    mockGet.mockResolvedValue({ success: true, data: site });
    mockPut.mockResolvedValue({ success: true });
    render(<ModifierPatrimoine />);

    expect(await screen.findByDisplayValue('Casbah de Béjaïa')).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith('/patrimoine/10', { i18n: 'all' });
    expect(screen.getByDisplayValue('Citadelle hammadide')).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('Citadelle hammadide'), { target: { value: 'Citadelle hammadide, remparts' } });
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer les modifications/ }));

    await waitFor(() => expect(mockPut).toHaveBeenCalledWith('/patrimoine/10', expect.objectContaining({
      nom: expect.objectContaining({ fr: 'Casbah de Béjaïa', ar: 'قصبة بجاية' }),
      description: expect.objectContaining({ fr: 'Citadelle hammadide, remparts', ar: 'قلعة' }),
      typePatrimoine: 'monument',
    })));
    expect(mockPut.mock.calls[0][1]).not.toHaveProperty('repere');
  });

  test('photo supprimée après confirmation', async () => {
    mockGet.mockResolvedValue({ success: true, data: site });
    mockDeleteMedia.mockResolvedValue({ success: true });
    render(<ModifierPatrimoine />);

    fireEvent.click(await screen.findByRole('button', { name: 'Supprimer la photo {{n}}' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Supprimer' }));
    await waitFor(() => expect(mockDeleteMedia).toHaveBeenCalledWith(10, 3));
    await waitFor(() => expect(screen.queryByRole('img', { name: 'Photo {{n}}' })).toBeNull());
  });

  test('autre compte : explication, pas de formulaire', async () => {
    mockPermissions.isOwner = () => false;
    mockGet.mockResolvedValue({ success: true, data: site });
    render(<ModifierPatrimoine />);

    expect(await screen.findByText(/Seuls le créateur de ce site et la modération/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Enregistrer les modifications/ })).toBeNull();
  });

  test('administration : rattacher le lieu à un site (le musée devient un point d’Aït Smaïl)', async () => {
    mockPermissions.isAdmin = true;
    mockPermissions.isOwner = () => false;
    mockGet.mockImplementation(async (url: string) => url === '/patrimoine/search'
      ? { success: true, data: [{ id_lieu: 39, nom: 'Aït Smaïl' }, { id_lieu: 10, nom: 'Lui-même' }] }
      : { success: true, data: { ...site, id_lieu_parent: null } });
    mockPut.mockResolvedValue({ success: true });
    render(<ModifierPatrimoine />);

    fireEvent.change(await screen.findByPlaceholderText('Rechercher le site (ex. : Aït Smaïl)'), { target: { value: 'Ait' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Aït Smaïl' }));
    expect(screen.queryByRole('button', { name: 'Lui-même' })).toBeNull();
    expect(screen.getByText('Aït Smaïl')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer les modifications/ }));
    await waitFor(() => expect(mockPut).toHaveBeenCalledWith('/patrimoine/10', expect.objectContaining({ id_lieu_parent: 39 })));
  });

  test('créateur (pas la modération) : pas de champ de rattachement', async () => {
    mockGet.mockResolvedValue({ success: true, data: site });
    render(<ModifierPatrimoine />);
    await screen.findByDisplayValue('Casbah de Béjaïa');
    expect(screen.queryByText('Fait partie d’un site')).toBeNull();
  });
});
