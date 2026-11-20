/**
 * Anti-retour (2026-11-20) : niveau requis d'une activité. Le formulaire le demande enfin ; « tous niveaux »
 * = aucun niveau ; une valeur hors liste est refusée proprement (400) au lieu d'une erreur de la base.
 */
const P = require('../../services/programmeService');

const options = (donnees) => (P.ProgrammeService || P).prototype._optionsActivite.call({}, donnees);

test('niveau requis : enregistré, « tous niveaux » vide, valeur inconnue refusée', () => {
  expect(options({ niveau_requis: 'expert' })).toEqual({ niveau_requis: 'expert' });
  expect(options({ niveau_requis: 'tous_niveaux' })).toEqual({ niveau_requis: null });
  expect(options({})).toEqual({});
  expect(() => options({ niveau_requis: 'champion' })).toThrow(expect.objectContaining({ statusCode: 400 }));
});
