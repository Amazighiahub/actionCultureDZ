/**
 * Image principale d'un article = première image visible de son contenu (après chaque enregistrement des blocs)
 */
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));
jest.mock('../../utils/logger', () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() }));

const ArticleBlockService = require('../../services/articleBlockService');

const PROPRIETAIRE = { id_user: 7, isAdmin: false };

const fabriquer = ({ blocs = [], media = { id_media: 20, is_Principale: false } } = {}) => {
  const transaction = { commit: jest.fn(), rollback: jest.fn() };
  const repository = {
    model: { sequelize: { transaction: jest.fn().mockResolvedValue(transaction), query: jest.fn(), literal: jest.fn() }, findAll: jest.fn(), update: jest.fn() },
    findById: jest.fn(),
    findByArticle: jest.fn().mockResolvedValue(blocs),
    findWithMedia: jest.fn().mockResolvedValue({}),
    getNextOrdre: jest.fn().mockResolvedValue(0),
    deleteByArticle: jest.fn(),
    create: jest.fn(async (d) => ({ id_block: 1, ...d }))
  };
  const models = {
    Oeuvre: {},
    Article: { findByPk: jest.fn().mockResolvedValue({ id_oeuvre: 61, Oeuvre: { saisi_par: PROPRIETAIRE.id_user, statut: 'brouillon' } }) },
    Media: { findOne: jest.fn().mockResolvedValue(media), update: jest.fn().mockResolvedValue([1]), findByPk: jest.fn() }
  };
  const service = new ArticleBlockService(repository, { models });
  return { service, models, transaction };
};

describe('Image principale d’un article', () => {
  it('suit la première image visible du contenu, les autres ne sont plus principales', async () => {
    const blocs = [
      { ordre: 2, type_block: 'image', id_media: 30, visible: true },
      { ordre: 0, type_block: 'text', contenu: 'texte' },
      { ordre: 1, type_block: 'image', id_media: 20, visible: true },
    ];
    const { service, models, transaction } = fabriquer({ blocs });
    await service.createMultipleBlocks({ id_article: 8, blocks: [] }, PROPRIETAIRE);
    expect(models.Media.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { id_media: 20, id_oeuvre: 61, type_media: 'image' }
    }));
    const [retrait, ajout] = models.Media.update.mock.calls;
    expect(retrait[0]).toEqual({ is_Principale: false });
    expect(retrait[1].where.id_oeuvre).toBe(61);
    expect(ajout[0]).toEqual({ is_Principale: true });
    expect(ajout[1].where).toEqual({ id_media: 20 });
    expect(transaction.commit).toHaveBeenCalled();
  });

  it('une image masquée est ignorée', async () => {
    const blocs = [
      { ordre: 0, type_block: 'image', id_media: 30, visible: false },
      { ordre: 1, type_block: 'image', id_media: 20, visible: true },
    ];
    const { service, models } = fabriquer({ blocs });
    await service.createMultipleBlocks({ id_article: 8, blocks: [] }, PROPRIETAIRE);
    expect(models.Media.findOne.mock.calls[0][0].where.id_media).toBe(20);
  });

  it('sans image dans le contenu : l’image principale ne change pas', async () => {
    const { service, models } = fabriquer({ blocs: [{ ordre: 0, type_block: 'text', contenu: 'x' }] });
    await service.createMultipleBlocks({ id_article: 8, blocks: [] }, PROPRIETAIRE);
    expect(models.Media.findOne).not.toHaveBeenCalled();
    expect(models.Media.update).not.toHaveBeenCalled();
  });

  it('image d’un autre contenu (pas de cette œuvre) : rien ne change', async () => {
    const { service, models } = fabriquer({ blocs: [{ ordre: 0, type_block: 'image', id_media: 99 }], media: null });
    await service.createMultipleBlocks({ id_article: 8, blocks: [] }, PROPRIETAIRE);
    expect(models.Media.update).not.toHaveBeenCalled();
  });

  it('déjà principale : seules les autres sont retirées', async () => {
    const { service, models } = fabriquer({ blocs: [{ ordre: 0, type_block: 'image', id_media: 20 }], media: { id_media: 20, is_Principale: true } });
    await service.createMultipleBlocks({ id_article: 8, blocks: [] }, PROPRIETAIRE);
    expect(models.Media.update).toHaveBeenCalledTimes(1);
    expect(models.Media.update.mock.calls[0][0]).toEqual({ is_Principale: false });
  });

  it('une erreur n’empêche jamais l’enregistrement des blocs', async () => {
    const { service, models } = fabriquer({ blocs: [{ ordre: 0, type_block: 'image', id_media: 20 }] });
    models.Media.update.mockRejectedValueOnce(new Error('base occupée'));
    const res = await service.createMultipleBlocks({ id_article: 8, blocks: [] }, PROPRIETAIRE);
    expect(res.error).toBeUndefined();
    expect(res.count).toBe(0);
  });
});
