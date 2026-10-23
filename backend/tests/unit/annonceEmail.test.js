/**
 * Annonce à tous les inscrits (notification + e-mail) : ceux qui ont refusé les e-mails ou les
 * annonces ne reçoivent pas d'e-mail ; l'e-mail a un lien « Ne plus recevoir ces annonces »,
 * un texte échappé, des liens cliquables ; envoi un par un.
 */
const mockSendEmail = jest.fn();
let mockEtat = 'actif';
jest.mock('../../services/emailService', () => ({ sendEmail: (...a) => mockSendEmail(...a), etatEnvoi: () => mockEtat }));
jest.mock('../../services/smsService', () => ({ sendSMS: jest.fn() }));
jest.mock('../../services/whatsappService', () => ({ sendWhatsApp: jest.fn() }));

process.env.JWT_SECRET = process.env.JWT_SECRET || 'secret-test';
const NotificationService = require('../../services/notificationService');
const { verifyUnsubscribe } = require('../../utils/newsletterUnsubscribe');

describe('Annonce par e-mail', () => {
  let service;
  beforeEach(() => {
    mockSendEmail.mockReset().mockResolvedValue({ success: true });
    service = new NotificationService({
      User: { count: jest.fn().mockResolvedValue(5), findAll: jest.fn() },
      Notification: { bulkCreate: jest.fn() },
      AuditLog: { create: jest.fn() }
    });
  });

  it('e-mail seulement à ceux qui acceptent e-mails et annonces ; notification pour tous', async () => {
    service.models.User.findAll.mockResolvedValueOnce([
      { id_user: 1, email: 'a@x.dz', preferences_notification: null },
      { id_user: 2, email: 'b@x.dz', preferences_notification: null, notifications_evenements: false },
      { id_user: 3, email: 'c@x.dz', preferences_notification: null, notifications_email: false },
      // Valeurs brutes de MySQL : 0 = non, 1 = oui
      { id_user: 4, email: 'd@x.dz', preferences_notification: null, notifications_evenements: 0 },
      { id_user: 5, email: 'e@x.dz', preferences_notification: null, notifications_email: 1, notifications_evenements: 1 }
    ]).mockResolvedValueOnce([]);
    const envoi = jest.spyOn(service, '_envoyerAnnonceParEmail').mockResolvedValue({ envoyes: 1, echecs: 0 });

    const res = await service.broadcastNotification({ title: 'Salon', message: 'Venez' }, 9);

    expect(res.notified).toBe(5);
    expect(res.emails).toBe(2);
    expect(envoi).toHaveBeenCalledWith([{ id_user: 1, email: 'a@x.dz' }, { id_user: 5, email: 'e@x.dz' }], { title: 'Salon', message: 'Venez' });
  });

  it('e-mail : texte échappé, lien cliquable, lien de désinscription signé, un par un', async () => {
    const res = await service._envoyerAnnonceParEmail(
      [{ id_user: 1, email: 'a@x.dz' }, { id_user: 2, email: 'b@x.dz' }],
      { title: 'Salon <b>', message: 'Programme : https://taladz.com/evenements/1.' },
      { pauseMs: 0 }
    );
    expect(res).toEqual({ envoyes: 2, echecs: 0, erreur: null });
    const [to, sujet, html, , texte, options] = mockSendEmail.mock.calls[0];
    expect(to).toBe('a@x.dz');
    expect(sujet).toBe('Salon <b>');
    expect(html).toContain('Salon &lt;b&gt;');
    expect(html).toContain('<a href="https://taladz.com/evenements/1"');
    expect(html).toContain('Ne plus recevoir ces annonces');
    const lien = options.headers['List-Unsubscribe'].slice(1, -1);
    expect(lien).toContain('/api/users/annonces/unsubscribe?u=1&t=');
    expect(verifyUnsubscribe('1', lien.split('t=')[1], 'annonces')).toBe(true);
    expect(verifyUnsubscribe('1', lien.split('t=')[1], 'newsletter')).toBe(false);
    expect(texte).toContain('https://taladz.com/evenements/1');
  });

  it('un échec n’arrête pas les envois suivants', async () => {
    mockSendEmail.mockResolvedValueOnce({ success: false, error: 'refusé' }).mockResolvedValueOnce({ success: true });
    const res = await service._envoyerAnnonceParEmail(
      [{ id_user: 1, email: 'a@x.dz' }, { id_user: 2, email: 'b@x.dz' }], { title: 'T', message: 'M' }, { pauseMs: 0 }
    );
    expect(res).toEqual({ envoyes: 1, echecs: 1, erreur: 'refusé' });
  });

  it('l’administration voit si les e-mails partent vraiment (en pause : simulés)', async () => {
    service.models.User.findAll.mockResolvedValueOnce([{ id_user: 1, email: 'a@x.dz', preferences_notification: null }]).mockResolvedValueOnce([]);
    jest.spyOn(service, '_envoyerAnnonceParEmail').mockResolvedValue({ envoyes: 1, echecs: 0 });
    mockEtat = 'pause';
    expect((await service.broadcastNotification({ title: 'T', message: 'M' }, 9)).email_etat).toBe('pause');
    mockEtat = 'actif';
  });

  it('message à une personne : e-mail envoyé tout de suite, résultat renvoyé', async () => {
    service.models.User.findByPk = jest.fn().mockResolvedValue({ id_user: 7, email: 'moi@yahoo.fr', notifications_email: 1 });
    expect(await service.envoyerEmailDirect(7, { title: 'Test', message: 'Bonjour' })).toEqual({ etat: 'actif', envoye: true, erreur: null });
    expect(mockSendEmail.mock.calls[0][0]).toBe('moi@yahoo.fr');

    mockSendEmail.mockResolvedValueOnce({ success: false, error: '550 Sender not authorized' });
    expect(await service.envoyerEmailDirect(7, { title: 'Test', message: 'Bonjour' })).toEqual({ etat: 'actif', envoye: false, erreur: '550 Sender not authorized' });

    mockEtat = 'pause';
    expect(await service.envoyerEmailDirect(7, { title: 'T', message: 'M' })).toEqual({ etat: 'pause', envoye: false, raison: 'pause' });
    mockEtat = 'actif';
    service.models.User.findByPk.mockResolvedValue({ id_user: 7, email: 'moi@yahoo.fr', notifications_email: 0 });
    expect((await service.envoyerEmailDirect(7, { title: 'T', message: 'M' })).raison).toBe('refuse');
  });
});
