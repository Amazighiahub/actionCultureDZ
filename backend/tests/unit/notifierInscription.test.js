/**
 * Inscription à un événement : la personne reçoit « inscription reçue, en attente de confirmation »
 * (notification + e-mail, montant si payant), l'organisateur « nouvelle inscription ».
 * Avant : aucun message, la personne ne savait pas si son inscription était passée.
 */
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));
jest.mock('../../services/quotaEmail', () => ({
  ...jest.requireActual('../../services/quotaEmail'),
  premiereFoisPendant: jest.fn().mockResolvedValue(true)
}));
const quota = require('../../services/quotaEmail');
const NotificationService = require('../../services/notificationService');

const service = ({ montant = '10000.00', organisateur = 37 } = {}) => {
  const s = Object.create(NotificationService.prototype);
  s.models = {
    User: { findByPk: jest.fn().mockResolvedValue({ id_user: 71, prenom: 'Lina', nom: 'Exemple', email: 'lina@example.com' }) },
    Evenement: { findByPk: jest.fn().mockResolvedValue({ id_evenement: 2, nom_evenement: { fr: 'Chantier-école Ghoufi' }, id_user: organisateur }) },
    EvenementUser: { findOne: jest.fn().mockResolvedValue({ montant_du: montant }) }
  };
  s.enregistrerNotification = jest.fn().mockResolvedValue();
  s.emailService = { sendInscriptionRecue: jest.fn().mockResolvedValue({ success: true }) };
  return s;
};

describe('notifierInscription', () => {
  beforeEach(() => quota.premiereFoisPendant.mockResolvedValue(true));

  it('participant : « inscription reçue », montant à régler à l’organisateur, e-mail ; organisateur prévenu', async () => {
    const s = service();
    await s.notifierInscription(2, 71);
    const [participant, organisateur] = s.enregistrerNotification.mock.calls.map((c) => c[0]);
    expect(participant).toMatchObject({ id_user: 71, titre: 'Inscription reçue', id_evenement: 2 });
    expect(participant.message).toMatch(/L’organisateur va la confirmer/);
    expect(participant.message).toMatch(/Montant : 10 000 DA/);
    expect(organisateur).toMatchObject({ id_user: 37, titre: 'Nouvelle inscription' });
    expect(organisateur.message).toMatch(/Lina Exemple s’est inscrit\(e\) à « Chantier-école Ghoufi »/);
    expect(s.emailService.sendInscriptionRecue).toHaveBeenCalledWith(expect.objectContaining({ id_user: 71 }), expect.anything(), { montant: '10 000 DA' });
  });

  it('gratuit : pas de montant ; organisateur qui s’inscrit lui-même : une seule notification', async () => {
    const s = service({ montant: '0.00', organisateur: 71 });
    await s.notifierInscription(2, 71);
    expect(s.enregistrerNotification).toHaveBeenCalledTimes(1);
    expect(s.enregistrerNotification.mock.calls[0][0].message).not.toMatch(/Montant/);
  });

  it('e-mail une fois par heure au plus (s’inscrire, annuler, se réinscrire)', async () => {
    quota.premiereFoisPendant.mockResolvedValue(false);
    const s = service();
    await s.notifierInscription(2, 71);
    expect(s.emailService.sendInscriptionRecue).not.toHaveBeenCalled();
    expect(s.enregistrerNotification).toHaveBeenCalled();
  });
});

describe('registerParticipant : avertissement seulement pour une nouvelle inscription', () => {
  const EvenementService = require('../../services/evenement/evenementService');
  const faire = async (existante) => {
    const s = Object.create(EvenementService.prototype);
    const notifierInscription = jest.fn().mockResolvedValue();
    s.notificationService = { notifierInscription };
    s.logger = { info: jest.fn(), error: jest.fn() };
    s.withTransaction = (fn) => fn({ LOCK: { UPDATE: 'u' } });
    s.repository = {
      findById: jest.fn().mockResolvedValue({ id_evenement: 2, statut: 'planifie', date_debut: '2099-01-01', capacite_max: null }),
      registerParticipant: jest.fn().mockResolvedValue({ id: 1 }),
      countParticipants: jest.fn().mockResolvedValue(0)
    };
    s.models = { EvenementUser: { findOne: jest.fn().mockResolvedValue(existante) } };
    s._reponsesInscription = jest.fn().mockResolvedValue({});
    await s.registerParticipant(2, 71, {});
    return notifierInscription;
  };

  it('première inscription ou reprise après annulation : prévenu ; déjà inscrit : rien', async () => {
    expect(await faire(null)).toHaveBeenCalledWith(2, 71);
    expect(await faire({ statut_participation: 'annule' })).toHaveBeenCalled();
    expect(await faire({ statut_participation: 'inscrit' })).not.toHaveBeenCalled();
    expect(await faire({ statut_participation: 'invitation', reponses_inscription: {} })).toHaveBeenCalled();
  });
});
