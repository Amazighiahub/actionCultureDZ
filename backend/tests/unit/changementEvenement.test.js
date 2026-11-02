/** Date ou lieu d'un événement changés : les inscrits sont prévenus */
const NotificationService = require('../../services/notificationService');

const service = () => {
  const s = Object.create(NotificationService.prototype);
  s.models = {
    Evenement: { findByPk: jest.fn(async () => ({
      id_evenement: 2, nom_evenement: { fr: 'Chantier' }, date_debut: new Date('2026-12-22T15:00:00Z'),
      Lieu: { nom: { fr: 'Ghoufi' }, adresse: 'Batna' }
    })) },
    EvenementUser: { findAll: jest.fn(async () => [{ id_user: 7, User: { id_user: 7, email: 'a@example.com' } }]) },
    Lieu: {}, User: {}
  };
  s._str = (v) => (typeof v === 'object' && v ? v.fr : v);
  s.emailService = { notifierChangementEvenement: jest.fn(async () => [{ email: 'a@example.com', result: { success: true } }]) };
  s.enregistrerNotificationsMultiples = jest.fn();
  return s;
};

describe('notifierChangementEvenement', () => {
  test('date et lieu changés : e-mail et notification, à l\'heure d\'Algérie', async () => {
    const s = service();
    await expect(s.notifierChangementEvenement(2, { date: true, lieu: true })).resolves.toEqual({ notified: 1 });
    const nouveautes = s.emailService.notifierChangementEvenement.mock.calls[0][2];
    expect(nouveautes[0]).toMatch(/22 décembre 2026 à 16:00/);
    expect(nouveautes[1]).toBe('Nouveau lieu : Ghoufi, Batna');
    expect(s.enregistrerNotificationsMultiples.mock.calls[0][0][0]).toMatchObject({
      id_user: 7, type_notification: 'modification_programme', email_envoye: true, url_action: '/evenements/2'
    });
  });

  test('seul le lieu a changé : la date n\'est pas annoncée', async () => {
    const s = service();
    await s.notifierChangementEvenement(2, { date: false, lieu: true });
    expect(s.emailService.notifierChangementEvenement.mock.calls[0][2]).toEqual(['Nouveau lieu : Ghoufi, Batna']);
  });

  test('aucun inscrit : rien n\'est envoyé', async () => {
    const s = service();
    s.models.EvenementUser.findAll = jest.fn(async () => []);
    await expect(s.notifierChangementEvenement(2, { date: true, lieu: false })).resolves.toEqual({ notified: 0 });
    expect(s.emailService.notifierChangementEvenement).not.toHaveBeenCalled();
  });
});
