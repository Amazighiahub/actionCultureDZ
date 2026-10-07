import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SocialLinks, { isValidSocialUrl, parseSocialLinks } from '../SocialLinks';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string, vars?: Record<string, string>) =>
      (fallback || key).replace(/\{\{(\w+)\}\}/g, (_, k) => vars?.[k] ?? ''),
  }),
}));

describe('SocialLinks', () => {
  it('affiche le site web et les réseaux renseignés, avec des noms explicites', () => {
    render(
      <SocialLinks
        website="https://atelier.dz"
        links={{ instagram: 'https://www.instagram.com/atelier', facebook: '' }}
        ownerName="Amina B."
      />
    );
    expect(screen.getAllByRole('link')).toHaveLength(2);
    const insta = screen.getByRole('link', { name: 'Instagram de Amina B.' });
    expect(insta).toHaveAttribute('href', 'https://www.instagram.com/atelier');
    expect(insta).toHaveAttribute('target', '_blank');
    expect(insta.getAttribute('rel')).toContain('noopener');
  });

  it('n’affiche rien sans lien, ni un lien dangereux', () => {
    const { container } = render(<SocialLinks links={{ facebook: 'javascript:alert(1)' }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('accepte la forme texte (JSON) venant de la base', () => {
    expect(parseSocialLinks('{"youtube":"https://youtu.be/x"}')).toEqual({ youtube: 'https://youtu.be/x' });
    expect(parseSocialLinks('pas du json')).toEqual({});
  });

  it('valide le domaine du réseau', () => {
    expect(isValidSocialUrl('facebook', 'https://m.facebook.com/page')).toBe(true);
    expect(isValidSocialUrl('facebook', '')).toBe(true);
    expect(isValidSocialUrl('facebook', 'https://facebook.com.pirate.example')).toBe(false);
    expect(isValidSocialUrl('instagram', 'instagram.com/nom')).toBe(false);
  });
});
