/**
 * Rappel « dans 1 heure » : inscrits et confirmés, préférences respectées,
 * rien pour un événement enregistré sans heure (sinon notification à minuit).
 */
const cron = require('../../services/cronService');

describe('checkUpcomingEvents', () => {
  const evt = (id, date) => ({ id_evenement: id, nom_evenement: { fr: `Évt ${id}` }, date_debut: date, update: jest.fn() });

  test('jour sans heure : marqué, aucune notification ; avec heure : inscrits et confirmés', async () => {
    const sansHeure = evt(1, new Date('2026-11-05T00:00:00Z'));
    const avecHeure = evt(2, new Date('2026-11-05T17:30:00Z'));
    const findParticipants = jest.fn(async () => [{ id_user: 7, id_evenement: 2 }]);
    const bulkCreate = jest.fn();
    cron.models = {
      Evenement: { findAll: jest.fn(async () => [sansHeure, avecHeure]) },
      EvenementUser: { findAll: findParticipants },
      User: {},
      Notification: { bulkCreate }
    };
    await cron.checkUpcomingEvents();

    expect(sansHeure.update).toHaveBeenCalledWith({ rappel_derniere_minute: true });
    expect(avecHeure.update).toHaveBeenCalledWith({ rappel_derniere_minute: true });
    const opts = findParticipants.mock.calls[0][0];
    expect(opts.where.id_evenement[Object.getOwnPropertySymbols(opts.where.id_evenement)[0]]).toEqual([2]);
    const statuts = opts.where.statut_participation[Object.getOwnPropertySymbols(opts.where.statut_participation)[0]];
    expect(statuts).toEqual(['inscrit', 'confirme']);
    expect(opts.include[0].where.notifications_evenements).toBe(true);
    expect(bulkCreate).toHaveBeenCalledTimes(1);
    expect(bulkCreate.mock.calls[0][0]).toEqual([expect.objectContaining({ id_user: 7, id_evenement: 2 })]);
  });
});
