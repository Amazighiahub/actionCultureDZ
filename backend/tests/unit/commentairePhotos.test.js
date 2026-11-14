/**
 * Photos d'avis sur un service : 3 au plus, seulement des images mises en ligne par le site, accord
 * obligatoire ; publiées seulement après validation ; un refus efface le fichier et prévient l'auteur.
 */
jest.mock('../../services/cloudinaryService', () => ({ supprimerParUrl: jest.fn().mockResolvedValue(true) }));
jest.mock('../../services/quotaEmail', () => ({ premiereFoisPendant: jest.fn().mockResolvedValue(true) }));
const cloudinary = require('../../services/cloudinaryService');
const { verifierPhotos, attacher, decider, MAX_PHOTOS_AVIS } = require('../../services/commentairePhotos');

const COMPTE = 'compte-essai';
const image = (n) => `https://res.cloudinary.com/${COMPTE}/image/upload/v1/eventculture/avis-${n}.jpg`;

describe('photos d’avis sur un service', () => {
  const avant = process.env.CLOUDINARY_CLOUD_NAME;
  beforeAll(() => { process.env.CLOUDINARY_CLOUD_NAME = COMPTE; });
  afterAll(() => { process.env.CLOUDINARY_CLOUD_NAME = avant; });

  it('accepte jusqu’à 3 photos du site avec l’accord', () => {
    expect(verifierPhotos([image(1), image(2), image(3)], true)).toHaveLength(3);
    expect(verifierPhotos(undefined, false)).toEqual([]);
    expect(MAX_PHOTOS_AVIS).toBe(3);
  });

  it('refuse une 4e photo, une adresse étrangère ou détournée, un doublon, l’absence d’accord', () => {
    expect(() => verifierPhotos([image(1), image(2), image(3), image(4)], true)).toThrow(/Trois photos/);
    expect(() => verifierPhotos(['https://exemple.com/a.jpg'], true)).toThrow();
    expect(() => verifierPhotos([`https://res.cloudinary.com/${COMPTE}/image/upload/../../autre-compte/x.jpg`], true)).toThrow();
    expect(() => verifierPhotos([image(1), image(1)], true)).toThrow(/deux fois/);
    expect(() => verifierPhotos([image(1)], false)).toThrow(/droit de publier/);
  });

  it('les photos jointes attendent la validation', async () => {
    const bulkCreate = jest.fn(async (l) => l);
    const m = { CommentairePhoto: { bulkCreate }, User: {} };
    await attacher(m, 7, 3, [image(1)], null);
    expect(bulkCreate.mock.calls[0][0][0]).toMatchObject({ id_commentaire: 7, id_user: 3, statut: 'en_attente' });
    expect(bulkCreate.mock.calls[0][0][0].accord_droits_le).toBeInstanceOf(Date);
  });

  it('refus : motif obligatoire, fichier effacé, auteur prévenu ; déjà examinée : 409', async () => {
    const photo = { id_photo: 9, url: image(1), id_user: 3, statut: 'en_attente', Avis: { id_service: 5 } };
    const sendToUser = jest.fn();
    const m = (n = 1) => ({ CommentairePhoto: { findByPk: jest.fn().mockResolvedValue(photo), update: jest.fn().mockResolvedValue([n]) }, Commentaire: {} });
    await expect(decider(m(), { sendToUser }, 9, { id_user: 1 }, 'rejete', '')).rejects.toMatchObject({ statusCode: 400 });
    await decider(m(), { sendToUser }, 9, { id_user: 1 }, 'rejete', 'Personne reconnaissable');
    expect(cloudinary.supprimerParUrl).toHaveBeenCalledWith(image(1));
    expect(sendToUser).toHaveBeenCalledWith(3, expect.objectContaining({ url_action: '/services/5' }));
    await expect(decider(m(0), { sendToUser }, 9, { id_user: 1 }, 'publie')).rejects.toMatchObject({ statusCode: 409 });
  });
});
