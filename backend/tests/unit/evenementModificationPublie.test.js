/**
 * Modification d'un événement publié : permise à son organisateur (et à l'administration),
 * refusée une fois l'événement annulé ou terminé, refusée à un autre compte.
 */
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));
jest.mock('../../middlewares/cacheMiddleware', () => ({ clearCache: jest.fn() }));
const EvenementService = require('../../services/evenement/evenementService');

const makeSvc = (existing) => {
  const svc = Object.create(EvenementService.prototype);
  svc.models = { EvenementOrganisation: { count: jest.fn().mockResolvedValue(1) } };
  svc.repository = {
    findById: jest.fn().mockResolvedValue(existing),
    update: jest.fn(),
    findWithFullDetails: jest.fn().mockResolvedValue({ id_evenement: 1 })
  };
  svc.withTransaction = async (cb) => cb({ LOCK: { UPDATE: 'UPDATE' } });
  svc.cache = { invalidate: jest.fn() };
  svc.logger = { info: jest.fn() };
  return svc;
};

describe('EvenementService.update — événement publié', () => {
  it('l’organisateur modifie son événement publié (statut inchangé)', async () => {
    const svc = makeSvc({ id_evenement: 1, id_user: 60, statut: 'planifie' });
    await svc.update(1, { tarif: 200 }, 60);
    expect(svc.repository.update).toHaveBeenCalledWith(1, expect.objectContaining({ tarif: 200 }), expect.anything());
    expect(svc.repository.update.mock.calls[0][1].statut).toBeUndefined();
  });

  it('l’administration peut modifier l’événement d’un autre compte', async () => {
    const svc = makeSvc({ id_evenement: 1, id_user: 60, statut: 'publie' });
    await svc.update(1, { tarif: 0 }, 1, { isAdmin: true });
    expect(svc.repository.update).toHaveBeenCalled();
  });

  it('refusé à un autre compte, et une fois l’événement annulé', async () => {
    await expect(makeSvc({ id_evenement: 1, id_user: 60, statut: 'publie' }).update(1, {}, 12)).rejects.toThrow(/vos propres/);
    await expect(makeSvc({ id_evenement: 1, id_user: 60, statut: 'annule' }).update(1, {}, 60)).rejects.toThrow(/annulé ou terminé/);
  });
});
