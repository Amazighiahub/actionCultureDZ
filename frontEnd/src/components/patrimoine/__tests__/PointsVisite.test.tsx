/**
 * PointsVisite / GuideAudio — points de visite d'un site et guide audio multilingue
 *
 * Couverture :
 *   - Points dans l'ordre, repère d'un point intérieur, carte limitée aux points extérieurs
 *   - Ajout d'un point (lien vers le formulaire avec le site parent), droits d'ordre
 *   - Changement d'ordre : liste complète envoyée, échec signalé sans rien changer
 *   - Audio : regroupé par langue, langue de l'interface par défaut, envoi avec la langue choisie
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';

const { mockNavigate, mockToast, mockReordonner, mockUpload, carteProps } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockToast: vi.fn(),
  mockReordonner: vi.fn(),
  mockUpload: vi.fn(),
  carteProps: { current: null as null | { points: Array<{ id_lieu: number; numero: number }> } },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to, ...rest }: any) => <a href={to} {...rest}>{children}</a>,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key, i18n: { language: 'fr' } }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));
vi.mock('@/helpers/assetUrl', () => ({ getAssetUrl: (u: string) => u }));
vi.mock('@/services/patrimoine.service', () => ({
  patrimoineService: { reordonnerPoints: mockReordonner, uploadMedias: mockUpload },
}));
// La carte (leaflet) n'est pas rendue : on vérifie seulement les points qu'elle reçoit
vi.mock('../PointsVisiteCarte', () => ({
  default: (props: any) => { carteProps.current = props; return <div data-testid="carte" />; },
}));
// Select Radix remplacé par un <select> natif
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <select data-testid="langue-envoi" value={value} onChange={(e) => onValueChange(e.target.value)}>{children}</select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{value}</option>,
}));

import PointsVisite, { type PointVisite } from '../PointsVisite';
import GuideAudio from '../GuideAudio';

const site = { id_lieu: 10, nom: 'Timgad', latitude: 35.4842, longitude: 6.4675 };
const points: PointVisite[] = [
  { id_lieu: 11, nom: 'Arc de Trajan', typePatrimoine: 'monument', latitude: 35.4850, longitude: 6.4690, ordre_visite: 1 },
  { id_lieu: 12, nom: 'Salle 3', typePatrimoine: 'autre', latitude: '35.48420000', longitude: '6.46750000', ordre_visite: 2, repere: '1er étage, salle 3' },
  { id_lieu: 13, nom: 'Marché de Sertius', typePatrimoine: 'monument', latitude: 35.4838, longitude: 6.4662, ordre_visite: 3 },
];

const renderPoints = (props: Partial<React.ComponentProps<typeof PointsVisite>> = {}) => {
  const onReordered = vi.fn();
  render(<PointsVisite site={site} points={points} lang="fr" canAdd={false} canReorder={false} onReordered={onReordered} {...props} />);
  return { onReordered };
};

describe('PointsVisite', () => {
  beforeEach(() => { vi.clearAllMocks(); carteProps.current = null; });

  test('points dans l\'ordre, repère affiché, carte sans le point intérieur', async () => {
    renderPoints();
    const liens = screen.getAllByRole('link').map(a => a.getAttribute('href'));
    expect(liens).toEqual(['/patrimoine/11', '/patrimoine/12', '/patrimoine/13']);
    expect(screen.getByText('1er étage, salle 3')).toBeInTheDocument();
    await screen.findByTestId('carte');
    // la salle (même position que le site) n'a pas de marqueur ; les numéros suivent la liste
    expect(carteProps.current?.points.map(p => [p.id_lieu, p.numero])).toEqual([[11, 1], [13, 3]]);
  });

  test('sans droits : ni ajout ni changement d\'ordre', () => {
    renderPoints();
    expect(screen.queryByText('Ajouter un point')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Monter/)).not.toBeInTheDocument();
  });

  test('bouton d\'ajout : formulaire du point avec ?parent=', () => {
    renderPoints({ canAdd: true });
    fireEvent.click(screen.getByText('Ajouter un point'));
    expect(mockNavigate).toHaveBeenCalledWith('/ajouter-patrimoine?parent=10');
  });

  test('descendre le 1er point : liste complète envoyée, nouvel ordre appliqué', async () => {
    mockReordonner.mockResolvedValue({ success: true, data: [] });
    const { onReordered } = renderPoints({ canReorder: true });
    fireEvent.click(screen.getAllByLabelText(/Descendre/)[0]);
    await waitFor(() => expect(onReordered).toHaveBeenCalled());
    expect(mockReordonner).toHaveBeenCalledWith(10, [12, 11, 13]);
    expect(onReordered.mock.calls[0][0].map((p: PointVisite) => [p.id_lieu, p.ordre_visite])).toEqual([[12, 1], [11, 2], [13, 3]]);
  });

  test('échec du serveur : message, ordre inchangé', async () => {
    mockReordonner.mockResolvedValue({ success: false, error: 'Interdit' });
    const { onReordered } = renderPoints({ canReorder: true });
    fireEvent.click(screen.getAllByLabelText(/Descendre/)[0]);
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive', description: 'Interdit' })));
    expect(onReordered).not.toHaveBeenCalled();
  });
});

describe('GuideAudio', () => {
  beforeEach(() => vi.clearAllMocks());

  const medias = [
    { id: 1, url: 'https://cdn/guide-fr.mp3', type: 'audio', langue: 'fr' },
    { id: 2, url: 'https://cdn/conte-tz.mp3', type: 'audio', langue: 'tz-tfng' },
    { id: 3, url: 'https://cdn/chant-tz.mp3', type: 'audio', langue: 'tz-tfng' },
  ];
  const sources = (container: HTMLElement) => Array.from(container.querySelectorAll('audio')).map(a => a.getAttribute('src'));

  test('langue de l\'interface par défaut, puis changement de langue', () => {
    const { container } = render(<GuideAudio lieuId={11} medias={medias} lang="fr" canUpload={false} onUploaded={vi.fn()} />);
    expect(sources(container)).toEqual(['https://cdn/guide-fr.mp3']);
    fireEvent.click(screen.getByRole('button', { name: /ⵜⴰⵎⴰⵣⵉⵖⵜ/ }));
    expect(sources(container)).toEqual(['https://cdn/conte-tz.mp3', 'https://cdn/chant-tz.mp3']);
    expect(screen.queryByText('Ajouter un enregistrement')).not.toBeInTheDocument();
  });

  test('aucun enregistrement dans la langue de l\'interface : première langue disponible', () => {
    const { container } = render(<GuideAudio lieuId={11} medias={medias} lang="ar" canUpload={false} onUploaded={vi.fn()} />);
    expect(sources(container)).toEqual(['https://cdn/conte-tz.mp3', 'https://cdn/chant-tz.mp3']);
  });

  test('envoi : fichier transmis avec la langue choisie', async () => {
    const ajoute = { id: 9, url: 'https://cdn/nouveau.m4a', type: 'audio', langue: 'ar' };
    mockUpload.mockResolvedValue({ success: true, data: [ajoute] });
    const onUploaded = vi.fn();
    const { container } = render(<GuideAudio lieuId={11} medias={[]} lang="fr" canUpload onUploaded={onUploaded} />);
    fireEvent.change(screen.getByTestId('langue-envoi'), { target: { value: 'ar' } });
    const file = new File(['abc'], 'conte.m4a', { type: 'audio/mp4' });
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } });
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith([ajoute]));
    expect(mockUpload).toHaveBeenCalledWith(11, [file], 'ar');
  });

  test('fichier reconnu autrement que comme audio : refusé avec un message', async () => {
    mockUpload.mockResolvedValue({ success: true, data: [{ id: 9, url: 'x', type: 'video' }] });
    const onUploaded = vi.fn();
    const { container } = render(<GuideAudio lieuId={11} medias={[]} lang="fr" canUpload onUploaded={onUploaded} />);
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(['a'], 'x.mp4')] } });
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })));
    expect(onUploaded).not.toHaveBeenCalled();
  });
});
