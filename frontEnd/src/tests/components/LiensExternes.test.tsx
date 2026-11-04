/**
 * Liens du portfolio : de simples liens vers le site d'origine, jamais de lecteur vidéo intégré.
 */
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ListeLiens, typeDepuisUrl, cheminCible, type LienExterne } from '@/components/shared/LiensExternes';

vi.mock('react-i18next', async (original) => ({
  ...(await original<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (_: string, d?: string) => d || _, i18n: { language: 'fr' } }),
}));

const afficher = (liens: LienExterne[], avecCible = false) => render(<MemoryRouter><ListeLiens liens={liens} avecCible={avecCible} /></MemoryRouter>);

describe('liens', () => {
  test('YouTube : un lien qui ouvre le site, sans lecteur', () => {
    const { container } = afficher([{ id_lien: 1, type_lien: 'youtube', url: 'https://youtu.be/abc', titre: 'Mon concert' }]);
    const lien = screen.getByRole('link', { name: /Mon concert/ });
    expect(lien).toHaveAttribute('href', 'https://youtu.be/abc');
    expect(lien).toHaveAttribute('target', '_blank');
    expect(lien.getAttribute('rel')).toContain('nofollow');
    expect(container.querySelector('iframe, video')).toBeNull();
  });

  test('sans titre : le nom du site', () => {
    afficher([{ id_lien: 1, type_lien: 'presse', url: 'https://www.exemple.dz/article' }]);
    expect(screen.getByRole('link', { name: /exemple\.dz/ })).toBeInTheDocument();
  });

  test('adresse dangereuse : rien n’est affiché', () => {
    afficher([{ id_lien: 1, type_lien: 'presse', url: 'javascript:alert(1)', titre: 'Piège' }]);
    expect(screen.queryByText('Piège')).not.toBeInTheDocument();
  });

  test('sur le portfolio : le contenu rattaché est indiqué', () => {
    afficher([{ id_lien: 1, type_lien: 'presse', url: 'https://a.dz/x', titre: 'Article', cible: { type: 'oeuvre', id: 3, titre: 'Un livre' } }], true);
    expect(screen.getByRole('link', { name: 'Un livre' })).toHaveAttribute('href', '/oeuvres/3');
  });

  test.each([
    ['https://youtu.be/a', 'youtube'], ['https://www.tiktok.com/@a', 'tiktok'], ['https://instagram.com/a', 'instagram'],
    ['https://fb.watch/a', 'facebook'], ['https://journal.dz/a', 'presse'], ['pas un lien', null],
  ])('type de %s', (url, type) => {
    expect(typeDepuisUrl(url)).toBe(type);
  });

  test('chemins des contenus', () => {
    expect(cheminCible({ type: 'artisanat', id: 3, titre: 'x' })).toBe('/artisanat/3');
    expect(cheminCible({ type: 'article', id: 4, titre: 'x' })).toBe('/articles/4');
  });
});
