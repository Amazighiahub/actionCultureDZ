import { describe, it, expect } from 'vitest';
import { optimizeImageUrl, getAssetUrl } from '../assetUrl';

const IMG = 'https://res.cloudinary.com/demo/image/upload/v1712345678/taladz/photo.jpg';

describe('optimizeImageUrl', () => {
  it('ajoute format et qualité automatiques aux images Cloudinary', () => {
    expect(optimizeImageUrl(IMG)).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1712345678/taladz/photo.jpg'
    );
  });

  it('limite la largeur quand elle est donnée', () => {
    expect(optimizeImageUrl(IMG, 640)).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_640/v1712345678/taladz/photo.jpg'
    );
  });

  it('ne touche pas une URL déjà transformée', () => {
    const transformed = 'https://res.cloudinary.com/demo/image/upload/c_fill,w_300/v1/photo.jpg';
    expect(optimizeImageUrl(transformed, 640)).toBe(transformed);
  });

  it('ne touche ni les vidéos ni les autres domaines', () => {
    const video = 'https://res.cloudinary.com/demo/video/upload/v1/clip.mp4';
    expect(optimizeImageUrl(video, 640)).toBe(video);
    expect(optimizeImageUrl('https://taladz.com/uploads/a.jpg', 640)).toBe('https://taladz.com/uploads/a.jpg');
  });

  it('getAssetUrl applique l’optimisation aux URL Cloudinary', () => {
    expect(getAssetUrl(IMG, { width: 400 })).toContain('/upload/f_auto,q_auto,c_limit,w_400/');
    expect(getAssetUrl(null)).toBe('');
  });
});

describe('fichiers non optimisés', () => {
  it('laisse les PDF, SVG et ICO intacts', () => {
    const pdf = 'https://res.cloudinary.com/demo/image/upload/v1/docs/rapport.pdf';
    expect(optimizeImageUrl(pdf, 640)).toBe(pdf);
    expect(optimizeImageUrl('https://res.cloudinary.com/demo/image/upload/v1/logo.svg')).toBe('https://res.cloudinary.com/demo/image/upload/v1/logo.svg');
  });
});
