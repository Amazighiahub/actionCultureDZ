/**
 * Galerie et menus d'un service : seulement le professionnel du service (ou la modération),
 * seulement des fichiers du site, 10 photos et 3 menus au plus ; un menu PDF est servi par le site.
 */
jest.mock('../../services/user/userFileCleanup', () => ({ deleteUserFiles: jest.fn().mockResolvedValue({}) }));
const { deleteUserFiles } = require('../../services/user/userFileCleanup');
const { lister, ajouter, retirer, fichierMenu, lienMenu } = require('../../services/service/mediasService');

const COMPTE = 'compte-essai';
const image = `https://res.cloudinary.com/${COMPTE}/image/upload/v1/eventculture/salle.jpg`;
const pdf = `https://res.cloudinary.com/${COMPTE}/raw/upload/v1/eventculture/documents/carte`;

function modeles({ nombre = 0, lignes = [], trouve = { url: image } } = {}) {
  return {
    Service: { findByPk: jest.fn().mockResolvedValue({ id: 5, id_user: 12 }) },
    ServiceMedia: {
      count: jest.fn().mockResolvedValue(nombre),
      create: jest.fn(async (d) => ({ id: 30, ...d })),
      findAll: jest.fn().mockResolvedValue(lignes),
      findOne: jest.fn().mockResolvedValue(trouve),
      destroy: jest.fn().mockResolvedValue(1)
    }
  };
}

describe('galerie et menus d’un service', () => {
  const avant = process.env.CLOUDINARY_CLOUD_NAME;
  beforeAll(() => { process.env.CLOUDINARY_CLOUD_NAME = COMPTE; });
  afterAll(() => { process.env.CLOUDINARY_CLOUD_NAME = avant; });

  it('le professionnel ajoute une photo et un menu PDF (avec son nom)', async () => {
    await expect(ajouter(modeles(), 5, { id_user: '12' }, { type: 'photo', url: image })).resolves.toMatchObject({ id: 30, type: 'photo' });
    const m = modeles();
    await ajouter(m, 5, { id_user: 12 }, { type: 'menu', url: pdf, nom: ' Carte <b>d’été</b> ' });
    expect(m.ServiceMedia.create.mock.calls[0][0]).toMatchObject({ id_service: 5, type: 'menu', nom: 'Carte d’été' });
  });

  it('refuse un autre compte, un fichier étranger, un PDF en photo, la 11e photo et le 4e menu', async () => {
    await expect(ajouter(modeles(), 5, { id_user: 99 }, { type: 'photo', url: image })).rejects.toMatchObject({ statusCode: 403 });
    await expect(ajouter(modeles(), 5, { id_user: 12 }, { type: 'photo', url: 'https://exemple.com/a.jpg' })).rejects.toMatchObject({ statusCode: 400 });
    await expect(ajouter(modeles(), 5, { id_user: 12 }, { type: 'photo', url: pdf })).rejects.toMatchObject({ statusCode: 400 });
    await expect(ajouter(modeles({ nombre: 10 }), 5, { id_user: 12 }, { type: 'photo', url: image })).rejects.toMatchObject({ statusCode: 400 });
    await expect(ajouter(modeles({ nombre: 3 }), 5, { id_user: 12 }, { type: 'menu', url: pdf })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('la modération gère tout service', async () => {
    await expect(ajouter(modeles(), 5, { id_user: 1, isModerateur: true }, { type: 'photo', url: image })).resolves.toMatchObject({ id: 30 });
  });

  it('liste : photos à part, menu PDF servi par le site, menu image tel quel', async () => {
    const r = await lister(modeles({ lignes: [
      { id: 1, type: 'photo', url: image }, { id: 2, type: 'menu', url: pdf, nom: 'Carte' }, { id: 3, type: 'menu', url: image, nom: null }
    ] }), 5);
    expect(r.photos).toEqual([{ id: 1, url: image }]);
    expect(r.menus[0]).toEqual({ id: 2, nom: 'Carte', pdf: true, lien: lienMenu(5, 2) });
    expect(r.menus[1]).toMatchObject({ id: 3, pdf: false, url: image });
  });

  it('retrait : fichier effacé ; menu PDF absent : 404', async () => {
    await retirer(modeles(), 5, 30, { id_user: 12 });
    expect(deleteUserFiles).toHaveBeenCalledWith(expect.anything(), [image]);
    await expect(fichierMenu(modeles({ trouve: { url: image } }), 5, 3)).rejects.toMatchObject({ statusCode: 404 });
    await expect(fichierMenu(modeles({ trouve: { url: pdf } }), 5, 2)).resolves.toBe(pdf);
  });

  it('deux envois au même instant : la 11e photo est retirée aussitôt', async () => {
    const m = modeles();
    m.ServiceMedia.count = jest.fn().mockResolvedValueOnce(9).mockResolvedValueOnce(11);
    await expect(ajouter(m, 5, { id_user: 12 }, { type: 'photo', url: image })).rejects.toMatchObject({ statusCode: 400 });
    expect(m.ServiceMedia.destroy).toHaveBeenCalledWith({ where: { id: 30 } });
  });
});
