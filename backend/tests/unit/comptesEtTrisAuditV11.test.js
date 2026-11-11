/**
 * Audit V11 BDD-12, BDD-15, BDD-18 : total des listes sans jointures inutiles, plafonds de pagination,
 * tri par nom commun, statistiques publiques sans brouillons, cloche en une requête.
 */
const { Op, literal } = require('sequelize');
const BaseRepository = require('../../repositories/baseRepository');
const { jointuresDuCompte } = require('../../repositories/baseRepository');
const { bornerPagination } = require('../../utils/pagination');
const { triParNom } = require('../../utils/triParNom');
const colonnes = require('../../utils/colonnesCalculees');
const EvenementRepository = require('../../repositories/evenementRepository');
const OeuvreRepository = require('../../repositories/oeuvreRepository');
const NotificationRepository = require('../../repositories/notificationRepository');

const sqlDe = (ordre) => ordre.map(([e, sens]) => `${e.val || e} ${sens}`).join(', ');

describe('pagination bornée (BDD-12)', () => {
  it('taille 1..100, page 1..500, valeurs invalides ramenées', () => {
    expect(bornerPagination(99999, 1000)).toEqual({ page: 500, limit: 100 });
    expect(bornerPagination('abc', '-3')).toEqual({ page: 1, limit: 1 });
    expect(bornerPagination(undefined, undefined, 12)).toEqual({ page: 1, limit: 12 });
    expect(bornerPagination('2', '30')).toEqual({ page: 2, limit: 30 });
  });

  it('_paginate du contrôleur de base suit les mêmes plafonds', () => {
    const BaseController = require('../../controllers/baseController');
    const c = new BaseController();
    expect(c._paginate({ query: { page: '100000', limit: '500' } })).toEqual({ page: 500, limit: 100, offset: 49900 });
    expect(c._paginate({ query: {} }, { limit: 12 })).toEqual({ page: 1, limit: 12, offset: 0 });
  });
});

describe('jointures du total (BDD-12)', () => {
  const Media = { name: 'Media' };
  const Categorie = { name: 'Categorie' };
  const Commune = { name: 'Commune' };
  const Lieu = { name: 'Lieu' };

  it('garde les jointures qui filtrent, retire les facultatives et les « separate »', () => {
    const includes = [
      { model: Media, as: 'Medias', required: false },
      { model: Media, as: 'Photos', separate: true, where: { type: 'image' } },
      { model: Categorie, as: 'Categories', where: { id_categorie: { [Op.in]: [1] } }, through: { attributes: [] } },
      { model: Lieu, as: 'Lieu', include: [{ model: Commune, as: 'Commune', required: true, where: { dairaId: 3 } }] }
    ];
    const res = jointuresDuCompte(includes, { statut: 'publie' });
    expect(res.map((i) => i.as)).toEqual(['Categories', 'Lieu']);
    expect(res[1].include.map((i) => i.as)).toEqual(['Commune']);
    expect(res.every((i) => Array.isArray(i.attributes) && i.attributes.length === 0)).toBe(true);
    // Les includes d'origine ne sont pas modifiés (ils servent ensuite à lire la page)
    expect(includes[2].attributes).toBeUndefined();
  });

  it('filtre principal qui vise une jointure ($Alias.col$ ou SQL qui la nomme) : toutes gardées', () => {
    const includes = [{ model: Lieu, as: 'Lieu', required: false }];
    expect(jointuresDuCompte(includes, { '$Lieu.statut$': 'publie' })).toBeNull();
    expect(jointuresDuCompte(includes, { [Op.and]: [literal('`Lieu`.`statut` = 1')] })).toBeNull();
    expect(jointuresDuCompte(includes, { [Op.and]: [literal('`Oeuvre`.`texte` LIKE 1 OR id_lieu = 2')] })).toEqual([]);
  });

  it('include non standard : on ne tranche pas', () => {
    expect(jointuresDuCompte([{ all: true }], {})).toBeNull();
    expect(jointuresDuCompte([Lieu], {})).toBeNull();
  });

  it('findAll : total avec les seules jointures utiles, puis la page avec toutes ; pas de page si total nul', async () => {
    const model = {
      name: 'Oeuvre',
      primaryKeyAttribute: 'id_oeuvre',
      count: jest.fn().mockResolvedValue(3),
      findAll: jest.fn().mockResolvedValue([{ id: 1 }])
    };
    const repo = new BaseRepository(model);
    const includes = [{ model: Media, as: 'Medias' }, { model: Categorie, as: 'Categories', required: true }];
    const res = await repo.findAll({ where: { statut: 'publie' }, include: includes, page: 9999, limit: 1000 });
    expect(model.count.mock.calls[0][0].include.map((i) => i.as)).toEqual(['Categories']);
    expect(model.count.mock.calls[0][0]).toMatchObject({ distinct: true, col: 'id_oeuvre' });
    expect(model.findAll.mock.calls[0][0]).toMatchObject({ include: includes, limit: 100, offset: 49900 });
    expect(res.pagination).toMatchObject({ page: 500, limit: 100, total: 3 });

    model.count.mockResolvedValue(0);
    model.findAll.mockClear();
    const vide = await repo.findAll({ where: {} });
    expect(model.findAll).not.toHaveBeenCalled();
    expect(vide.data).toEqual([]);
  });
});

describe('tri par nom (BDD-15)', () => {
  beforeEach(() => colonnes._viderPourTests());
  // Modèle factice : la table a-t-elle la colonne nom_tri ? (lu par utils/colonnesCalculees)
  const modele = (name, pk, avecNomTri = false) => ({
    name,
    tableName: name.toLowerCase(),
    primaryKeyAttribute: pk,
    sequelize: { getQueryInterface: () => ({ describeTable: async () => (avecNomTri ? { nom: {}, nom_tri: {} } : { nom: {} }) }) }
  });

  it('français et colonne nom_tri présente : colonne indexée, départagée par la clé', async () => {
    const { order, attributes } = await triParNom(modele('Intervenant', 'id_intervenant', true), { lang: 'fr' });
    expect(sqlDe(order)).toBe('`Intervenant`.`nom_tri` ASC, id_intervenant ASC');
    expect(attributes.include[0][1]).toBe('nom_tri');
  });

  it('autre langue (même avec la colonne) : texte de la langue sans accents ni majuscules', async () => {
    const { order, attributes } = await triParNom(modele('User', 'id_user', true), { lang: 'tz-ltn', direction: 'desc' });
    expect(sqlDe(order)).toBe('JSON_UNQUOTE(JSON_EXTRACT(`User`.`nom`, \'$."tz-ltn"\')) COLLATE utf8mb4_0900_ai_ci DESC, id_user DESC');
    expect(attributes).toBeUndefined();
  });

  it('langue inconnue ou piégée : français', async () => {
    const { order } = await triParNom(modele('Lieu', 'id_lieu'), { lang: "fr') OR 1=1 --" });
    expect(sqlDe(order)).toContain('\'$."fr"\'');
    expect(sqlDe(order)).not.toContain('OR 1=1');
  });
});

describe('statistiques publiques (BDD-18)', () => {
  it('événements : une requête agrégée filtrée sur les statuts visibles, puis la répartition filtrée', async () => {
    const Evenement = {
      sequelize: { escape: (d) => `'${d.toISOString()}'` },
      findOne: jest.fn().mockResolvedValue({ total: '16', upcoming: '10', ongoing: null, thisMonth: '2' }),
      findAll: jest.fn().mockResolvedValue([])
    };
    const repo = new EvenementRepository({ Evenement, TypeEvenement: {} });
    const stats = await repo.getStats({ publiques: true });
    expect(stats).toEqual({ total: 16, upcoming: 10, ongoing: 0, thisMonth: 2, byType: [] });
    const statuts = Evenement.findOne.mock.calls[0][0].where.statut[Op.in];
    expect(statuts).not.toContain('brouillon');
    expect(statuts).not.toContain('en_attente');
    expect(statuts).not.toContain('annule');
    expect(Evenement.findAll.mock.calls[0][0].where).toEqual(Evenement.findOne.mock.calls[0][0].where);

    await repo.getStats();
    expect(Evenement.findOne.mock.calls[1][0].where).toEqual({});
  });

  it('œuvres : publiques = publiées seulement, sans en attente ni refusées', async () => {
    const Oeuvre = {
      findOne: jest.fn().mockResolvedValue({ total: '16', published: '16', pending: '0', rejected: '0' }),
      findAll: jest.fn().mockResolvedValue([{ id_type_oeuvre: 1, count: 5 }])
    };
    const repo = new OeuvreRepository({ Oeuvre });
    const pub = await repo.getStats({ publiques: true });
    expect(Oeuvre.findOne.mock.calls[0][0].where).toEqual({ statut: 'publie' });
    expect(pub).toEqual({ total: 16, published: 16, byType: [{ id_type_oeuvre: 1, count: 5 }] });

    Oeuvre.findOne.mockResolvedValue({ total: '45', published: '16', pending: '2', rejected: '1' });
    const admin = await repo.getStats();
    expect(admin).toMatchObject({ total: 45, published: 16, pending: 2, rejected: 1 });
  });
});

describe('cloche : résumé en une requête groupée (BDD-18)', () => {
  it('total, non lues et non lues par type déduits des lignes groupées', async () => {
    const Notification = {
      findAll: jest.fn()
        .mockResolvedValueOnce([
          { type_notification: 'message', total: '4', nonLues: '3' },
          { type_notification: 'systeme', total: '2', nonLues: '0' }
        ])
        .mockResolvedValueOnce([{ id_notification: 9 }])
    };
    const repo = new NotificationRepository({ Notification, sequelize: {} });
    const res = await repo.getSummary(75);
    expect(res).toEqual({ total: 6, nonLues: 3, parType: { message: 3 }, dernieres: [{ id_notification: 9 }] });
    expect(Notification.findAll.mock.calls[0][0]).toMatchObject({ where: { id_user: 75 }, group: ['type_notification'] });
  });
});
