/**
 * Photos de l'événement : seulement l'organisateur (ou l'administration), seulement une image mise en
 * ligne par le site, 60 au plus ; le retrait efface aussi le fichier. Une photo peut être rangée
 * dans un jour du programme de l'événement (et seulement de cet événement).
 */
jest.mock('../../services/cloudinaryService', () => ({ supprimerParUrl: jest.fn().mockResolvedValue(true) }));
const cloudinary = require('../../services/cloudinaryService');
const { PhotosEvenement, MAX_PHOTOS } = require('../../services/evenement/photosEvenement');

const COMPTE = 'compte-essai';
const image = `https://res.cloudinary.com/${COMPTE}/image/upload/v1/eventculture/photo.jpg`;

function modeles({ evenement = { id_evenement: 4, id_user: 12 }, nombre = 0, supprimes = 1, jour = { id_programme: 7 }, modifies = 1 } = {}) {
  return {
    Evenement: { findByPk: jest.fn().mockResolvedValue(evenement) },
    Programme: { findOne: jest.fn().mockResolvedValue(jour) },
    Media: {
      update: jest.fn().mockResolvedValue([modifies]),
      count: jest.fn().mockResolvedValue(nombre),
      create: jest.fn(async (d) => ({ id_media: 9, ...d })),
      findOne: jest.fn().mockResolvedValue({ url: image }),
      destroy: jest.fn().mockResolvedValue(supprimes)
    }
  };
}

describe('photos de l’événement', () => {
  const avant = process.env.CLOUDINARY_CLOUD_NAME;
  beforeAll(() => { process.env.CLOUDINARY_CLOUD_NAME = COMPTE; });
  afterAll(() => { process.env.CLOUDINARY_CLOUD_NAME = avant; });
  beforeEach(() => cloudinary.supprimerParUrl.mockClear());

  it('l’organisateur ajoute une photo du site, avec légende et crédit nettoyés', async () => {
    const m = modeles();
    const res = await new PhotosEvenement(m).ajouter(4, { id_user: '12' }, { url: image, legende: ' Le <b>concert</b> ', credit: 'Exemple Photo' });
    expect(res).toMatchObject({ id_media: 9, url: image, titre: { fr: 'Le concert' }, credit: 'Exemple Photo' });
    expect(m.Media.create.mock.calls[0][0]).toMatchObject({ id_evenement: 4, type_media: 'image', visible_public: true });
  });

  it('refuse un autre compte, une adresse étrangère et la 61e photo', async () => {
    await expect(new PhotosEvenement(modeles()).ajouter(4, { id_user: 99 }, { url: image })).rejects.toMatchObject({ statusCode: 403 });
    await expect(new PhotosEvenement(modeles()).ajouter(4, { id_user: 12 }, { url: 'https://exemple.com/a.jpg' })).rejects.toMatchObject({ statusCode: 400 });
    await expect(new PhotosEvenement(modeles({ nombre: MAX_PHOTOS })).ajouter(4, { id_user: 12 }, { url: image })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('l’administration peut gérer les photos de tout événement', async () => {
    await expect(new PhotosEvenement(modeles()).ajouter(4, { id_user: 1, isAdmin: true }, { url: image })).resolves.toMatchObject({ id_media: 9 });
  });

  it('le retrait efface aussi le fichier ; photo absente : 404', async () => {
    await new PhotosEvenement(modeles()).retirer(4, 9, { id_user: 12 });
    expect(cloudinary.supprimerParUrl).toHaveBeenCalledWith(image, {});
    await expect(new PhotosEvenement(modeles({ supprimes: 0 })).retirer(4, 9, { id_user: 12 })).rejects.toMatchObject({ statusCode: 404 });
  });

  it('photo d’un jour du programme : seulement un jour de cet événement', async () => {
    const m = modeles();
    await expect(new PhotosEvenement(m).ajouter(4, { id_user: 12 }, { url: image, id_programme: '7' })).resolves.toMatchObject({ id_programme: 7 });
    expect(m.Programme.findOne.mock.calls[0][0].where).toEqual({ id_programme: 7, id_evenement: 4 });
    expect(m.Media.create.mock.calls[0][0]).toMatchObject({ id_programme: 7 });
    // Sans jour : toute l'exposition
    const sans = modeles();
    await new PhotosEvenement(sans).ajouter(4, { id_user: 12 }, { url: image });
    expect(sans.Media.create.mock.calls[0][0].id_programme).toBeNull();
    // Jour d'un autre événement, ou valeur bizarre : refusé
    await expect(new PhotosEvenement(modeles({ jour: null })).ajouter(4, { id_user: 12 }, { url: image, id_programme: 8 })).rejects.toMatchObject({ statusCode: 400 });
    await expect(new PhotosEvenement(modeles()).ajouter(4, { id_user: 12 }, { url: image, id_programme: '1 OR 1' })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('changer le jour d’une photo : organisateur seulement ; photo absente : 404', async () => {
    const m = modeles();
    await expect(new PhotosEvenement(m).changerJour(4, 9, { id_user: 12 }, 7)).resolves.toEqual({ id_media: 9, id_programme: 7 });
    expect(m.Media.update.mock.calls[0]).toEqual([{ id_programme: 7 }, { where: { id_media: 9, id_evenement: 4, type_media: 'image' } }]);
    await expect(new PhotosEvenement(modeles()).changerJour(4, 9, { id_user: 12 }, null)).resolves.toEqual({ id_media: 9, id_programme: null });
    await expect(new PhotosEvenement(modeles()).changerJour(4, 9, { id_user: 99 }, 7)).rejects.toMatchObject({ statusCode: 403 });
    await expect(new PhotosEvenement(modeles({ modifies: 0, nombre: 0 })).changerJour(4, 9, { id_user: 12 }, 7)).rejects.toMatchObject({ statusCode: 404 });
  });
});
