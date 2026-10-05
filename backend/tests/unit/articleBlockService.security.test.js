/**
 * ArticleBlockService — propriété de l'article, sauvegarde batch réparée,
 * assainissement systématique du contenu.
 */
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));

const ArticleBlockService = require('../../services/articleBlockService');
const { sanitizeBlockContent } = require('../../utils/sanitizeArticle');

const OWNER = { id_user: 7, isAdmin: false };
const OTHER = { id_user: 8, isAdmin: false };
const ADMIN = { id_user: 1, isAdmin: true };

const makeService = ({ block = null } = {}) => {
  const transaction = { commit: jest.fn(), rollback: jest.fn() };
  const created = [];
  const repository = {
    model: {
      sequelize: { transaction: jest.fn().mockResolvedValue(transaction), query: jest.fn(), literal: jest.fn() },
      findAll: jest.fn(),
      update: jest.fn()
    },
    findById: jest.fn().mockResolvedValue(block),
    findByArticle: jest.fn().mockResolvedValue([]),
    findWithMedia: jest.fn().mockResolvedValue({}),
    getNextOrdre: jest.fn().mockResolvedValue(1),
    deleteByArticle: jest.fn(),
    create: jest.fn(async (data) => { created.push(data); return { id_block: created.length, ...data }; })
  };
  const parentOf = (owner) => ({ id_oeuvre: 3, Oeuvre: { saisi_par: owner } });
  const models = {
    Oeuvre: {},
    Article: { findByPk: jest.fn().mockResolvedValue(parentOf(OWNER.id_user)) },
    ArticleScientifique: { findByPk: jest.fn().mockResolvedValue(parentOf(OWNER.id_user)) }
  };
  const service = new ArticleBlockService(repository, { models });
  return { service, repository, models, created };
};

describe('ArticleBlockService - propriété', () => {
  it('batch par un autre pro : refusé, aucun bloc supprimé', async () => {
    const { service, repository } = makeService();
    const res = await service.createMultipleBlocks({ id_article: 12, blocks: [] }, OTHER);
    expect(res.error).toBe('forbidden');
    expect(repository.deleteByArticle).not.toHaveBeenCalled();
  });

  it('batch avec article_type patrimoine : refusé', async () => {
    const { service, repository } = makeService();
    const res = await service.createMultipleBlocks({ id_article: 12, article_type: 'patrimoine', blocks: [] }, ADMIN);
    expect(res.error).toBe('badRequest');
    expect(repository.deleteByArticle).not.toHaveBeenCalled();
  });

  it('article inexistant : notFound', async () => {
    const { service, models } = makeService();
    models.Article.findByPk.mockResolvedValue(null);
    const res = await service.createMultipleBlocks({ id_article: 99, blocks: [] }, OWNER);
    expect(res.error).toBe('notFound');
  });

  it('update / delete / duplicate du bloc d\'un autre : refusés', async () => {
    const block = { id_block: 5, id_article: 12, article_type: 'article', ordre: 1, save: jest.fn(), destroy: jest.fn() };
    const { service } = makeService({ block });
    expect((await service.updateBlock(5, { contenu: 'x' }, OTHER)).error).toBe('forbidden');
    expect((await service.deleteBlock(5, OTHER)).error).toBe('forbidden');
    expect((await service.duplicateBlock(5, OTHER)).error).toBe('forbidden');
    expect(block.save).not.toHaveBeenCalled();
    expect(block.destroy).not.toHaveBeenCalled();
  });

  it('article scientifique : contrôle via ArticleScientifique', async () => {
    const { service, models } = makeService();
    await service.createMultipleBlocks({ id_article: 4, article_type: 'article_scientifique', blocks: [] }, OWNER);
    expect(models.ArticleScientifique.findByPk).toHaveBeenCalled();
  });
});

describe('ArticleBlockService - sauvegarde batch (régression)', () => {
  it('le propriétaire enregistre ses blocs avec type_block et contenu assaini', async () => {
    const { service, created } = makeService();
    const res = await service.createMultipleBlocks({
      id_article: 12,
      article_type: 'article',
      blocks: [
        { type_block: 'text', contenu: 'Bonjour <img src=x onerror=alert(1)>', metadata: { a: 1 } },
        { type_block: 'heading', contenu: 'Titre', metadata: { level: 2 }, visible: true }
      ]
    }, OWNER);
    expect(res.error).toBeUndefined();
    expect(res.count).toBe(2);
    expect(created[0]).toMatchObject({ type_block: 'text', contenu: 'Bonjour ', ordre: 0 });
    expect(created[1]).toMatchObject({ type_block: 'heading', metadata: { level: 2 } });
  });

  it('un admin peut modifier n\'importe quel article', async () => {
    const { service } = makeService();
    const res = await service.createMultipleBlocks({ id_article: 12, blocks: [] }, ADMIN);
    expect(res.error).toBeUndefined();
  });
});

describe('ArticleBlockService - update assaini sans type_block', () => {
  it('le contenu HTML est nettoyé selon le type du bloc en base', async () => {
    const block = { id_block: 5, id_article: 12, article_type: 'article', type_block: 'text', save: jest.fn() };
    const { service } = makeService({ block });
    await service.updateBlock(5, { contenu: '<img src=x onerror=alert(1)>texte' }, OWNER);
    expect(block.contenu).toBe('texte');
    expect(block.save).toHaveBeenCalled();
  });
});

describe('sanitizeBlockContent - image / video', () => {
  it.each([
    ['javascript:alert(1)', ''],
    ['https://evil.tld/?youtube.com', ''],
    ['http://www.youtube.com/embed/abc', ''],
    ['https://www.youtube.com/embed/abc', 'https://www.youtube.com/embed/abc'],
    ['https://player.vimeo.com/video/1', 'https://player.vimeo.com/video/1'],
    ['https://res.cloudinary.com/demo/video/upload/x.mp4', 'https://res.cloudinary.com/demo/video/upload/x.mp4']
  ])('video %p => %p', (input, expected) => {
    expect(sanitizeBlockContent('video', input)).toBe(expected);
  });

  it.each([
    ['javascript:alert(1)', ''],
    ['data:text/html;base64,xx', ''],
    ['https://site.dz/a.jpg', 'https://site.dz/a.jpg'],
    ['Légende <b>simple</b>', 'Légende simple']
  ])('image %p => %p', (input, expected) => {
    expect(sanitizeBlockContent('image', input)).toBe(expected);
  });
});
