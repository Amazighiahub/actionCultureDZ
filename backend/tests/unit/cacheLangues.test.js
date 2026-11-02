/**
 * Listes en cache : un visiteur en arabe reçoit l'arabe aussi après le 1er appel
 * (le cache gardait un DTO aplati en français).
 */
const EvenementDTO = require('../../dto/evenement/evenementDTO');
const { entitesBrutes } = require('../../utils/entitesBrutes');

const entite = {
  get: () => ({
    id_evenement: 1,
    nom_evenement: { fr: 'Salon', ar: 'صالون' },
    description: { fr: 'Texte', ar: 'نص' },
    date_debut: new Date('2026-12-22T00:00:00Z')
  })
};
// Même trajet que Redis : écriture puis relecture en JSON
const parRedis = (v) => JSON.parse(JSON.stringify(v));

describe('entitesBrutes', () => {
  test('toutes les langues survivent au passage par le cache', () => {
    const relu = parRedis(entitesBrutes([entite]));
    const [dto] = EvenementDTO.fromEntities(relu);
    expect(dto.toCardJSON('ar').nom_evenement).toBe('صالون');
    expect(dto.toCardJSON('fr').nom_evenement).toBe('Salon');
  });

  test('objet déjà simple ou liste vide : inchangé', () => {
    expect(entitesBrutes([{ a: 1 }])).toEqual([{ a: 1 }]);
    expect(entitesBrutes(undefined)).toEqual([]);
  });
});
