/** Crédit et droits des photos d'un lieu */
const { champsCredit } = require('../../services/patrimoine/creditPhoto');
const PatrimoineService = require('../../services/patrimoine/patrimoineService');

describe('champsCredit', () => {
  test('texte nettoyé (balises, retours à la ligne), licence connue', () => {
    expect(champsCredit({ credit: '  <b>Amina</b>\nBrahimi ', licence: 'cc_by_sa' })).toEqual({ credit: 'Amina Brahimi', licence: 'cc_by_sa' });
  });
  test('vide → null ; licence inconnue → null ; champ absent → inchangé', () => {
    expect(champsCredit({ credit: '   ', licence: 'n_importe_quoi' })).toEqual({ credit: null, licence: null });
    expect(champsCredit({ licence: 'domaine_public' })).toEqual({ licence: 'domaine_public' });
    expect(champsCredit({})).toEqual({});
  });
  test('150 caractères au plus', () => {
    expect(champsCredit({ credit: 'x'.repeat(300) }).credit).toHaveLength(150);
  });
});

describe('PatrimoineService : photos', () => {
  const service = (modeles) => {
    const s = Object.create(PatrimoineService.prototype);
    s.models = modeles;
    return s;
  };

  test('envoi : crédit et licence sur les photos, pas sur un enregistrement audio', async () => {
    const create = jest.fn(async (d) => d);
    const s = service({ Lieu: { findByPk: jest.fn(async () => ({ id_lieu: 3 })) }, LieuMedia: { create } });
    await s.uploadMedias(3, [
      { path: 'https://res.cloudinary.com/demo/image/upload/a.jpg', mimetype: 'image/jpeg', originalname: 'a.jpg' },
      { path: 'https://res.cloudinary.com/demo/video/upload/b.mp3', mimetype: 'audio/mpeg', originalname: 'b.mp3' }
    ], { credit: 'Wikimedia Commons', licence: 'cc_by_sa' });
    expect(create.mock.calls[0][0]).toMatchObject({ type: 'image', credit: 'Wikimedia Commons', licence: 'cc_by_sa' });
    expect(create.mock.calls[1][0].credit).toBeUndefined();
  });

  test('modification du crédit d\'une photo du lieu ; photo d\'un autre lieu : 404', async () => {
    const media = { id: 7, credit: null, licence: null, update: jest.fn(async function (d) { Object.assign(this, d); }) };
    const findOne = jest.fn(async ({ where }) => (where.id_lieu === 3 ? media : null));
    const s = service({ LieuMedia: { findOne } });
    await expect(s.updateMediaCredit(3, 7, { credit: 'Amina Brahimi', licence: 'tous_droits_reserves' }))
      .resolves.toEqual({ id: 7, credit: 'Amina Brahimi', licence: 'tous_droits_reserves' });
    await expect(s.updateMediaCredit(4, 7, { credit: 'x' })).rejects.toMatchObject({ statusCode: 404 });
  });
});
