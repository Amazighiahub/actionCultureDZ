/**
 * Carte retournable partagée par HeroAlbum et HeroFilm (audit V11 COD-15, COD-17)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import HeroAlbum from '../HeroAlbum';
import HeroFilm from '../HeroFilm';
import type { Oeuvre } from '@/types/models/oeuvre.types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_k: string, d?: unknown, o?: Record<string, unknown>) =>
      (typeof d === 'string' ? d.replace('{{count}}', String(o?.count ?? '')) : _k),
  }),
}));
vi.mock('@/hooks/useRTL', () => ({
  useRTL: () => ({
    direction: 'ltr',
    rtlClasses: { start: (n: number) => `start-${n}`, end: (n: number) => `end-${n}`, flexRow: '', marginEnd: (n: number) => `me-${n}` },
  }),
}));
vi.mock('@/hooks/useLocalizedNumber', () => ({
  useLocalizedNumber: () => ({ formatNumber: (n: number) => String(n), formatPrice: (n: number) => `${n} DA` }),
}));

const gt = (v: unknown) => (typeof v === 'string' ? v : '');
const communs = {
  medias: [], mainImage: null, titre: 'Mon œuvre', description: 'Résumé', mainContributors: [{ prenom: 'Amel', nom: 'B' }],
  gt, viewCount: 0, commentsCount: 0, isFavorite: false, favoriteLoading: false, onToggleFavorite: vi.fn(),
  shareButton: null, playableMedia: undefined, handlePlay: vi.fn(), noMediaMsg: false,
};

describe('carte retournable des œuvres', () => {
  it('album : se retourne au clavier, « Agrandir » ouvre la fenêtre sans retourner', () => {
    const oeuvre = { prix: 0, description: 'Au dos', annee_creation: 2020, AlbumMusical: { label: 'Indépendant', duree: 42 } } as unknown as Oeuvre;
    render(<HeroAlbum {...communs} oeuvre={oeuvre} />);

    // Recto : gratuit ; verso : label, durée, année
    expect(screen.getAllByText('Gratuit').length).toBeGreaterThan(0);
    expect(screen.getByText('Label')).toBeInTheDocument();
    expect(screen.getByText('42 min')).toBeInTheDocument();
    expect(screen.getByText('Au dos')).toBeInTheDocument();

    const carte = screen.getAllByRole('button').find(b => b.getAttribute('tabindex') === '0')!;
    expect(screen.getByText('Voir les détails au dos')).toBeInTheDocument();
    fireEvent.keyDown(carte, { key: 'Enter' });
    expect(screen.getByText('Voir la pochette')).toBeInTheDocument();
    fireEvent.keyDown(carte, { key: ' ' });
    expect(screen.getByText('Voir les détails au dos')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Agrandir' }));
    const fenetre = screen.getByRole('dialog');
    expect(within(fenetre).getByText('Aucune pochette disponible')).toBeInTheDocument();
    // Le clic n'a pas retourné la carte, ni le clic dans la fenêtre
    fireEvent.click(within(fenetre).getByRole('button', { name: 'Fermer' }));
    expect(screen.getByText('Voir les détails au dos')).toBeInTheDocument();
  });

  it('film : durée en recto, réalisateur au verso, textes du film', () => {
    const oeuvre = { prix: 500, Film: { duree_minutes: 95, realisateur: 'Lakhdar H.' } } as unknown as Oeuvre;
    render(<HeroFilm {...communs} videoMedia={undefined} oeuvre={oeuvre} />);
    expect(screen.getByText('Lakhdar H.')).toBeInTheDocument();
    expect(screen.getByText('Réalisateur')).toBeInTheDocument();
    expect(screen.getByText('Voir le synopsis au dos')).toBeInTheDocument();
    expect(screen.getByText("Cliquez pour voir l'affiche")).toBeInTheDocument();
    expect(screen.getByText('Aucun synopsis disponible pour ce film.')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button').find(b => b.getAttribute('tabindex') === '0')!);
    expect(screen.getByText("Voir l'affiche")).toBeInTheDocument();
  });
});
