/**
 * Anti-retour (2026-11-17) : l'organisateur et l'administration réordonnent toutes les œuvres et articles
 * d'un événement (comme pour le retrait) ; un participant, seulement les siens.
 */
const EvenementService = require('../../services/evenement/evenementService');

function service(idOrganisateur = 37) {
  const s = Object.create(EvenementService.prototype);
  s.repository = {
    findById: jest.fn().mockResolvedValue({ id_evenement: 70, id_user: idOrganisateur }),
    reorderOeuvres: jest.fn().mockResolvedValue(),
    getOeuvresOrdered: jest.fn().mockResolvedValue([])
  };
  s._validationError = (m) => new Error(m);
  s._notFoundError = () => new Error('introuvable');
  return s;
}
const liste = [{ id_oeuvre: 58, ordre: 1 }];

describe('Réordonner les œuvres d’un événement', () => {
  test('administration : toutes les œuvres (sans filtre de présentateur)', async () => {
    const s = service();
    await s.reorderOeuvres(70, 75, liste, { isAdmin: true });
    expect(s.repository.reorderOeuvres).toHaveBeenCalledWith(70, null, liste);
    expect(s.repository.getOeuvresOrdered).toHaveBeenCalledWith(70, null);
  });
  test('organisateur : toutes les œuvres', async () => {
    const s = service(37);
    await s.reorderOeuvres(70, 37, liste);
    expect(s.repository.reorderOeuvres).toHaveBeenCalledWith(70, null, liste);
  });
  test('participant : seulement les siennes', async () => {
    const s = service(37);
    await s.reorderOeuvres(70, 12, liste);
    expect(s.repository.reorderOeuvres).toHaveBeenCalledWith(70, 12, liste);
  });
});
