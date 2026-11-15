import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EventGallery from '../EventGallery';
import type { Media } from '@/types/models/media.types';
import type { Programme } from '@/types/models/programme.types';

vi.mock('@/hooks/useFormatDate', () => ({ useFormatDate: () => ({ formatDate: (d: Date) => d.toISOString().slice(0, 10) }) }));
vi.mock('@/hooks/useTranslateData', () => ({ useTranslateData: () => ({ td: (v: unknown) => (typeof v === 'string' ? v : (v as { fr?: string })?.fr || '') }) }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, d?: unknown) => (typeof d === 'string' ? d : _k) }),
  withTranslation: () => (C: unknown) => C,
}));

const photo = (id: number, jour: number | null) =>
  ({ id_media: id, type_media: 'image', url: `https://res.cloudinary.com/demo/image/upload/p${id}.jpg`, id_programme: jour, titre: `Photo ${id}` }) as unknown as Media;
const jour = (id: number, date: string, titre: string, description: string) =>
  ({ id_programme: id, date_programme: date, titre: { fr: titre }, description: { fr: description }, ordre: 0 }) as unknown as Programme;

describe('galerie d’un événement sur plusieurs jours', () => {
  it('rangée par jour (date · titre, description), dans l’ordre des dates, puis les autres photos', () => {
    render(<EventGallery
      medias={[photo(1, 11), photo(2, 10), photo(3, null), photo(4, 11)]}
      programs={[jour(11, '2026-11-13', 'Rencontre', 'Discussion avec l’artiste'), jour(10, '2026-11-12', 'Vernissage', 'Ouverture')]} />);
    const titres = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(titres).toEqual(['2026-11-12 · Vernissage', '2026-11-13 · Rencontre', 'Autres photos']);
    expect(screen.getByText('Discussion avec l’artiste')).toBeTruthy();
  });

  it('aucune photo rangée : la galerie habituelle, sans titres de jour', () => {
    render(<EventGallery medias={[photo(1, null), photo(2, null)]} programs={[jour(10, '2026-11-12', 'Vernissage', '')]} />);
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0);
  });
});
