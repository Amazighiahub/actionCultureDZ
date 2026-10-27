/**
 * Rappel « c'est demain » et noms lisibles dans les notifications (personnes fictives) :
 * - la journée de demain est celle de l'Algérie, quel que soit le fuseau du serveur ;
 * - le rappel envoie l'email avec le nom de l'événement (plus « [object Object] ») et renvoie
 *   le nombre de participants prévenus ; une erreur remonte (l'événement n'est pas marqué) ;
 * - les noms multilingues (tamazight compris) deviennent du texte.
 */
jest.mock('../../utils/redisClient', () => ({ getClient: () => null }));

const NotificationService = require('../../services/notificationService');
const cronService = require('../../services/cronService');
const emailService = require('../../services/emailService');

describe('journée de demain (Algérie)', () => {
  it('le matin à Alger : demain commence à 23 h UTC ce soir', () => {
    const { demain, apresdemain } = cronService.journeeDeDemain(new Date('2026-10-27T07:00:00Z'));
    expect(demain.toISOString()).toBe('2026-10-27T23:00:00.000Z');
    expect(apresdemain.toISOString()).toBe('2026-10-28T23:00:00.000Z');
  });

  it('après minuit à Alger (23 h 30 UTC) : on est déjà le lendemain', () => {
    const { demain } = cronService.journeeDeDemain(new Date('2026-10-27T23:30:00Z'));
    expect(demain.toISOString()).toBe('2026-10-28T23:00:00.000Z');
  });
});

describe('noms lisibles', () => {
  const service = new NotificationService({});

  it('français, sinon la langue remplie (tamazight compris), sinon texte simple', () => {
    expect(service._str({ fr: 'Chantier-école', ar: 'ورشة' })).toBe('Chantier-école');
    expect(service._str({ fr: '', 'tz-ltn': 'Tiɣremt' })).toBe('Tiɣremt');
    expect(service._str('{"ar":"تكوت"}')).toBe('تكوت');
    expect(service._str(null)).toBe('');
  });

  it('emails : prénom, sinon nom (compte importé sans prénom)', () => {
    expect(emailService._prenom({ prenom: { fr: 'Lydia' }, nom: { fr: 'Amrani' } })).toBe('Lydia');
    expect(emailService._prenom({ prenom: { fr: '' }, nom: { fr: 'Bensaid' } })).toBe('Bensaid');
  });
});

describe('envoyerRappelEvenement', () => {
  function service(participants) {
    const models = {
      Evenement: { findByPk: jest.fn().mockResolvedValue({
        id_evenement: 2, nom_evenement: { fr: 'Chantier-école de Ghoufi', ar: 'ورشة غوفي' },
        date_debut: '2026-10-28T07:00:00Z', Lieu: { nom: { fr: 'Ghoufi' }, adresse: 'Balcons de Ghoufi' }
      }) },
      EvenementUser: { findAll: jest.fn().mockResolvedValue(participants) },
      Lieu: {}, User: {},
      Notification: { create: jest.fn().mockResolvedValue({}) }
    };
    const s = new NotificationService(models);
    s.emailService = { sendEventReminder: jest.fn().mockResolvedValue({ success: true }) };
    return { s, models };
  }
  const PARTICIPANT = { id_user: 101, User: { id_user: 101, email: 'lydia.amrani@exemple.dz', prenom: { fr: 'Lydia' }, nom: { fr: 'Amrani' } } };

  it('email et notification avec le nom, la date et l’heure d’Algérie', async () => {
    const { s, models } = service([PARTICIPANT]);
    await expect(s.envoyerRappelEvenement(2)).resolves.toEqual({ envoyes: 1 });
    const email = s.emailService.sendEventReminder.mock.calls[0][0];
    expect(email).toMatchObject({ email: 'lydia.amrani@exemple.dz', prenom: 'Lydia', nomEvenement: 'Chantier-école de Ghoufi', heureDebut: '08:00', lieu: 'Ghoufi, Balcons de Ghoufi' });
    const notif = models.Notification.create.mock.calls[0][0];
    expect(notif.message).toContain('« Chantier-école de Ghoufi »');
    expect(notif.message).not.toContain('[object Object]');
  });

  it('événement introuvable : erreur (le cron ne le marque pas « envoyé »)', async () => {
    const { s, models } = service([]);
    models.Evenement.findByPk.mockResolvedValue(null);
    await expect(s.envoyerRappelEvenement(99)).rejects.toThrow('introuvable');
  });
});
