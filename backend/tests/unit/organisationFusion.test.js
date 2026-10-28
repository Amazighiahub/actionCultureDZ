/**
 * Doublons d'organisations : noms ressemblants et fusion (règles de regroupement).
 */
const { ressemble } = require('../../services/organisations/nomsRessemblants');
const { completer, plusFort, RANGS_MEMBRE } = require('../../services/organisations/fusionOrganisations');

describe('Noms ressemblants', () => {
  test.each([
    ['Santa Cruz', 'Edition Santa Cruz'],
    ['Éditions Santa-Cruz', 'santa cruz'],
    ['Association Culturelle Adrar n Fad (ACAF)', 'Association culturele Adrar N Fad Ait Smail'],
    ['Casbah Éditions', 'Éditions Casbah'],
    ['Éditions Barzakh', 'Editions Barzak'],
    [{ fr: 'Éditions Chihab', ar: 'منشورات شهاب' }, { ar: 'شهاب' }],
  ])('« %s » ressemble à « %s »', (a, b) => {
    expect(ressemble(a, b)).toBe(true);
  });

  test.each([
    ['Éditions Barzakh', 'Éditions Chihab'],
    ['Association Agir Villages Aurès', 'Association Culturelle Adrar n Fad'],
    ['Édition Seuil', 'ENAG'],
    ['Éditions', 'Association culturelle'],
  ])('« %s » ne ressemble pas à « %s »', (a, b) => {
    expect(ressemble(a, b)).toBe(false);
  });
});

describe('Fusion : regroupement des informations', () => {
  test('les langues manquantes sont ajoutées, rien n’est écrasé', () => {
    expect(completer({ fr: 'Santa Cruz', ar: '' }, { fr: 'Edition Santa Cruz', ar: 'سانتا كروز' }))
      .toEqual({ fr: 'Santa Cruz', ar: 'سانتا كروز' });
  });

  test('texte enregistré en JSON : lu comme un objet', () => {
    expect(completer('{"fr":"A"}', '{"en":"B"}')).toEqual({ fr: 'A', en: 'B' });
  });

  test('double appartenance : le rôle le plus fort est gardé', () => {
    expect(plusFort(RANGS_MEMBRE, 'membre', 'responsable')).toBe('responsable');
    expect(plusFort(RANGS_MEMBRE, 'directeur', 'responsable')).toBe('directeur');
  });
});
