import { describe, it, expect } from 'vitest';
import { adresseImage, couperLignes, FORMATS } from '../ImagesReseaux';

describe('images pour les réseaux', () => {
  it('formats Instagram et Facebook', () => {
    expect(FORMATS.carre).toEqual({ largeur: 1080, hauteur: 1080 });
    expect(FORMATS.story).toEqual({ largeur: 1080, hauteur: 1920 });
    expect(FORMATS.facebook).toEqual({ largeur: 1200, hauteur: 630 });
  });
  it('photo Cloudinary réduite en JPEG, sauf si elle est déjà transformée', () => {
    expect(adresseImage('https://res.cloudinary.com/tala/image/upload/v1/a.png'))
      .toBe('https://res.cloudinary.com/tala/image/upload/c_limit,w_1600,h_1600,f_jpg,q_auto/v1/a.png');
    expect(adresseImage('https://res.cloudinary.com/tala/image/upload/w_300/a.png')).toBe('https://res.cloudinary.com/tala/image/upload/w_300/a.png');
    expect(adresseImage('/uploads/a.jpg')).toBe('/uploads/a.jpg');
    expect(adresseImage(undefined)).toBeUndefined();
  });
  it('titre trop long coupé avec « … »', () => {
    const ctx = { measureText: (s: string) => ({ width: s.length * 10 }) } as unknown as CanvasRenderingContext2D;
    expect(couperLignes(ctx, 'un deux trois', 200, 2)).toEqual(['un deux trois']);
    const l = couperLignes(ctx, 'aaaa bbbb cccc dddd eeee ffff', 100, 2);
    expect(l).toHaveLength(2);
    expect(l[1].endsWith('…')).toBe(true);
  });
});

import { texteLegende } from '../ImagesReseaux';
describe('texte de la publication', () => {
  it('titre, auteur, résumé et lien vers la page', () => {
    const txt = texteLegende({ titre: 'Les Contes', sousTitre: 'Radia Exemple' }, 'https://taladz.com/oeuvres/5-les-contes', 'Un   recueil\nde contes.');
    expect(txt).toBe('Les Contes — Radia Exemple\n\nUn recueil de contes.\n\n👉 https://taladz.com/oeuvres/5-les-contes\n\n#TalaDZ #CultureAlgérienne');
  });
  it('résumé long coupé à un mot entier', () => {
    const txt = texteLegende({ titre: 'T' }, 'https://taladz.com/x', 'mot '.repeat(200));
    const resume = txt.split('\n\n')[1];
    expect(resume.length).toBeLessThanOrEqual(401);
    expect(resume.endsWith('mot…')).toBe(true);
  });
});
