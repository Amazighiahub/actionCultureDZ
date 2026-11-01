/**
 * Annulation d'un événement : tous les inscrits sont prévenus, même ceux qui ont coupé les annonces
 * d'événements (avant : le filtre notifications_evenements les excluait).
 */
const NotificationService = require('../../services/notificationService');

test("annulation : les participants sont cherchés sans filtre sur les annonces d'événements", async () => {
  const findAll = jest.fn().mockResolvedValue([]);
  const s = Object.create(NotificationService.prototype);
  s.models = {
    Evenement: { findByPk: jest.fn().mockResolvedValue({ id_evenement: 4, nom_evenement: { fr: 'Salon' } }) },
    EvenementUser: { findAll },
    User: {}, Lieu: {}, TypeEvenement: {}
  };
  await s.notifierAnnulationEvenement(4, 'Intempéries');
  const include = findAll.mock.calls[0][0].include[0];
  expect(include.as).toBe('User');
  expect(include.where).toBeUndefined();
});
