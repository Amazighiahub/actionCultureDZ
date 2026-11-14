/**
 * « À la une » de l'accueil : seulement de vraies photos du site (lieux, œuvres d'art, artisanat,
 * articles ; ni affiche ni couverture), recadrées ; choix stable dans la journée ; alternance.
 */
const { Op } = require('sequelize');
const { aLaUne, recadrer, melangerDuJour, entrelacer } = require('../../services/aLaUne');

const COMPTE = 'compte-essai';
const img = (n) => `https://res.cloudinary.com/${COMPTE}/image/upload/v1/eventculture/${n}.jpg`;

function modeles() {
  return {
    Lieu: { findAll: jest.fn(async () => [1, 2, 3, 4].map((i) => ({ id_lieu: i, nom: { fr: `Lieu ${i}` }, LieuMedia: [{ url: img(`l${i}`), credit: `Photographe ${i}` }] }))) },
    LieuMedia: {},
    Oeuvre: { findAll: jest.fn(async () => [
      { id_oeuvre: 11, titre: { fr: 'Article' }, id_type_oeuvre: 4, Media: [{ url: img('o11') }] },
      { id_oeuvre: 13, titre: { fr: 'Tapis' }, id_type_oeuvre: 7, Media: [{ url: img('o13') }] },
      { id_oeuvre: 12, titre: { fr: 'Ailleurs' }, id_type_oeuvre: 6, Media: [{ url: 'https://exemple.com/x.jpg' }] }
    ]) },
    Media: {},
    Evenement: { findAll: jest.fn(async () => []) }
  };
}

describe('À la une de l’accueil', () => {
  const avant = process.env.CLOUDINARY_CLOUD_NAME;
  beforeAll(() => { process.env.CLOUDINARY_CLOUD_NAME = COMPTE; });
  afterAll(() => { process.env.CLOUDINARY_CLOUD_NAME = avant; });

  it('recadre l’image Cloudinary au format de l’accueil', () => {
    expect(recadrer(img('a'), 1280)).toContain('/image/upload/c_fill,g_auto,w_1280,h_800,q_auto,f_auto/v1/');
  });

  it('même choix toute la journée, autre choix un autre jour', () => {
    const l = [1, 2, 3, 4, 5, 6, 7, 8];
    const jour = new Date('2026-11-14T08:00:00Z');
    expect(melangerDuJour(l, jour)).toEqual(melangerDuJour(l, new Date('2026-11-14T20:00:00Z')));
    expect(melangerDuJour(l, jour)).not.toEqual(melangerDuJour(l, new Date('2026-11-15T08:00:00Z')));
  });

  it('3 lieux et 2 photos d’œuvres, en alternance ; ni affiche, ni couverture, ni image d’un autre site', async () => {
    const m = modeles();
    const une = await aLaUne(m, 'fr', new Date('2026-11-14T08:00:00Z'));
    expect(une.map((u) => u.type)).toEqual(['lieu', expect.stringMatching(/oeuvre|article/), 'lieu', expect.stringMatching(/oeuvre|article/), 'lieu']);
    // Seulement les types dont l'image est une photo (pas de livre, film, disque)
    expect(m.Oeuvre.findAll.mock.calls[0][0].where.id_type_oeuvre).toEqual({ [Op.in]: [4, 5, 6, 7] });
    expect(m.Evenement.findAll).not.toHaveBeenCalled();
    expect(une.some((u) => u.id === 12)).toBe(false);
    expect(une.find((u) => u.id === 11).type).toBe('article');
    expect(une.find((u) => u.type === 'lieu').credit).toMatch(/Photographe/);
    // Trois largeurs (l'adresse Cloudinary contient elle-même des virgules : on compte les largeurs)
    expect(une[0].srcSet.match(/ \d+w/g)).toEqual([' 768w', ' 1280w', ' 1920w']);
  });

  it('œuvre : la photo principale, sinon la plus récente (une photo remplacée ne revient pas)', async () => {
    const m = modeles();
    m.Lieu.findAll = jest.fn(async () => []);
    m.Oeuvre.findAll = jest.fn(async () => [
      { id_oeuvre: 61, titre: { fr: 'Poème' }, id_type_oeuvre: 4, Media: [{ id_media: 120, url: img('ancienne') }, { id_media: 134, url: img('recadree') }] },
      { id_oeuvre: 62, titre: { fr: 'Tapis' }, id_type_oeuvre: 7, Media: [{ id_media: 200, url: img('principale'), is_Principale: true }, { id_media: 201, url: img('autre') }] }
    ]);
    const une = await aLaUne(m, 'fr');
    expect(une.find((u) => u.id === 61).image).toContain('recadree');
    expect(une.find((u) => u.id === 62).image).toContain('principale');
  });

  it('entrelacer garde tout, dans l’ordre des genres', () => {
    const c = [{ type: 'lieu', id: 1 }, { type: 'lieu', id: 2 }, { type: 'oeuvre', id: 3 }];
    expect(entrelacer(c).map((x) => x.id)).toEqual([1, 3, 2]);
  });
});
