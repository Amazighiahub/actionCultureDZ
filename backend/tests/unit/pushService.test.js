/**
 * Notifications sur le téléphone : seulement vers les services de notification des navigateurs,
 * désactivées sans clés, respect du choix de la personne, appareils disparus retirés.
 */
const mockEnvoi = jest.fn(async () => ({ statusCode: 201 }));
jest.mock('web-push', () => ({ setVapidDetails: jest.fn(), sendNotification: mockEnvoi }));

const push = require('../../services/pushService');

const abonnement = (id, idUser) => ({ id_abonnement: id, id_user: idUser, endpoint: `https://fcm.googleapis.com/fcm/send/${id}`, p256dh: 'p', auth: 'a' });
const modeles = ({ abonnes = [], refus = [] } = {}) => ({
  User: { findAll: jest.fn(async () => refus.map(id_user => ({ id_user, notifications_push: false }))) },
  PushAbonnement: {
    findAll: jest.fn(async ({ where }) => abonnes.filter(a => where.id_user.includes(a.id_user))),
    findOne: jest.fn(async () => null),
    create: jest.fn(async () => ({})),
    destroy: jest.fn(async () => 1),
  },
});

beforeEach(() => {
  mockEnvoi.mockReset();
  mockEnvoi.mockResolvedValue({ statusCode: 201 });
  process.env.VAPID_PUBLIC_KEY = 'publique';
  process.env.VAPID_PRIVATE_KEY = 'privee';
});

describe('adresse d’abonnement', () => {
  it.each([
    'https://fcm.googleapis.com/fcm/send/abc',
    'https://web.push.apple.com/abc',
    'https://updates.push.services.mozilla.com/wpush/v2/abc',
  ])('accepte %s', (url) => expect(push.adresseAutorisee(url)).toBe(true));

  it.each([
    'http://fcm.googleapis.com/abc',
    'https://exemple-pirate.com/abc',
    'https://fcm.googleapis.com.evil.tld/abc',
    'https://localhost/abc',
    'https://169.254.169.254/latest',
    'pas une adresse',
  ])('refuse %s', (url) => expect(push.adresseAutorisee(url)).toBe(false));
});

describe('envoi', () => {
  const notification = { id_user: 7, id_notification: 3, titre: 'Inscription validée', message: 'Bienvenue', url_action: '/evenements/2' };

  it('part vers les appareils de la personne, avec un lien interne', async () => {
    const m = modeles({ abonnes: [abonnement(1, 7), abonnement(2, 99)] });
    expect(await push.pourNotifications(m, [notification])).toBe(1);
    const charge = JSON.parse(mockEnvoi.mock.calls[0][1]);
    expect(charge).toMatchObject({ titre: 'Inscription validée', url: '/evenements/2' });
  });

  it('refuse un lien externe', async () => {
    const m = modeles({ abonnes: [abonnement(1, 7)] });
    await push.pourNotifications(m, [{ ...notification, url_action: 'https://evil.tld' }]);
    expect(JSON.parse(mockEnvoi.mock.calls[0][1]).url).toBe('/notifications');
  });

  it('respecte le choix « pas de notifications »', async () => {
    const m = modeles({ abonnes: [abonnement(1, 7)], refus: [7] });
    expect(await push.pourNotifications(m, [notification])).toBe(0);
    expect(mockEnvoi).not.toHaveBeenCalled();
  });

  it('ne fait rien sans clés', async () => {
    delete process.env.VAPID_PRIVATE_KEY;
    expect(await push.pourNotifications(modeles({ abonnes: [abonnement(1, 7)] }), [notification])).toBe(0);
    expect(mockEnvoi).not.toHaveBeenCalled();
  });

  it('retire un appareil disparu', async () => {
    mockEnvoi.mockRejectedValue(Object.assign(new Error('parti'), { statusCode: 410 }));
    const m = modeles({ abonnes: [abonnement(1, 7)] });
    expect(await push.pourNotifications(m, [notification])).toBe(0);
    expect(m.PushAbonnement.destroy).toHaveBeenCalledWith({ where: { id_abonnement: 1 } });
  });

  it('une panne n’interrompt pas les autres appareils', async () => {
    mockEnvoi.mockRejectedValueOnce(Object.assign(new Error('panne'), { statusCode: 500 }));
    const m = modeles({ abonnes: [abonnement(1, 7), abonnement(2, 7)] });
    expect(await push.pourNotifications(m, [notification])).toBe(1);
  });
});

describe('contenu et choix', () => {
  const notif = (type, extra = {}) => ({ id_user: 7, type_notification: type, titre: 'Rendez-vous', message: 'Point de rencontre : gare, lien https://chat.example.com/x', ...extra });

  it('un message d’organisateur ne montre rien de privé sur l’écran verrouillé', async () => {
    await push.pourNotifications(modeles({ abonnes: [abonnement(1, 7)] }), [notif('message_evenement')]);
    const charge = mockEnvoi.mock.calls[0][1];
    expect(charge).not.toContain('gare');
    expect(charge).not.toContain('chat.example.com');
  });

  it('une annonce suit le choix « Ne plus recevoir ces annonces »', async () => {
    const m = modeles({ abonnes: [abonnement(1, 7)] });
    m.User.findAll = jest.fn(async () => [{ id_user: 7, notifications_push: true, notifications_evenements: false }]);
    expect(await push.pourNotifications(m, [notif('message_admin')])).toBe(0);
    expect(await push.pourNotifications(m, [notif('validation_participation')])).toBe(1);
  });

  it('un rappel ne reste valable qu’une heure, et chaque envoi a un délai', async () => {
    await push.pourNotifications(modeles({ abonnes: [abonnement(1, 7)] }), [notif('rappel_evenement')]);
    expect(mockEnvoi.mock.calls[0][2]).toEqual({ TTL: 3600, timeout: 10000 });
  });

  it('les envois sont mis en file les uns après les autres', async () => {
    const ordre = [];
    mockEnvoi.mockImplementation(async (a) => { ordre.push(a.endpoint.slice(-1)); });
    const m = modeles({ abonnes: [abonnement(1, 7), abonnement(2, 8)] });
    await Promise.all([
      push.pourNotifications(m, [notif('autre')]),
      push.pourNotifications(m, [notif('autre', { id_user: 8 })]),
    ]);
    expect(ordre).toEqual(['1', '2']);
  });
});

describe('abonnement', () => {
  it('garde au plus 5 appareils', async () => {
    const m = modeles();
    m.PushAbonnement.findAll = jest.fn(async () => [7, 6, 5, 4, 3, 2, 1].map(id_abonnement => ({ id_abonnement })));
    await push.abonner(m, 7, { endpoint: 'https://fcm.googleapis.com/x', p256dh: 'p', auth: 'a' });
    expect(m.PushAbonnement.destroy).toHaveBeenCalledWith({ where: { id_abonnement: [2, 1] } });
  });

  it('un retrait ne touche que les appareils de cette personne', async () => {
    const m = modeles();
    await push.desabonner(m, 7, 'https://fcm.googleapis.com/x');
    expect(m.PushAbonnement.destroy).toHaveBeenCalledWith({ where: { id_user: 7, endpoint: 'https://fcm.googleapis.com/x' } });
  });
});
