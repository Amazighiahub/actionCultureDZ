/** Adresse lisible d'un événement (même règle que le site) */
const { evenementPath } = require('../../utils/slug');

describe('evenementPath', () => {
  it('numéro puis nom français, sans accents', () => {
    expect(evenementPath(1, { fr: 'Salon de la poterie traditionnelle d’Aït Smaïl', ar: 'صالون' }))
      .toBe('/evenements/1-salon-de-la-poterie-traditionnelle-d-ait-smail');
  });
  it('nom enregistré en JSON texte, ou absent', () => {
    expect(evenementPath(2, '{"fr":"Festival du film"}')).toBe('/evenements/2-festival-du-film');
    expect(evenementPath(3, null)).toBe('/evenements/3');
  });
});
