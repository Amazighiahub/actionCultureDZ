/**
 * Favoris : seuls les contenus publiés peuvent être mis en favori et affichés, avec leurs champs
 * publics (avant : un brouillon était renvoyé en entier à partir de son numéro).
 */
const FavoriService = require('../../services/favoriService');

const creer = (findOne) => {
  const modele = () => ({ findOne });
  const models = {
    Oeuvre: modele(), Evenement: modele(), Lieu: modele(), Artisanat: modele(),
    TypeOeuvre: {}, Media: {}, TypeEvenement: {}, Commune: {}, Daira: {}, Wilaya: {}, LieuMedia: {}, Materiau: {}, Technique: {}
  };
  const s = Object.create(FavoriService.prototype);
  s.models = models;
  s.logger = { error: jest.fn() };
  s.repository = { findOrCreateFavori: jest.fn().mockResolvedValue([{ id_favori: 1 }, true]) };
  return s;
};

describe('favoris et contenus non publiés', () => {
  test('chaque type ne cherche que le contenu visible du public, sans colonnes internes', async () => {
    const findOne = jest.fn().mockResolvedValue(null);
    const s = creer(findOne);
    for (const type of ['oeuvre', 'evenement', 'lieu', 'artisanat']) await s._getEntiteDetails(type, 5);
    const [oeuvre, evenement, lieu, artisanat] = findOne.mock.calls.map((c) => c[0]);
    expect(oeuvre.where).toEqual({ id_oeuvre: 5, statut: 'publie' });
    expect(oeuvre.attributes).not.toContain('raison_rejet');
    const statut = evenement.where.statut;
    expect(statut[Object.getOwnPropertySymbols(statut)[0]]).toEqual(['brouillon', 'en_attente']);
    expect(evenement.attributes).not.toContain('contact_telephone');
    expect(lieu.where).toEqual({ id_lieu: 5, statut: 'publie' });
    expect(artisanat.include[0]).toMatchObject({ required: true, where: { statut: 'publie' } });
  });

  test('un brouillon ne peut pas être ajouté en favori', async () => {
    const s = creer(jest.fn().mockResolvedValue(null));
    expect(await s.addFavori(3, 'oeuvre', 29)).toEqual({ error: 'entityNotFound' });
    expect(s.repository.findOrCreateFavori).not.toHaveBeenCalled();
  });

  test('un contenu publié est ajouté', async () => {
    const s = creer(jest.fn().mockResolvedValue({ id_oeuvre: 2 }));
    const r = await s.addFavori(3, 'oeuvre', 2);
    expect(r.favori).toEqual({ id_favori: 1 });
    expect(r.entite).toEqual({ id_oeuvre: 2 });
  });
});
