/**
 * Validation des événements : « Publier » envoie l'événement d'un professionnel à la validation
 * (en_attente, administrateurs prévenus) ; l'administration le publie ou le refuse avec un motif
 * (retour en brouillon) et l'organisateur est prévenu.
 */
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));
jest.mock('../../middlewares/cacheMiddleware', () => ({ clearCache: jest.fn() }));
const EvenementService = require('../../services/evenement/evenementService');

const makeSvc = (existing, apres = existing) => {
  const svc = Object.create(EvenementService.prototype);
  svc.models = {
    EvenementOrganisation: { count: jest.fn().mockResolvedValue(1) },
    User: { findAll: jest.fn().mockResolvedValue([{ id_user: 1 }]) }
  };
  svc.repository = {
    findById: jest.fn().mockResolvedValue(existing),
    update: jest.fn(),
    findWithFullDetails: jest.fn().mockResolvedValue(apres)
  };
  svc.notificationService = { sendToUser: jest.fn() };
  svc.withTransaction = async (cb) => cb({ LOCK: { UPDATE: 'UPDATE' } });
  svc.cache = { invalidate: jest.fn() };
  svc.logger = { info: jest.fn() };
  return svc;
};

describe('Statut demandé par « Publier l’événement »', () => {
  it('professionnel : en attente ; administration : publié ; brouillon sinon', () => {
    const svc = makeSvc({});
    expect(svc._statutDemande('publie', false)).toBe('en_attente');
    expect(svc._statutDemande('publie', true)).toBe('publie');
    expect(svc._statutDemande('brouillon', false)).toBe('brouillon');
    expect(svc._statutDemande(undefined, true)).toBe('brouillon');
  });
});

describe('Envoyer un brouillon à la validation (modification)', () => {
  it('le brouillon passe en attente et les administrateurs sont prévenus', async () => {
    const svc = makeSvc({ id_evenement: 5, id_user: 60, statut: 'brouillon' },
      { id_evenement: 5, id_user: 60, statut: 'en_attente', nom_evenement: { fr: 'Salon' } });
    await svc.update(5, { statut: 'publie' }, 60);
    expect(svc.repository.update.mock.calls[0][1].statut).toBe('en_attente');
    expect(svc.notificationService.sendToUser).toHaveBeenCalledWith(1, expect.objectContaining({ titre: 'Événement à valider' }));
  });

  it('un événement déjà en attente ou publié garde son statut, sans nouvelle notification', async () => {
    const svc = makeSvc({ id_evenement: 5, id_user: 60, statut: 'en_attente' });
    await svc.update(5, { statut: 'publie', tarif: 100 }, 60);
    expect(svc.repository.update.mock.calls[0][1].statut).toBeUndefined();
    expect(svc.notificationService.sendToUser).not.toHaveBeenCalled();
  });
});

describe('Décision de l’administration', () => {
  it('valider : publié, l’organisateur est prévenu avec le lien de l’événement', async () => {
    const svc = makeSvc({ id_evenement: 5, id_user: 60, statut: 'en_attente', nom_evenement: { fr: 'Salon de la poterie' } });
    await svc.publish(5, 1);
    expect(svc.repository.update).toHaveBeenCalledWith(5, { statut: 'publie' });
    expect(svc.notificationService.sendToUser).toHaveBeenCalledWith(60, expect.objectContaining({
      titre: 'Événement publié', url_action: '/evenements/5-salon-de-la-poterie'
    }));
  });

  it('refuser : motif obligatoire, retour en brouillon, motif transmis à l’organisateur', async () => {
    const svc = makeSvc({ id_evenement: 5, id_user: 60, statut: 'en_attente', nom_evenement: { fr: 'Salon' } });
    await expect(svc.publish(5, 1, { statut: 'rejete', raison: '  ' })).rejects.toThrow(/motif/);
    await svc.publish(5, 1, { statut: 'rejete', raison: 'Il manque l’adresse exacte' });
    expect(svc.repository.update).toHaveBeenCalledWith(5, { statut: 'brouillon' });
    expect(svc.notificationService.sendToUser).toHaveBeenCalledWith(60, expect.objectContaining({
      titre: 'Événement à corriger', message: expect.stringContaining('Il manque l’adresse exacte')
    }));
  });

  it('on ne refuse qu’un événement en attente', async () => {
    const svc = makeSvc({ id_evenement: 5, id_user: 60, statut: 'publie' });
    await expect(svc.publish(5, 1, { statut: 'rejete', raison: 'Doublon' })).rejects.toThrow(/en attente/);
  });
});
