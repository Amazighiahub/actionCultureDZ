/**
 * Photos d'un artisanat : enregistrées comme médias de l'œuvre parente (elles étaient envoyées
 * sur Cloudinary mais jamais enregistrées), et seulement par le propriétaire ou l'administration.
 */
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));
const ArtisanatService = require('../../services/artisanat/artisanatService');
const OeuvreService = require('../../services/oeuvre/oeuvreService');

describe('ArtisanatService.verifierProprietaire', () => {
  const svc = Object.create(ArtisanatService.prototype);
  svc.repository = { findById: jest.fn().mockResolvedValue({ id_artisanat: 5, id_oeuvre: 70, Oeuvre: { saisi_par: 37 } }) };

  it('le propriétaire et l’administration passent', async () => {
    await expect(svc.verifierProprietaire(5, 37)).resolves.toMatchObject({ id_oeuvre: 70 });
    await expect(svc.verifierProprietaire(5, 1, true)).resolves.toMatchObject({ id_oeuvre: 70 });
  });

  it('un autre compte est refusé', async () => {
    await expect(svc.verifierProprietaire(5, 12)).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('OeuvreService.enregistrerMedias', () => {
  it('crée un média par fichier, rattaché à l’œuvre', async () => {
    const svc = Object.create(OeuvreService.prototype);
    svc.models = { Media: { create: jest.fn(async (m) => m) } };
    svc.cache = { invalidate: jest.fn() };
    const medias = await svc.enregistrerMedias(70, [
      { path: 'https://res.cloudinary.com/x/cruche.jpg', mimetype: 'image/jpeg', size: 1200, originalname: 'cruche.jpg', filename: 'x/cruche' }
    ]);
    expect(medias).toHaveLength(1);
    expect(svc.models.Media.create).toHaveBeenCalledWith(expect.objectContaining({
      id_oeuvre: 70, type_media: 'image', url: 'https://res.cloudinary.com/x/cruche.jpg', visible_public: true
    }));
  });
});
