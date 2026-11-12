/**
 * Image de partage d'un événement (aperçu Facebook, WhatsApp…) : prise seulement d'un fichier envoyé,
 * retirée sur demande ; l'aperçu la préfère à l'affiche.
 */
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));
const EvenementController = require('../../controllers/evenementController');
const { buildOgHtml } = require('../../routes/ogRoutes')._internal;

const images = (req) => {
  EvenementController._imagesRecues(req);
  return req.body;
};

describe('image de partage', () => {
  it('fichiers affiche et image_partage : les deux adresses Cloudinary', () => {
    const corps = images({ body: { image_partage_url: 'https://ailleurs.example.com/x.jpg' }, files: { affiche: [{ path: 'https://res.cloudinary.com/a/image/upload/v1/aff.jpg' }], image_partage: [{ path: 'https://res.cloudinary.com/a/image/upload/v1/carre.jpg' }] } });
    expect(corps.image_url).toBe('https://res.cloudinary.com/a/image/upload/v1/aff.jpg');
    expect(corps.image_partage_url).toBe('https://res.cloudinary.com/a/image/upload/v1/carre.jpg');
  });

  it('adresse envoyée sans fichier : ignorée ; « supprimer » : null', () => {
    expect(images({ body: { image_partage_url: 'https://ailleurs.example.com/x.jpg' } }).image_partage_url).toBeUndefined();
    expect(images({ body: { supprimer_image_partage: 'true' } }).image_partage_url).toBeNull();
  });

  it('ancien envoi (req.file) : toujours l’affiche', () => {
    expect(images({ body: {}, file: { path: 'https://res.cloudinary.com/a/image/upload/v1/aff.jpg' } }).image_url).toBe('https://res.cloudinary.com/a/image/upload/v1/aff.jpg');
  });

  it('aperçu : image entière sur fond flouté', () => {
    const html = buildOgHtml({ title: 'Essai', image: 'https://res.cloudinary.com/a/image/upload/v1/taladz/carre.jpg', affiche: true, path: '/evenements/1-essai' });
    expect(html).toContain('l_taladz:carre,c_fit,w_1200,h_630');
  });
});
