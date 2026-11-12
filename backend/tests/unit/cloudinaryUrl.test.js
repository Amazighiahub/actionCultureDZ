/**
 * Lecture des URL Cloudinary et suppression par URL (audit V11 COD-B15/16).
 * Forme d'une URL de livraison (cloudinary.url() du SDK) :
 *   https://res.cloudinary.com/<compte>/<image|video|raw>/upload/[transformations/][vNNN/]<public_id>[.format]
 * Image / vidéo : l'extension est le format de livraison (hors public_id).
 * Raw (PDF, DOCX…) : l'extension éventuelle fait partie du public_id.
 */
const mockDestroy = jest.fn(async () => ({ result: 'ok' }));
jest.mock('cloudinary', () => ({
  v2: { config: jest.fn(), uploader: { destroy: (...args) => mockDestroy(...args) } }
}));

const { extractPublicId, lireUrlCloudinary, supprimerParUrl } = require('../../services/cloudinaryService');

const CLOUD = 'https://res.cloudinary.com/demo';

describe('extractPublicId / lireUrlCloudinary', () => {
  test.each([
    // Images : version, dossiers, extension retirée
    [`${CLOUD}/image/upload/v1712345678/eventculture/images/img-affiche-1712345678-a1b2c3d4e5f6.jpg`,
      'image', 'eventculture/images/img-affiche-1712345678-a1b2c3d4e5f6'],
    [`${CLOUD}/image/upload/v1712345678/eventculture/profiles/img-photo-1-abc.webp`,
      'image', 'eventculture/profiles/img-photo-1-abc'],
    // Image transformée, avec et sans version
    [`${CLOUD}/image/upload/c_fill,w_300,h_200/q_auto/v1712345678/eventculture/oeuvres/images/img-x.webp`,
      'image', 'eventculture/oeuvres/images/img-x'],
    [`${CLOUD}/image/upload/c_fill,w_300/eventculture/images/photo.jpg`, 'image', 'eventculture/images/photo'],
    // Sans version ni dossier ; nom à plusieurs points : seul le format final est retiré
    [`${CLOUD}/image/upload/p.jpg`, 'image', 'p'],
    [`${CLOUD}/image/upload/v1/eventculture/images/photo.final.jpg`, 'image', 'eventculture/images/photo.final'],
    // Paramètre de requête ajouté par le SDK
    [`${CLOUD}/image/upload/v1/eventculture/images/a.jpg?_a=BAMAK+`, 'image', 'eventculture/images/a'],
    // Audio : resource_type video
    [`${CLOUD}/video/upload/v1712345678/eventculture/audios/aud-chant-1712345678-abc.mp3`,
      'video', 'eventculture/audios/aud-chant-1712345678-abc'],
    // Raw : l'extension reste dans le public_id
    [`${CLOUD}/raw/upload/v1712345678/eventculture/documents/programme-festival.pdf`,
      'raw', 'eventculture/documents/programme-festival.pdf'],
    [`${CLOUD}/raw/upload/eventculture/documents/guide.docx`, 'raw', 'eventculture/documents/guide.docx'],
    [`${CLOUD}/raw/upload/fl_attachment/v1/eventculture/documents/guide.docx`, 'raw', 'eventculture/documents/guide.docx'],
    // Raw envoyé par le site (public_id donné sans extension par buildPublicId)
    [`${CLOUD}/raw/upload/v1712345678/eventculture/documents/doc-programme-1712345678-a1b2c3d4e5f6`,
      'raw', 'eventculture/documents/doc-programme-1712345678-a1b2c3d4e5f6'],
    // Caractères encodés
    [`${CLOUD}/raw/upload/v1/eventculture/documents/Programme%20complet.pdf`,
      'raw', 'eventculture/documents/Programme complet.pdf']
  ])('%s', (url, resourceType, publicId) => {
    expect(extractPublicId(url)).toBe(publicId);
    expect(lireUrlCloudinary(url)).toEqual({ resourceType, publicId });
  });

  test.each([
    [null], [''], ['/uploads/a.jpg'], ['https://example.com/image/upload/v1/a.jpg'],
    ['https://evil.tld/?res.cloudinary.com/demo/image/upload/v1/a.jpg'], [`${CLOUD}/image/fetch/a.jpg`]
  ])('pas une URL Cloudinary exploitable : %s', (url) => {
    expect(extractPublicId(url)).toBeNull();
  });
});

describe('supprimerParUrl', () => {
  beforeEach(() => mockDestroy.mockClear());

  test('PDF raw : public_id avec extension, resource_type raw', async () => {
    await expect(supprimerParUrl(`${CLOUD}/raw/upload/v1712345678/eventculture/documents/programme.pdf`)).resolves.toBe(true);
    expect(mockDestroy).toHaveBeenCalledWith('eventculture/documents/programme.pdf', { resource_type: 'raw' });
  });

  test('image transformée : public_id sans transformation ni extension', async () => {
    await supprimerParUrl(`${CLOUD}/image/upload/c_fill,w_300/v1/eventculture/images/a.jpg`);
    expect(mockDestroy).toHaveBeenCalledWith('eventculture/images/a', { resource_type: 'image' });
  });

  test('public_id connu (métadonnées) prioritaire ; type lu dans l’URL', async () => {
    await supprimerParUrl(`${CLOUD}/video/upload/v1/eventculture/videos/b.mp4`, { publicId: 'eventculture/videos/vid-b', resourceType: 'image' });
    expect(mockDestroy).toHaveBeenCalledWith('eventculture/videos/vid-b', { resource_type: 'video' });
  });

  test('URL hors Cloudinary : rien n’est supprimé', async () => {
    await expect(supprimerParUrl('https://example.com/raw/upload/v1/a.pdf')).resolves.toBe(false);
    await expect(supprimerParUrl('https://evil.tld/?res.cloudinary.com', { publicId: 'eventculture/x' })).resolves.toBe(false);
    await expect(supprimerParUrl(null)).resolves.toBe(false);
    expect(mockDestroy).not.toHaveBeenCalled();
  });
});
