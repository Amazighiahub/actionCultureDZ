/**
 * OeuvreService.update — un propriétaire non admin ne peut pas fixer
 * lui-même statut / est_mis_en_avant (contournement de la modération).
 */
// Pas de Redis en test unitaire (CacheManager retombe sur le cache mémoire)
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));

const OeuvreService = require('../../services/oeuvre/oeuvreService');

const OWNER_ID = 7;

const makeService = () => {
  const repository = {
    findById: jest.fn().mockResolvedValue({
      id_oeuvre: 1, saisi_par: OWNER_ID, id_type_oeuvre: 1,
      titre: { fr: 'Ancien' }, description: { fr: '' }
    }),
    update: jest.fn().mockResolvedValue([1]),
    withTransaction: jest.fn(async (cb) => cb({}))
  };
  const service = new OeuvreService(repository, {});
  service.findWithFullDetails = jest.fn().mockResolvedValue({ id_oeuvre: 1 });
  return { service, repository };
};

const sentEntity = (repository) => repository.update.mock.calls[0][1];

describe('OeuvreService.update - champs de modération', () => {
  it('propriétaire non admin : statut et est_mis_en_avant ignorés', async () => {
    const { service, repository } = makeService();
    await service.update(1, { titre: { fr: 'Nouveau' }, statut: 'publie', est_mis_en_avant: true }, OWNER_ID, false);
    const entity = sentEntity(repository);
    expect(entity).not.toHaveProperty('statut');
    expect(entity).not.toHaveProperty('est_mis_en_avant');
  });

  it('propriétaire non admin : variante camelCase ignorée', async () => {
    const { service, repository } = makeService();
    await service.update(1, { titre: { fr: 'Nouveau' }, estMisEnAvant: true }, OWNER_ID, false);
    expect(sentEntity(repository)).not.toHaveProperty('est_mis_en_avant');
  });

  it('propriétaire qui n\'envoie que statut : aucune modification', async () => {
    const { service, repository } = makeService();
    await expect(service.update(1, { statut: 'publie' }, OWNER_ID, false))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('admin : statut et est_mis_en_avant transmis', async () => {
    const { service, repository } = makeService();
    await service.update(1, { statut: 'publie', est_mis_en_avant: true }, 99, true);
    const entity = sentEntity(repository);
    expect(entity.statut).toBe('publie');
    expect(entity.est_mis_en_avant).toBe(true);
  });

  it('autre utilisateur non admin : 403', async () => {
    const { service } = makeService();
    await expect(service.update(1, { titre: { fr: 'X' } }, 99, false))
      .rejects.toMatchObject({ statusCode: 403 });
  });
});
