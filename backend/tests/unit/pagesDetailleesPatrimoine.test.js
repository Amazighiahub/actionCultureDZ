/**
 * Pages détaillées d'un site : articles de l'éditeur avancé reliés à une section
 * (« La rechta » dans Gastronomie). Visibilité selon le statut, droits pour relier et retirer.
 */
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));
const PatrimoineService = require('../../services/patrimoine/patrimoineService');

const lienDe = (id, oeuvre, extra = {}) => ({
  get: () => ({ id_lieu_oeuvre: id, section_patrimoine: 'gastronomie', id_contributeur: 60, Oeuvre: oeuvre, ...extra })
});

const make = ({ liens = [], oeuvre = null, lien = null } = {}) => {
  const models = {
    Lieu: { findByPk: jest.fn().mockResolvedValue({ id_lieu: 69, id_createur: 5 }) },
    Oeuvre: { findByPk: jest.fn().mockResolvedValue(oeuvre) },
    Article: {},
    Media: {},
    LieuOeuvre: {
      findAll: jest.fn().mockResolvedValue(liens),
      max: jest.fn().mockResolvedValue(1),
      findOrCreate: jest.fn(async ({ where, defaults }) => [{ ...where, ...defaults }]),
      findOne: jest.fn().mockResolvedValue(lien)
    }
  };
  return { service: new PatrimoineService({}, { models }), models };
};

describe('PatrimoineService.pagesDetaillees', () => {
  const publie = { id_oeuvre: 1, titre: { fr: 'La rechta' }, statut: 'publie', saisi_par: 60, id_type_oeuvre: 4,
    Article: { resume: 'Pâtes fraîches algéroises' }, Media: [{ url: 'b.jpg', ordre: 2 }, { url: 'a.jpg', ordre: 1 }] };
  const brouillon = { id_oeuvre: 2, titre: { fr: 'Le bourek' }, statut: 'brouillon', saisi_par: 60, id_type_oeuvre: 4, Media: [] };

  it('un visiteur ne voit que les articles publiés, avec résumé et première image', async () => {
    const { service } = make({ liens: [lienDe(10, publie), lienDe(11, brouillon)] });
    const pages = await service.pagesDetaillees(69, {});
    expect(pages).toHaveLength(1);
    expect(pages[0]).toMatchObject({ id_oeuvre: 1, resume: 'Pâtes fraîches algéroises', image: 'a.jpg', peut_retirer: false });
  });

  it('l’auteur voit aussi son article en attente', async () => {
    const { service } = make({ liens: [lienDe(10, publie), lienDe(11, brouillon)] });
    const pages = await service.pagesDetaillees(69, { userId: 60 });
    expect(pages.map(p => p.statut)).toEqual(['publie', 'brouillon']);
    expect(pages[0].peut_retirer).toBe(true);
  });

  it('un article rejeté n’est visible que par la modération', async () => {
    const rejete = { ...brouillon, statut: 'rejete' };
    expect(await make({ liens: [lienDe(12, rejete)] }).service.pagesDetaillees(69, { userId: 60 })).toHaveLength(0);
    expect(await make({ liens: [lienDe(12, rejete)] }).service.pagesDetaillees(69, { isModerator: true })).toHaveLength(1);
  });
});

describe('PatrimoineService.lierPage', () => {
  it('relie l’article de son auteur à la section, à la suite', async () => {
    const { service, models } = make({ oeuvre: { id_oeuvre: 2, id_type_oeuvre: 4, statut: 'brouillon', saisi_par: 60 } });
    await service.lierPage(69, { id_oeuvre: 2, section_patrimoine: 'gastronomie' }, { userId: 60 });
    expect(models.LieuOeuvre.findOrCreate).toHaveBeenCalledWith({
      where: { id_lieu: 69, id_oeuvre: 2, section_patrimoine: 'gastronomie' },
      defaults: { ordre: 2, id_contributeur: 60 }
    });
  });

  it('le brouillon de quelqu’un d’autre : refusé', async () => {
    const { service, models } = make({ oeuvre: { id_oeuvre: 2, id_type_oeuvre: 4, statut: 'brouillon', saisi_par: 99 } });
    await expect(service.lierPage(69, { id_oeuvre: 2, section_patrimoine: 'gastronomie' }, { userId: 60 }))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(models.LieuOeuvre.findOrCreate).not.toHaveBeenCalled();
  });

  it('une œuvre qui n’est pas un article (un livre) : refusée', async () => {
    const { service } = make({ oeuvre: { id_oeuvre: 3, id_type_oeuvre: 1, statut: 'publie', saisi_par: 99 } });
    await expect(service.lierPage(69, { id_oeuvre: 3, section_patrimoine: 'histoire' }, { userId: 60 }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('un article publié d’un autre auteur peut être relié', async () => {
    const { service, models } = make({ oeuvre: { id_oeuvre: 4, id_type_oeuvre: 4, statut: 'publie', saisi_par: 99 } });
    await service.lierPage(69, { id_oeuvre: 4, section_patrimoine: 'histoire' }, { userId: 60 });
    expect(models.LieuOeuvre.findOrCreate).toHaveBeenCalled();
  });
});

describe('PatrimoineService.retirerPage', () => {
  it('par la personne qui l’a reliée, le créateur du site ou la modération ; pas par un autre', async () => {
    const lien = { id_contributeur: 60, destroy: jest.fn() };
    expect(await make({ lien }).service.retirerPage(69, 10, { userId: 60 })).toBe('ok');
    expect(await make({ lien }).service.retirerPage(69, 10, { userId: 5 })).toBe('ok');
    expect(await make({ lien }).service.retirerPage(69, 10, { userId: 77, isModerator: true })).toBe('ok');
    expect(await make({ lien }).service.retirerPage(69, 10, { userId: 77 })).toBe('interdit');
    expect(await make({ lien: null }).service.retirerPage(69, 10, { userId: 60 })).toBe('introuvable');
  });
});

describe('ajouterCouvertures', () => {
  const { ajouterCouvertures } = require('../../utils/carteArticle');
  it('la carte prend la première image de l’article, pas une image au hasard de l’œuvre', async () => {
    const models = {
      ArticleBlock: { findAll: jest.fn().mockResolvedValue([
        { id_article: 9, media: { url: 'ouverture.jpg' } },
        { id_article: 9, media: { url: 'deuxieme.jpg' } }
      ]) },
      Media: {}
    };
    const cartes = await ajouterCouvertures(models, [
      { id_oeuvre: 57, id_article: 9, image: 'au-hasard.jpg' },
      { id_oeuvre: 58, id_article: 10, image: 'image-oeuvre.jpg' }
    ]);
    expect(cartes).toEqual([
      { id_oeuvre: 57, image: 'ouverture.jpg' },
      { id_oeuvre: 58, image: 'image-oeuvre.jpg' }
    ]);
    expect(models.ArticleBlock.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { article_type: 'article', id_article: [9, 10], type_block: 'image' }
    }));
  });
});
