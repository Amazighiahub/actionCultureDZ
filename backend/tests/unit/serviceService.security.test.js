/**
 * ServiceService — un service sans propriétaire n'est gérable que par la modération,
 * et la modération peut gérer les services des pros.
 */
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));

const ServiceService = require('../../services/service/serviceService');

const makeService = (existing) => {
  const repository = {
    findById: jest.fn().mockResolvedValue(existing),
    findWithFullDetails: jest.fn().mockResolvedValue({ id: existing?.id }),
    update: jest.fn().mockResolvedValue([1]),
    delete: jest.fn().mockResolvedValue(true)
  };
  return { service: new ServiceService(repository, {}), repository };
};

describe('ServiceService - droits', () => {
  it('service sans propriétaire : un pro ne peut ni modifier ni supprimer', async () => {
    const { service, repository } = makeService({ id: 42, id_user: null, statut: 'valide' });
    await expect(service.update(42, { nom: { fr: 'Arnaque' } }, 7)).rejects.toMatchObject({ statusCode: 403 });
    await expect(service.delete(42, 7)).rejects.toMatchObject({ statusCode: 403 });
    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('service sans propriétaire : la modération peut le supprimer', async () => {
    const { service, repository } = makeService({ id: 42, id_user: null });
    await service.delete(42, 1, true);
    expect(repository.delete).toHaveBeenCalledWith(42);
  });

  it('service d\'un pro : un autre pro est refusé, l\'admin est autorisé', async () => {
    const { service, repository } = makeService({ id: 43, id_user: 7, statut: 'valide' });
    await expect(service.delete(43, 8)).rejects.toMatchObject({ statusCode: 403 });
    await service.delete(43, 1, true);
    expect(repository.delete).toHaveBeenCalledWith(43);
  });

  it('le propriétaire qui change un contenu public d\'un service validé le renvoie en modération', async () => {
    const { service, repository } = makeService({ id: 43, id_user: 7, statut: 'valide' });
    await service.update(43, { site_web: 'https://nouveau.dz' }, 7);
    expect(repository.update).toHaveBeenCalledWith(43, expect.objectContaining({ statut: 'en_attente' }));
  });

  it('le propriétaire qui change seulement la disponibilité garde le statut validé', async () => {
    const { service, repository } = makeService({ id: 43, id_user: 7, statut: 'valide' });
    await service.update(43, { disponible: false }, 7);
    expect(repository.update.mock.calls[0][1]).not.toHaveProperty('statut');
  });

  it('champs de contact laissés vides : null (un service sans e-mail reste modifiable), sans repasser en modération', async () => {
    const { service, repository } = makeService({ id: 44, id_user: 7, statut: 'valide', email: null, telephone: '0555', site_web: null });
    await service.update(44, { email: '', telephone: '0555', site_web: '  ' }, 7);
    const donnees = repository.update.mock.calls[0][1];
    expect(donnees).toMatchObject({ email: null, site_web: null, telephone: '0555' });
    expect(donnees.statut).toBeUndefined();
  });

  it('lot 2 : équipements et capacité sans relecture ; un nouveau lien de réservation repasse en modération', async () => {
    const a = makeService({ id: 45, id_user: 7, statut: 'valide' });
    await a.service.update(45, { equipements: ['wifi', 'inconnu'], capacite: '30' }, 7);
    expect(a.repository.update.mock.calls[0][1]).toEqual({ equipements: ['wifi'], capacite: 30 });
    const b = makeService({ id: 46, id_user: 7, statut: 'valide', lien_reservation: null });
    await b.service.update(46, { lien_reservation: 'https://reservation.example.com/x' }, 7);
    expect(b.repository.update.mock.calls[0][1].statut).toBe('en_attente');
  });
});
