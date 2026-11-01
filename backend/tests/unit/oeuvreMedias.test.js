/**
 * Médias d'une œuvre : retrait (fichier Cloudinary compris) et ordre d'affichage, par l'auteur ou
 * l'administration (avant : méthodes absentes, erreur 500).
 */
jest.mock('../../utils/redisClient', () => ({ getClient: () => null, isReady: () => false }));
jest.mock('../../services/cloudinaryService', () => ({
  deleteAsset: jest.fn().mockResolvedValue({ result: 'ok' }),
  extractPublicId: jest.fn(() => 'eventculture/images/pochette'),
  isCloudinaryUrl: jest.fn(() => true),
  getResourceType: jest.fn(() => 'image')
}));
const cloudinary = require('../../services/cloudinaryService');
const OeuvreService = require('../../services/oeuvre/oeuvreService');

const creer = ({ media = { id_media: 5, url: 'https://res.cloudinary.com/x/image/upload/p.jpg', mime_type: 'image/jpeg', metadata: {}, destroy: jest.fn() }, medias = [] } = {}) => {
  const s = Object.create(OeuvreService.prototype);
  s.repository = { findById: jest.fn().mockResolvedValue({ id_oeuvre: 2, saisi_par: 7 }) };
  s.models = {
    Media: {
      findOne: jest.fn().mockResolvedValue(media),
      findAll: jest.fn().mockResolvedValue(medias),
      update: jest.fn().mockResolvedValue([1])
    }
  };
  s.cache = { invalidate: jest.fn() };
  s.withTransaction = (fn) => fn('transaction');
  s._notFoundError = (id) => Object.assign(new Error(`introuvable ${id}`), { statusCode: 404 });
  s._forbiddenError = (m) => Object.assign(new Error(m), { statusCode: 403 });
  s._validationError = (m) => Object.assign(new Error(m), { statusCode: 400 });
  return s;
};

describe('retirer un média', () => {
  test("l'auteur retire le média et son fichier Cloudinary", async () => {
    const s = creer();
    await s.deleteMedia(2, 5, 7);
    expect(s.models.Media.findOne).toHaveBeenCalledWith({ where: { id_media: 5, id_oeuvre: 2 } });
    expect(cloudinary.deleteAsset).toHaveBeenCalledWith('eventculture/images/pochette', 'image');
  });
  test("un autre compte : 403 ; l'administration : permis", async () => {
    await expect(creer().deleteMedia(2, 5, 9)).rejects.toMatchObject({ statusCode: 403 });
    await expect(creer().deleteMedia(2, 5, 9, true)).resolves.toBe(true);
  });
  test("média d'une autre œuvre : 404", async () => {
    await expect(creer({ media: null }).deleteMedia(2, 5, 7)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('ordre des médias', () => {
  test('positions enregistrées dans l’ordre donné', async () => {
    const s = creer({ medias: [{ id_media: 3 }, { id_media: 5 }] });
    await s.reorderMedias(2, [5, 3], 7);
    expect(s.models.Media.update.mock.calls.map(c => [c[0].ordre, c[1].where.id_media])).toEqual([[0, 5], [1, 3]]);
  });
  test("un média d'une autre œuvre ou une liste invalide : 400", async () => {
    await expect(creer({ medias: [{ id_media: 3 }] }).reorderMedias(2, [5, 3], 7)).rejects.toMatchObject({ statusCode: 400 });
    await expect(creer().reorderMedias(2, [3, 3], 7)).rejects.toMatchObject({ statusCode: 400 });
  });
});
