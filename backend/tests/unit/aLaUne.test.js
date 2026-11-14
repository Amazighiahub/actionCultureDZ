/**
 * « À la une » de l'accueil : seulement des images du site, recadrées ; choix stable dans la journée ;
 * alternance des genres ; 2 lieux, 2 œuvres ou articles, 1 événement au plus.
 */
const { aLaUne, recadrer, melangerDuJour, entrelacer } = require('../../services/aLaUne');

const COMPTE = 'compte-essai';
const img = (n) => `https://res.cloudinary.com/${COMPTE}/image/upload/v1/eventculture/${n}.jpg`;

function modeles() {
  return {
    Lieu: { findAll: jest.fn(async () => [1, 2, 3].map((i) => ({ id_lieu: i, nom: { fr: `Lieu ${i}` }, LieuMedia: [{ url: img(`l${i}`), credit: `Photographe ${i}` }] }))) },
    LieuMedia: {},
    Oeuvre: { findAll: jest.fn(async () => [
      { id_oeuvre: 10, titre: { fr: 'Livre' }, id_type_oeuvre: 1, Media: [{ url: img('o10') }] },
      { id_oeuvre: 11, titre: { fr: 'Article' }, id_type_oeuvre: 4, Media: [{ url: img('o11') }] },
      { id_oeuvre: 12, titre: { fr: 'Ailleurs' }, id_type_oeuvre: 6, Media: [{ url: 'https://exemple.com/x.jpg' }] }
    ]) },
    Media: {},
    Evenement: { findAll: jest.fn(async () => [{ id_evenement: 20, nom_evenement: { fr: 'Festival' }, image_url: img('e20') }]) }
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

  it('2 lieux, 2 œuvres ou articles, 1 événement, en alternance ; jamais d’image d’un autre site', async () => {
    const une = await aLaUne(modeles(), 'fr', new Date('2026-11-14T08:00:00Z'));
    expect(une).toHaveLength(5);
    expect(une.map((u) => u.type)).toEqual(['lieu', expect.stringMatching(/oeuvre|article/), 'evenement', 'lieu', expect.stringMatching(/oeuvre|article/)]);
    expect(une.some((u) => u.id === 12)).toBe(false);
    expect(une.find((u) => u.id === 11).type).toBe('article');
    expect(une.find((u) => u.type === 'lieu').credit).toMatch(/Photographe/);
    // Trois largeurs (l'adresse Cloudinary contient elle-même des virgules : on compte les largeurs)
    expect(une[0].srcSet.match(/ \d+w/g)).toEqual([' 768w', ' 1280w', ' 1920w']);
  });

  it('entrelacer garde tout, dans l’ordre des genres', () => {
    const c = [{ type: 'lieu', id: 1 }, { type: 'lieu', id: 2 }, { type: 'oeuvre', id: 3 }];
    expect(entrelacer(c).map((x) => x.id)).toEqual([1, 3, 2]);
  });
});
