/**
 * Propositions de modification d'un article : brouillon jusqu'à la décision de l'auteur ou de
 * l'administration, notifications, contrôles du contenu, remplacement à l'acceptation.
 */
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));
const { Op } = require('sequelize');
const ArticleRevisionService = require('../../services/oeuvre/articleRevisionService');

const AUTEUR = 60, PROPOSANT = 77, ADMIN = 1;
const blocsOk = [
  { type_block: 'text', contenu: 'Nouveau paragraphe' },
  { type_block: 'image', metadata: { url: 'https://res.cloudinary.com/demo/image/upload/v1/patio.jpg', caption: 'Le patio' } }
];

const make = ({ oeuvre = {}, enAttente = 0, revision = null, mediasArticle = [] } = {}) => {
  const oeuvreObj = { id_oeuvre: 57, titre: { fr: 'La maison de la Casbah' }, description: { fr: 'Chapeau' }, id_type_oeuvre: 4, statut: 'publie', saisi_par: AUTEUR, update: jest.fn(), ...oeuvre };
  const crees = [];
  const models = {
    Oeuvre: { findByPk: jest.fn().mockResolvedValue(oeuvreObj), sequelize: { transaction: jest.fn(async (cb) => cb({})) } },
    ArticleRevision: {
      count: jest.fn().mockResolvedValue(enAttente),
      create: jest.fn(async (d) => ({ id_revision: 5, ...d })),
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(revision)
    },
    Media: {
      findAll: jest.fn().mockResolvedValue(mediasArticle.map(id => ({ id_media: id }))),
      create: jest.fn(async (d) => ({ id_media: 99, ...d }))
    },
    User: { findByPk: jest.fn().mockResolvedValue({ prenom: 'Amel', nom: 'B.' }), findAll: jest.fn().mockResolvedValue([{ id_user: ADMIN }]) },
    Role: {},
    Article: { findOne: jest.fn().mockResolvedValue({ id_article: 9 }) },
    ArticleScientifique: { findOne: jest.fn() },
    ArticleBlock: { destroy: jest.fn(), create: jest.fn(async (d) => { crees.push(d); return d; }) }
  };
  const notificationService = { sendToUser: jest.fn() };
  return { service: new ArticleRevisionService(models, { notificationService }), models, notificationService, crees, oeuvreObj };
};

describe('proposer', () => {
  it('crée un brouillon et notifie l’auteur de l’article et l’administration (pas le proposant)', async () => {
    const { service, models, notificationService } = make();
    const r = await service.proposer(57, { motif: 'Ajout d’une photo du patio', blocks: blocsOk }, { userId: PROPOSANT });
    expect(r.statut).toBe('en_attente');
    expect(models.ArticleRevision.create).toHaveBeenCalledWith(expect.objectContaining({ id_auteur: PROPOSANT, motif: 'Ajout d’une photo du patio' }));
    const destinataires = notificationService.sendToUser.mock.calls.map(c => c[0]).sort();
    expect(destinataires).toEqual([ADMIN, AUTEUR].sort());
    expect(notificationService.sendToUser.mock.calls[0][1]).toMatchObject({ url_action: '/articles/57?proposition=5' });
  });

  it('l’auteur de l’article modifie directement : pas de proposition', async () => {
    await expect(make().service.proposer(57, { motif: 'Correction', blocks: blocsOk }, { userId: AUTEUR })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('motif obligatoire, article publié seulement, trois propositions en attente au plus', async () => {
    await expect(make().service.proposer(57, { motif: 'ok', blocks: blocsOk }, { userId: PROPOSANT })).rejects.toMatchObject({ statusCode: 400 });
    await expect(make({ oeuvre: { statut: 'brouillon' } }).service.proposer(57, { motif: 'Correction de date', blocks: blocsOk }, { userId: PROPOSANT })).rejects.toMatchObject({ statusCode: 400 });
    await expect(make({ enAttente: 3 }).service.proposer(57, { motif: 'Correction de date', blocks: blocsOk }, { userId: PROPOSANT })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('images : envoyées sur le site ou déjà dans l’article ; une adresse extérieure est refusée', async () => {
    const ext = [{ type_block: 'image', metadata: { url: 'https://exemple.com/photo.jpg' } }];
    await expect(make().service.proposer(57, { motif: 'Nouvelle photo', blocks: ext }, { userId: PROPOSANT })).rejects.toMatchObject({ statusCode: 400 });
    const existante = [{ type_block: 'image', id_media: 15, metadata: { caption: 'Terrasses' } }];
    const { service, models } = make({ mediasArticle: [15] });
    await service.proposer(57, { motif: 'Réorganisation', blocks: existante }, { userId: PROPOSANT });
    expect(models.ArticleRevision.create.mock.calls[0][0].contenu.blocks[0]).toMatchObject({ id_media: 15 });
    // une photo d'un autre article : refusée
    await expect(make({ mediasArticle: [] }).service.proposer(57, { motif: 'Réorganisation', blocks: existante }, { userId: PROPOSANT })).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('lister', () => {
  it('auteur et administration voient tout ; les autres : les leurs et les modifications acceptées', async () => {
    const auteur = make();
    expect((await auteur.service.lister(57, { userId: AUTEUR })).peut_decider).toBe(true);
    expect(auteur.models.ArticleRevision.findAll.mock.calls[0][0].where).toEqual({ id_oeuvre: 57 });
    const visiteur = make();
    expect((await visiteur.service.lister(57, { userId: PROPOSANT })).peut_decider).toBe(false);
    // Condition « acceptées ou les miennes » (Op.or, clé symbole)
    const where = visiteur.models.ArticleRevision.findAll.mock.calls[0][0].where;
    expect(where[Op.or]).toEqual([{ statut: 'acceptee' }, { id_auteur: PROPOSANT }]);
  });
});

describe('decider', () => {
  const enAttente = () => ({
    id_revision: 5, id_oeuvre: 57, id_auteur: PROPOSANT, statut: 'en_attente', update: jest.fn(),
    contenu: { titre: { fr: 'La maison de la Casbah (complétée)' }, description: null, blocks: blocsOk }
  });

  it('accepter : titre mis à jour, blocs remplacés, nouvelle photo ajoutée à l’article, proposant notifié', async () => {
    const revision = enAttente();
    const { service, models, notificationService, crees, oeuvreObj } = make({ revision });
    await service.decider(57, 5, { decision: 'accepter' }, { userId: AUTEUR });
    expect(oeuvreObj.update).toHaveBeenCalledWith(expect.objectContaining({ titre: expect.objectContaining({ fr: 'La maison de la Casbah (complétée)' }) }), expect.anything());
    expect(models.ArticleBlock.destroy).toHaveBeenCalledWith(expect.objectContaining({ where: { id_article: 9, article_type: 'article' } }));
    expect(models.Media.create).toHaveBeenCalledWith(expect.objectContaining({ id_oeuvre: 57, url: 'https://res.cloudinary.com/demo/image/upload/v1/patio.jpg' }), expect.anything());
    expect(crees.map(b => b.type_block)).toEqual(['text', 'image']);
    expect(crees[1]).toMatchObject({ id_media: 99, metadata: { caption: 'Le patio' } });
    expect(revision.update).toHaveBeenCalledWith(expect.objectContaining({ statut: 'acceptee', id_decideur: AUTEUR }), expect.anything());
    expect(notificationService.sendToUser).toHaveBeenCalledWith(PROPOSANT, expect.objectContaining({ titre: 'Proposition acceptée' }));
  });

  it('refuser : motif obligatoire, l’article ne change pas, proposant notifié', async () => {
    const revision = enAttente();
    const { service, models, notificationService } = make({ revision });
    await expect(service.decider(57, 5, { decision: 'refuser', motif_refus: '' }, { userId: AUTEUR })).rejects.toMatchObject({ statusCode: 400 });
    await service.decider(57, 5, { decision: 'refuser', motif_refus: 'La date est déjà correcte' }, { userId: AUTEUR });
    expect(models.ArticleBlock.destroy).not.toHaveBeenCalled();
    expect(revision.update).toHaveBeenCalledWith(expect.objectContaining({ statut: 'refusee', motif_refus: 'La date est déjà correcte' }));
    expect(notificationService.sendToUser).toHaveBeenCalledWith(PROPOSANT, expect.objectContaining({ titre: 'Proposition refusée' }));
  });

  it('seuls l’auteur de l’article et l’administration décident ; une proposition traitée ne l’est qu’une fois', async () => {
    await expect(make({ revision: enAttente() }).service.decider(57, 5, { decision: 'accepter' }, { userId: PROPOSANT })).rejects.toMatchObject({ statusCode: 403 });
    await make({ revision: enAttente() }).service.decider(57, 5, { decision: 'accepter' }, { userId: ADMIN, isModerator: true });
    await expect(make({ revision: { ...enAttente(), statut: 'acceptee' } }).service.decider(57, 5, { decision: 'accepter' }, { userId: AUTEUR })).rejects.toMatchObject({ statusCode: 400 });
  });
});
