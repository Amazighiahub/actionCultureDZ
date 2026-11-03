/**
 * Audit V9, lot 2 : quota d'e-mails, relance après un refus, inscrits prévenus d'un changement de lien
 * ou d'un passage en ligne, suppression d'un produit d'artisanat, sanctions depuis un signalement.
 */
jest.mock('../../utils/redisClient', () => ({ getClient: () => null, getRedisClient: async () => null, isReady: () => false, etat: () => 'absent' }));
jest.mock('../../utils/sessionCache', () => ({ invalidateUserSession: jest.fn() }));
const mockOeuvreDelete = jest.fn(async () => true);
const mockEnregistrer = jest.fn(async () => true);
const mockSendEmail = jest.fn(async () => ({ success: true }));
jest.mock('../../services/serviceContainer', () => ({
  oeuvreService: { delete: mockOeuvreDelete },
  notificationService: { enregistrerNotificationsMultiples: mockEnregistrer },
  emailService: { sendEmail: mockSendEmail },
}));
jest.mock('../../services/emailQueueService', () => ({ isInitialized: false, addEmail: jest.fn() }));

const quota = require('../../services/quotaEmail');
const file = require('../../services/emailQueueService');
const emailService = require('../../services/emailService');
const NotificationService = require('../../services/notificationService');
const ArtisanatService = require('../../services/artisanat/artisanatService');
const SignalementService = require('../../services/signalement/signalementService');
const SignalementRepository = require('../../repositories/signalementRepository');

beforeEach(() => {
  jest.clearAllMocks();
  file.isInitialized = false;
  delete process.env.EMAIL_QUOTA_JOUR;
  delete process.env.EMAIL_RESERVE_IMPORTANTS;
});

describe('quota journalier', () => {
  it('réserve une part aux e-mails importants', async () => {
    process.env.EMAIL_QUOTA_JOUR = '100';
    process.env.EMAIL_RESERVE_IMPORTANTS = '80';
    const deja = await quota.envoyesAujourdhui();
    await quota.compterEnvoi();
    expect(await quota.envoyesAujourdhui()).toBe(deja + 1);
    expect(await quota.budgetEnvoiGroupe()).toBe(Math.max(0, 20 - deja - 1));
  });

  it('ne donne jamais un budget négatif', async () => {
    process.env.EMAIL_QUOTA_JOUR = '1';
    process.env.EMAIL_RESERVE_IMPORTANTS = '80';
    expect(await quota.budgetEnvoiGroupe()).toBe(0);
  });
});

describe('e-mail refusé par la messagerie', () => {
  const avecPanne = (fn) => {
    const avant = { transporter: emailService.transporter, isPaused: emailService.isPaused };
    emailService.isPaused = false;
    emailService.transporter = { sendMail: jest.fn(async () => { throw new Error('452 quota dépassé'); }) };
    return fn().finally(() => Object.assign(emailService, avant));
  };

  it('repart plus tard par la file', () => avecPanne(async () => {
    file.isInitialized = true;
    file.addEmail.mockResolvedValue({ success: true, jobId: 9 });
    const res = await emailService.sendEmail('a.b@example.com', 'Sujet', '<p>x</p>');
    expect(res).toEqual({ success: true, enAttente: true });
    expect(file.addEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'a.b@example.com', html: '<p>x</p>' }),
      expect.objectContaining({ attempts: 6 })
    );
  }));

  it('une tâche de la file ne se relance pas elle-même', () => avecPanne(async () => {
    file.isInitialized = true;
    const res = await emailService.sendEmail('a@example.com', 'S', '<p>x</p>', null, null, { sansRelance: true });
    expect(res.success).toBe(false);
    expect(file.addEmail).not.toHaveBeenCalled();
  }));

  it('sans file disponible, l’échec reste visible', () => avecPanne(async () => {
    const res = await emailService.sendEmail('a@example.com', 'S', '<p>x</p>');
    expect(res.success).toBe(false);
  }));
});

describe('changement d’un événement', () => {
  const inscrits = [
    { id_user: 1, statut_participation: 'confirme', User: { id_user: 1, email: 'accepte@example.com' } },
    { id_user: 2, statut_participation: 'inscrit', User: { id_user: 2, email: 'attente@example.com' } },
  ];
  const lancer = async (evenement, changements) => {
    const svc = Object.create(NotificationService.prototype);
    svc.models = {
      Evenement: { findByPk: jest.fn(async () => ({ id_evenement: 3, nom_evenement: 'Réunion', date_debut: '2026-12-01T10:00:00Z', statut: 'publie', ...evenement })) },
      EvenementUser: { findAll: jest.fn(async () => inscrits) },
      Lieu: {}, User: {},
    };
    svc.emailService = { notifierChangementEvenement: jest.fn(async () => []) };
    svc.enregistrerNotificationsMultiples = jest.fn(async () => true);
    svc._str = v => (typeof v === 'string' ? v : v?.fr || '');
    await svc.notifierChangementEvenement(3, changements);
    return svc;
  };

  it('nouveau lien : seulement pour les inscriptions acceptées, et jamais dans la notification', async () => {
    const lien = 'https://meet.example.com/nouveau';
    const svc = await lancer({ url_virtuel: lien }, { date: false, lieu: false, lien: true });
    const lignes = svc.emailService.notifierChangementEvenement.mock.calls[0][2];
    expect(lignes(inscrits[0]).join(' ')).toContain(lien);
    expect(lignes(inscrits[1]).join(' ')).not.toContain(lien);
    expect(JSON.stringify(svc.enregistrerNotificationsMultiples.mock.calls[0][0])).not.toContain(lien);
  });

  it('passage en ligne : les inscrits sont prévenus', async () => {
    const svc = await lancer({ url_virtuel: 'https://meet.example.com/a', Lieu: null }, { date: false, lieu: true, lien: true });
    const lignes = svc.emailService.notifierChangementEvenement.mock.calls[0][2];
    expect(lignes(inscrits[1]).join(' ')).toContain('maintenant en ligne');
  });

  it('lien retiré : les inscrits le savent', async () => {
    const svc = await lancer({ url_virtuel: null }, { date: false, lieu: false, lien: true });
    const lignes = svc.emailService.notifierChangementEvenement.mock.calls[0][2];
    expect(lignes.join(' ')).toContain('n’est plus valable');
  });
});

describe('suppression d’un produit d’artisanat', () => {
  it('retire aussi l’œuvre et ses photos', async () => {
    const repository = {
      findWithFullDetails: jest.fn(async () => ({ id_oeuvre: 5, Oeuvre: { saisi_par: 7 } })),
      findById: jest.fn(async () => ({ id_oeuvre: 5, Oeuvre: { saisi_par: 7 } })),
      delete: jest.fn(async () => true),
    };
    const svc = new ArtisanatService(repository, {});
    await svc.delete(11, 7, false);
    expect(mockOeuvreDelete).toHaveBeenCalledWith(5, 7, true);
    expect(repository.delete).toHaveBeenCalledWith(11);
  });

  it('un autre compte reste refusé', async () => {
    const repository = {
      findWithFullDetails: jest.fn(async () => ({ id_oeuvre: 5, Oeuvre: { saisi_par: 7 } })),
      findById: jest.fn(async () => ({ id_oeuvre: 5, Oeuvre: { saisi_par: 7 } })),
      delete: jest.fn(),
    };
    await expect(new ArtisanatService(repository, {}).delete(11, 99, false)).rejects.toBeDefined();
    expect(mockOeuvreDelete).not.toHaveBeenCalled();
  });
});

describe('sanction depuis un signalement', () => {
  const contexte = (cible = { id_user: 12, id_type_user: 1, Roles: [] }) => {
    const repo = new SignalementRepository({
      Signalement: {}, Role: {},
      Commentaire: { findByPk: jest.fn(async () => ({ id_user: 12 })) },
      User: { findByPk: jest.fn(async () => ({ ...cible, email: 'auteur@example.com' })), update: jest.fn(async () => [1]) },
    });
    const signalement = { type_entite: 'commentaire', id_entite: 40, update: jest.fn(async () => true) };
    repo.findById = jest.fn(async () => signalement);
    return { repo, signalement, svc: new SignalementService(repo, {}) };
  };

  it('suspendre vise l’auteur du commentaire', async () => {
    const { repo, svc } = contexte();
    await svc.traiterSignalement(1, { action_prise: 'suspension_temporaire' }, 8);
    expect(repo.models.User.update).toHaveBeenCalledWith(
      expect.objectContaining({ statut: 'suspendu' }), { where: { id_user: 12 } });
  });

  it('avertir prévient vraiment l’auteur', async () => {
    const { svc } = contexte();
    await svc.traiterSignalement(1, { action_prise: 'avertissement', notes_moderation: 'note interne' }, 8);
    expect(mockEnregistrer).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith('auteur@example.com', expect.any(String), expect.any(String));
    expect(JSON.stringify(mockSendEmail.mock.calls[0])).not.toContain('note interne');
  });

  it('auteur administrateur : refus, et le signalement ne passe pas pour traité', async () => {
    const { repo, signalement, svc } = contexte({ id_user: 12, id_type_user: 1, Roles: [{ nom_role: 'Administrateur' }] });
    await expect(svc.traiterSignalement(1, { action_prise: 'suspension_permanente' }, 8))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(repo.models.User.update).not.toHaveBeenCalled();
    expect(signalement.update).not.toHaveBeenCalled();
  });
});
