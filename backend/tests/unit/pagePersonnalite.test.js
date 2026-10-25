/**
 * Page d'une personnalité : fiche publique (naissance seulement pour une personne décédée),
 * lieux liés, articles complets qui lui sont consacrés ; relier et retirer un article.
 */
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));
const IntervenantService = require('../../services/intervenantService');

const fiche = (extra) => ({ get: () => ({ id_intervenant: 33, nom: 'El Anka', date_naissance: '1907-05-20', lieu_naissance: 'Casbah', ...extra }) });
const article = (id, statut, saisi_par = 60) => ({
  get: () => ({ id_intervenant_article: id, id_contributeur: 60,
    Oeuvre: { id_oeuvre: 100 + id, titre: { fr: 'Le père du chaâbi' }, statut, saisi_par, id_type_oeuvre: 4, Media: [] } })
});

const make = ({ intervenant = fiche({ date_deces: '1978-11-23' }), articles = [], oeuvre = null, lien = null } = {}) => {
  const models = {
    Intervenant: { findByPk: jest.fn().mockResolvedValue(intervenant) },
    Lieu: {},
    Oeuvre: { findByPk: jest.fn().mockResolvedValue(oeuvre) },
    Article: {},
    Media: {},
    LieuIntervenant: { findAll: jest.fn().mockResolvedValue([
      { Lieu: { id_lieu: 69, nom: { fr: 'Casbah d’Alger' }, typePatrimoine: 'ville_village' }, role_sur_site: 'musicien', periode: 'XXe siècle', contexte: 'Né dans la Casbah' }
    ]) },
    IntervenantArticle: {
      findAll: jest.fn().mockResolvedValue(articles),
      max: jest.fn().mockResolvedValue(0),
      findOrCreate: jest.fn(async ({ where, defaults }) => [{ ...where, ...defaults }]),
      findOne: jest.fn().mockResolvedValue(lien)
    }
  };
  return { service: new IntervenantService({}, { models }), models };
};

describe('IntervenantService.pagePersonnalite', () => {
  it('fiche, lieux liés et articles publiés pour un visiteur', async () => {
    const { service } = make({ articles: [article(1, 'publie'), article(2, 'brouillon')] });
    const page = await service.pagePersonnalite(33, {});
    expect(page.intervenant).toMatchObject({ nom: 'El Anka', date_naissance: '1907-05-20' });
    expect(page.lieux).toEqual([expect.objectContaining({ id_lieu: 69, role_sur_site: 'musicien', contexte: 'Né dans la Casbah' })]);
    expect(page.articles.map(a => a.id_oeuvre)).toEqual([101]);
  });

  it('l’auteur voit aussi son article en attente, et peut le retirer', async () => {
    const { service } = make({ articles: [article(1, 'publie'), article(2, 'brouillon')] });
    const page = await service.pagePersonnalite(33, { userId: 60 });
    expect(page.articles.map(a => a.statut)).toEqual(['publie', 'brouillon']);
    expect(page.articles[0].peut_retirer).toBe(true);
  });

  it('personne vivante : ni date ni lieu de naissance', async () => {
    const { service } = make({ intervenant: fiche({ date_deces: null }) });
    const page = await service.pagePersonnalite(33, {});
    expect(page.intervenant.date_naissance).toBeUndefined();
    expect(page.intervenant.lieu_naissance).toBeUndefined();
  });

  it('introuvable : null', async () => {
    expect(await make({ intervenant: null }).service.pagePersonnalite(999, {})).toBeNull();
  });
});

describe('IntervenantService.lierArticle / retirerArticle', () => {
  it('relie l’article de son auteur, à la suite', async () => {
    const { service, models } = make({ oeuvre: { id_oeuvre: 55, id_type_oeuvre: 4, statut: 'brouillon', saisi_par: 60 } });
    await service.lierArticle(33, { id_oeuvre: 55 }, { userId: 60 });
    expect(models.IntervenantArticle.findOrCreate).toHaveBeenCalledWith({
      where: { id_intervenant: 33, id_oeuvre: 55 }, defaults: { ordre: 1, id_contributeur: 60 }
    });
  });

  it('le brouillon de quelqu’un d’autre : 403', async () => {
    const { service } = make({ oeuvre: { id_oeuvre: 55, id_type_oeuvre: 4, statut: 'brouillon', saisi_par: 99 } });
    await expect(service.lierArticle(33, { id_oeuvre: 55 }, { userId: 60 })).rejects.toMatchObject({ statusCode: 403 });
  });

  it('retrait par la personne qui l’a relié ou la modération seulement', async () => {
    const lien = { id_contributeur: 60, destroy: jest.fn() };
    expect(await make({ lien }).service.retirerArticle(33, 1, { userId: 60 })).toBe('ok');
    expect(await make({ lien }).service.retirerArticle(33, 1, { userId: 7, isModerator: true })).toBe('ok');
    expect(await make({ lien }).service.retirerArticle(33, 1, { userId: 7 })).toBe('interdit');
  });
});
