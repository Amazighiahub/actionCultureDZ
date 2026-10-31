/**
 * Audit V6, sécurité : contenus non publiés (blocs d'article, programme d'un événement),
 * rattachement d'une fiche intervenant au compte d'un tiers.
 */
const ArticleBlockService = require('../../services/articleBlockService');
const ProgrammeService = require('../../services/programmeService');

describe('Blocs d’un article non publié', () => {
  const makeSvc = (statut) => {
    const svc = Object.create(ArticleBlockService.prototype);
    svc.models = { Article: { findByPk: jest.fn(async () => ({ id_article: 6, Oeuvre: { saisi_par: 37, statut } })) }, Oeuvre: {} };
    svc.repository = { findByArticle: jest.fn(async () => [{ id_block: 1, visible: true }, { id_block: 2, visible: false }]) };
    return svc;
  };

  test('brouillon : introuvable pour un visiteur, lisible par l’auteur et la modération', async () => {
    expect(await makeSvc('brouillon').getBlocksVisibles(6, 'article', null)).toEqual({ error: 'notFound' });
    expect(await makeSvc('en_attente').getBlocksVisibles(6, 'article', { id_user: 99 })).toEqual({ error: 'notFound' });
    expect((await makeSvc('brouillon').getBlocksVisibles(6, 'article', { id_user: 37 })).data).toHaveLength(2);
    expect((await makeSvc('rejete').getBlocksVisibles(6, 'article', { id_user: 1, isModerateur: true })).data).toHaveLength(2);
  });

  test('publié : visible de tous, sans les blocs masqués', async () => {
    const { data } = await makeSvc('publie').getBlocksVisibles(6, 'article', null);
    expect(data.map(b => b.id_block)).toEqual([1]);
  });
});

describe('Programme d’un événement non publié', () => {
  const svc = (statut) => {
    const s = Object.create(ProgrammeService.prototype);
    s.models = { Evenement: { findByPk: jest.fn(async () => ({ id_evenement: 70, id_user: 37, statut })) } };
    return s;
  };
  test('brouillon ou en attente : organisateur et modération seulement', async () => {
    expect(await svc('brouillon').evenementVisible(70, null)).toBe(false);
    expect(await svc('en_attente').evenementVisible(70, { id_user: 8 })).toBe(false);
    expect(await svc('brouillon').evenementVisible(70, { id_user: 37 })).toBe(true);
    expect(await svc('planifie').evenementVisible(70, null)).toBe(true);
  });
});

describe('Fiche intervenant créée depuis un programme', () => {
  const makeSvc = ({ compteEmail = null, dejaRelie = false } = {}) => {
    const s = Object.create(ProgrammeService.prototype);
    const create = jest.fn(async (data) => ({ id_intervenant: 500, ...data }));
    s.models = {
      Intervenant: {
        findByPk: jest.fn(async () => null),
        findOne: jest.fn(async ({ where }) => (where.id_user && dejaRelie ? { id_intervenant: 9 } : null)),
        findAll: jest.fn(async () => []),
        create
      },
      User: { findOne: jest.fn(async () => (compteEmail ? { id_user: compteEmail } : null)) }
    };
    s.repository = { model: { sequelize: { where: jest.fn(), fn: jest.fn(), col: jest.fn(), literal: jest.fn() } } };
    s._prepareMultiLang = (v) => ({ fr: v });
    return { s, create };
  };

  test('le numéro de compte envoyé par l’organisateur est ignoré', async () => {
    const { s, create } = makeSvc();
    await s._resolveIntervenant({ nom: 'Benali', prenom: 'Amina', id_user: 42 });
    expect(create.mock.calls[0][0].id_user).toBeNull();
  });

  test('e-mail d’un compte : relié, sauf si ce compte a déjà sa fiche', async () => {
    const libre = makeSvc({ compteEmail: 12 });
    await libre.s._resolveIntervenant({ nom: 'Benali', prenom: 'Amina', email: 'amina@example.com' });
    expect(libre.create.mock.calls[0][0].id_user).toBe(12);
    const pris = makeSvc({ compteEmail: 12, dejaRelie: true });
    await pris.s._resolveIntervenant({ nom: 'Benali', prenom: 'Amina', email: 'amina@example.com' });
    expect(pris.create.mock.calls[0][0].id_user).toBeNull();
  });
});
