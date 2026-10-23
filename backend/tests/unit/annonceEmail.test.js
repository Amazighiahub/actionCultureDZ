/**
 * Annonce à tous les inscrits (notification + e-mail) : ceux qui ont refusé les e-mails ou les
 * annonces ne reçoivent pas d'e-mail ; l'e-mail a un lien « Ne plus recevoir ces annonces »,
 * un texte échappé, des liens cliquables ; envoi un par un.
 */
const mockSendEmail = jest.fn();
jest.mock('../../services/emailService', () => ({ sendEmail: (...a) => mockSendEmail(...a) }));
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
      User: { count: jest.fn().mockResolvedValue(3), findAll: jest.fn() },
      Notification: { bulkCreate: jest.fn() },
      AuditLog: { create: jest.fn() }
    });
  });

  it('e-mail seulement à ceux qui acceptent e-mails et annonces ; notification pour tous', async () => {
    service.models.User.findAll.mockResolvedValueOnce([
      { id_user: 1, email: 'a@x.dz', preferences_notification: null },
      { id_user: 2, email: 'b@x.dz', preferences_notification: null, notifications_evenements: false },
      { id_user: 3, email: 'c@x.dz', preferences_notification: null, notifications_email: false }
    ]).mockResolvedValueOnce([]);
    const envoi = jest.spyOn(service, '_envoyerAnnonceParEmail').mockResolvedValue({ envoyes: 1, echecs: 0 });

    const res = await service.broadcastNotification({ title: 'Salon', message: 'Venez' }, 9);

    expect(res.notified).toBe(3);
    expect(res.emails).toBe(1);
    expect(envoi).toHaveBeenCalledWith([{ id_user: 1, email: 'a@x.dz' }], { title: 'Salon', message: 'Venez' });
  });

  it('e-mail : texte échappé, lien cliquable, lien de désinscription signé, un par un', async () => {
    const res = await service._envoyerAnnonceParEmail(
      [{ id_user: 1, email: 'a@x.dz' }, { id_user: 2, email: 'b@x.dz' }],
      { title: 'Salon <b>', message: 'Programme : https://taladz.com/evenements/1.' },
      { pauseMs: 0 }
    );
    expect(res).toEqual({ envoyes: 2, echecs: 0 });
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
    expect(res).toEqual({ envoyes: 1, echecs: 1 });
  });
});
