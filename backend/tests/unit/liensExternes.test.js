/**
 * Liens des professionnels : le type vient du site, seuls ses propres contenus peuvent être rattachés,
 * et seules les adresses http(s) sont acceptées.
 */
const liens = require('../../services/liensExternes');

const fabriquer = ({ oeuvre, contribution = null, evenement = null, nombre = 0, doublon = null, lien = null } = {}) => {
  const create = jest.fn(async (v) => ({ id_lien: 1, ...v }));
  return {
    models: {
      Oeuvre: { findByPk: jest.fn(async () => oeuvre ?? null) },
      OeuvreUser: { findOne: jest.fn(async () => contribution) },
      Evenement: { findOne: jest.fn(async () => evenement) },
      LienExterne: { count: jest.fn(async () => nombre), findOne: jest.fn(async () => doublon), findByPk: jest.fn(async () => lien), create },
    },
    create,
  };
};

describe('type du lien', () => {
  test.each([
    ['https://www.youtube.com/watch?v=abc', 'youtube'],
    ['https://youtu.be/abc', 'youtube'],
    ['https://www.instagram.com/p/abc', 'instagram'],
    ['https://www.tiktok.com/@a/video/1', 'tiktok'],
    ['https://m.facebook.com/a/posts/1', 'facebook'],
    ['https://fb.watch/abc', 'facebook'],
    ['https://www.elwatan-dz.com/article', 'presse'],
    ['https://notyoutube.com/x', 'presse'],
    ['https://youtube.com.pirate.dz/x', 'presse'],
  ])('%s : %s', (url, type) => {
    expect(liens.typeDepuisUrl(url)).toBe(type);
  });
});

describe('adresse', () => {
  test.each(['javascript:alert(1)', 'data:text/html,x', 'ftp://a.dz/x', 'pas un lien', '', 'https://localhost/x', 'https://moi:secret@a.dz/x'])(
    'refusée : %s', (url) => expect(() => liens.urlValide(url)).toThrow());
  test('trop longue : refusée', () => {
    expect(() => liens.urlValide(`https://a.dz/${'x'.repeat(500)}`)).toThrow('trop long');
  });
  test('correcte : acceptée', () => {
    expect(liens.urlValide(' https://a.dz/x ')).toBe('https://a.dz/x');
  });
});

describe('création', () => {
  const YT = 'https://youtu.be/abc';

  test('sans rattachement : sur le portfolio seul, le type est calculé', async () => {
    const { models, create } = fabriquer();
    await liens.creer(models, 7, { url: YT, type_lien: 'presse', id_user: 99 });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ id_user: 7, type_lien: 'youtube', id_oeuvre: null, id_evenement: null }));
  });

  test('sur son œuvre : accepté', async () => {
    const { models, create } = fabriquer({ oeuvre: { id_oeuvre: 3, saisi_par: 7 } });
    await liens.creer(models, 7, { url: YT, id_oeuvre: 3 });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ id_oeuvre: 3 }));
  });

  test('contributeur de l’œuvre : accepté', async () => {
    const { models, create } = fabriquer({ oeuvre: { id_oeuvre: 3, saisi_par: 1 }, contribution: { id_oeuvre: 3 } });
    await liens.creer(models, 7, { url: YT, id_oeuvre: 3 });
    expect(create).toHaveBeenCalled();
  });

  test('œuvre d’une autre personne : refusé', async () => {
    const { models, create } = fabriquer({ oeuvre: { id_oeuvre: 3, saisi_par: 1 } });
    await expect(liens.creer(models, 7, { url: YT, id_oeuvre: 3 })).rejects.toMatchObject({ statusCode: 403 });
    expect(create).not.toHaveBeenCalled();
  });

  test('événement d’une autre personne : refusé', async () => {
    const { models } = fabriquer();
    await expect(liens.creer(models, 7, { url: YT, id_evenement: 5 })).rejects.toMatchObject({ statusCode: 403 });
  });

  test('œuvre et événement à la fois : refusé', async () => {
    const { models } = fabriquer();
    await expect(liens.creer(models, 7, { url: YT, id_oeuvre: 3, id_evenement: 5 })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('limite atteinte et doublon : refusés', async () => {
    await expect(liens.creer(fabriquer({ nombre: liens.MAX_LIENS }).models, 7, { url: YT })).rejects.toMatchObject({ statusCode: 400 });
    await expect(liens.creer(fabriquer({ doublon: { id_lien: 2 } }).models, 7, { url: YT })).rejects.toMatchObject({ statusCode: 409 });
  });

  test('date impossible : refusée', async () => {
    await expect(liens.creer(fabriquer().models, 7, { url: YT, date_publication: '2026-02-31' })).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('modification et retrait', () => {
  test('le lien d’une autre personne reste introuvable', async () => {
    const lien = { id_user: 1, update: jest.fn(), destroy: jest.fn() };
    const { models } = fabriquer({ lien });
    await expect(liens.modifier(models, 9, 7, { url: 'https://a.dz/x' })).rejects.toMatchObject({ statusCode: 404 });
    await expect(liens.supprimer(models, 9, 7, false)).rejects.toMatchObject({ statusCode: 404 });
    expect(lien.destroy).not.toHaveBeenCalled();
  });

  test('un administrateur peut retirer un lien', async () => {
    const lien = { id_user: 1, destroy: jest.fn() };
    await liens.supprimer(fabriquer({ lien }).models, 9, 7, true);
    expect(lien.destroy).toHaveBeenCalled();
  });
});
