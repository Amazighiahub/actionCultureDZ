import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GalerieService, MenusService } from '../GalerieService';

vi.mock('@/helpers/assetUrl', () => ({ getAssetUrl: (u: string) => u }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, d?: unknown, o?: Record<string, unknown>) => {
    const s = typeof d === 'string' ? d : _k;
    return o ? s.replace(/\{\{(\w+)\}\}/g, (_, n) => String(o[n])) : s;
  }, i18n: { language: 'fr' } }),
}));

const img = (n: string) => `https://res.cloudinary.com/demo/image/upload/v1/eventculture/${n}.jpg`;

describe('galerie d’un service', () => {
  it('photo principale d’abord, puis la galerie ; agrandie au toucher avec suivante', () => {
    render(<GalerieService nom="Gîte des oliviers" photoPrincipale={img('facade')}
      galerie={[{ id: 1, url: img('chambre') }, { id: 2, url: img('vue') }]} sansPhoto={<span>aucune</span>} />);
    expect(screen.getByAltText('Gîte des oliviers').getAttribute('src')).toContain('facade');
    expect(screen.getAllByRole('button', { name: /Agrandir la photo/ })).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Agrandir la photo 3 sur 3' }));
    expect(screen.getByText('3 / 3')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(screen.getByText('1 / 3')).toBeTruthy();
  });

  it('sans aucune photo : l’icône du service', () => {
    render(<GalerieService nom="Atelier" galerie={[]} sansPhoto={<span>aucune</span>} />);
    expect(screen.getByText('aucune')).toBeTruthy();
  });
});

describe('menus d’un service', () => {
  it('PDF servi par le site, image agrandie, nom par défaut', () => {
    render(<MenusService menus={[
      { id: 4, nom: 'Carte d’été', pdf: true, lien: '/api/services/5/menus/4/menu.pdf' },
      { id: 5, nom: null as unknown as string, pdf: false, url: img('menu') }
    ]} />);
    expect(screen.getByText('Carte d’été').closest('a')?.getAttribute('href')).toContain('/api/services/5/menus/4/menu.pdf');
    expect(screen.getByText('Menu 2')).toBeTruthy();
  });

  it('aucun menu : rien', () => {
    const { container } = render(<MenusService menus={[]} />);
    expect(container.innerHTML).toBe('');
  });
});
