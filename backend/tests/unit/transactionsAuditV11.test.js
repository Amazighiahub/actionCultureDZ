/**
 * Audit V11, base de données (BDD-8, 10, 11, 13, 17) : lectures dans la transaction qui écrit,
 * verrous posés là où deux enregistrements simultanés pouvaient se marcher dessus.
 */
jest.mock('../../utils/redisClient', () => ({ getClient: () => null, getRedisClient: async () => null, isReady: () => false }));
const ProgrammeService = require('../../services/programmeService');
const ProgrammeRepository = require('../../repositories/programmeRepository');
const BaseSubtypeService = require('../../services/oeuvre/subtypes/baseSubtypeService');
const OrganisationService = require('../../services/organisations/organisationService');
const OrganisationRepository = require('../../repositories/organisationRepository');
const UserService = require('../../services/user/userService');
const { creerSites, retirerSites } = require('../../utils/lieuxPrepares');

const T = { id: 'transaction', finished: false, commit: jest.fn(), rollback: jest.fn() };

describe('programmes (BDD-11) : une connexion par requête, événement verrouillé', () => {
  const fabriquer = ({ evenement = { id_evenement: 5, id_user: 7, statut: 'publie' }, programme } = {}) => {
    const repository = {
      model: { sequelize: { transaction: jest.fn(async () => T) }, findByPk: jest.fn(async () => programme), update: jest.fn() },
      create: jest.fn(async (d) => ({ id_programme: 1, ...d })),
      getNextOrdre: jest.fn(async () => 3)
    };
    const models = { Evenement: { findByPk: jest.fn(async () => evenement) }, Lieu: { findByPk: jest.fn(async () => ({ id_lieu: 2 })) } };
    const service = new ProgrammeService(repository, { models });
    service._getProgrammeComplet = jest.fn(async (id) => ({ id_programme: id }));
    service._lierIntervenants = jest.fn();
    return { service, repository, models };
  };

  beforeEach(() => jest.clearAllMocks());

  it('ajout : événement et lieu lus dans la transaction, événement verrouillé, ordre calculé dedans', async () => {
    const { service, repository, models } = fabriquer();
    await service.createProgramme(5, 7, 'fr', { titre: 'Atelier', id_lieu: 2 });
    expect(models.Evenement.findByPk).toHaveBeenCalledWith(5, { transaction: T, lock: 'UPDATE' });
    expect(models.Lieu.findByPk).toHaveBeenCalledWith(2, { transaction: T });
    expect(repository.getNextOrdre).toHaveBeenCalledWith(5, { transaction: T });
    expect(T.commit).toHaveBeenCalled();
  });

  it('ajout sur l’événement d’un autre : refusé, transaction annulée, rien créé', async () => {
    const { service, repository } = fabriquer({ evenement: { id_evenement: 5, id_user: 99, statut: 'publie' } });
    expect(await service.createProgramme(5, 7, 'fr', { titre: 'x' })).toEqual({ error: 'forbidden' });
    expect(T.rollback).toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it.each([
    ['updateProgramme', (s) => s.updateProgramme(4, 7, 'fr', { titre: 'Nouveau' })],
    ['updateStatut', (s) => s.updateStatut(4, 7, 'en_cours')],
    ['duplicateProgramme', (s) => s.duplicateProgramme(4, 7)],
    ['deleteProgramme', (s) => s.deleteProgramme(4, 7)]
  ])('%s : activité et événement relus dans la transaction, verrouillés', async (_, appel) => {
    const programme = { id_programme: 4, id_evenement: 5, statut: 'planifie', titre: { fr: 'A' }, Evenement: { id_user: 7, statut: 'publie' }, update: jest.fn(), destroy: jest.fn() };
    const { service, repository } = fabriquer({ programme });
    service.models.ProgrammeIntervenant = { destroy: jest.fn(), findAll: jest.fn(async () => []) };
    service.models.Intervenant = {};
    await appel(service);
    expect(repository.model.findByPk).toHaveBeenCalledWith(4, expect.objectContaining({ transaction: T, lock: 'UPDATE' }));
  });

  it('copie : ordre calculé dans la transaction', async () => {
    const programme = { id_programme: 4, id_evenement: 5, Evenement: { id_user: 7, statut: 'publie' } };
    const { service, repository } = fabriquer({ programme });
    await service.duplicateProgramme(4, 7);
    expect(repository.getNextOrdre).toHaveBeenCalledWith(5, { transaction: T });
  });

  it('réordonner : événement lu dans la transaction ; autre compte refusé', async () => {
    const { service, models } = fabriquer({ evenement: { id_evenement: 5, id_user: 99 } });
    expect(await service.reorderProgrammes(5, 7, [{ id: 1, ordre: 1 }])).toEqual({ error: 'forbidden' });
    expect(models.Evenement.findByPk).toHaveBeenCalledWith(5, { transaction: T, lock: 'UPDATE' });
    expect(T.rollback).toHaveBeenCalled();
  });

  it('getNextOrdre transmet la transaction', async () => {
    const max = jest.fn(async () => 4);
    const repo = new ProgrammeRepository({ Programme: { max, sequelize: {} } });
    expect(await repo.getNextOrdre(5, { transaction: T })).toBe(5);
    expect(max).toHaveBeenCalledWith('ordre', { where: { id_evenement: 5 }, transaction: T });
  });
});

describe('sous-types d’œuvre (BDD-8) : existence vérifiée dans la transaction, sous verrou', () => {
  class Sub extends BaseSubtypeService { _buildUpdateData(ds) { return { ...ds }; } }

  it('avec transaction : findOne verrouillé dans la transaction', async () => {
    const existant = { update: jest.fn() };
    const Livre = { findOne: jest.fn(async () => existant), create: jest.fn() };
    await new Sub('Livre', { Livre }).updateForOeuvre(9, { isbn: '1' }, T);
    expect(Livre.findOne).toHaveBeenCalledWith({ where: { id_oeuvre: 9 }, transaction: T, lock: 'UPDATE' });
    expect(existant.update).toHaveBeenCalledWith({ isbn: '1' }, { transaction: T });
  });

  it('sous-type absent : créé dans la même transaction', async () => {
    const Livre = { findOne: jest.fn(async () => null), create: jest.fn(async (d) => d) };
    await new Sub('Livre', { Livre }).updateForOeuvre(9, { isbn: '1' }, T);
    expect(Livre.create).toHaveBeenCalledWith(expect.objectContaining({ id_oeuvre: 9 }), { transaction: T });
  });

  it('sans transaction : pas de verrou', async () => {
    const Livre = { findOne: jest.fn(async () => ({ update: jest.fn() })) };
    await new Sub('Livre', { Livre }).updateForOeuvre(9, { isbn: '1' });
    expect(Livre.findOne).toHaveBeenCalledWith({ where: { id_oeuvre: 9 } });
  });
});

describe('organisation (BDD-13) : création et responsable dans une même transaction', () => {
  const fabriquer = ({ lienEchoue = false } = {}) => {
    const repository = {
      findByName: jest.fn(async () => null),
      create: jest.fn(async (d) => ({ id_organisation: 12, ...d })),
      linkUser: jest.fn(async () => { if (lienEchoue) throw new Error('lien'); }),
      withTransaction: jest.fn(async (f) => f(T))
    };
    const service = new OrganisationService(repository, {});
    service._prevenirModeration = jest.fn();
    return { service, repository };
  };

  it('create et linkUser reçoivent la transaction ; modération prévenue après', async () => {
    const { service, repository } = fabriquer();
    const res = await service.create({ nom: 'Association Imzad', id_type_organisation: 1 }, 7);
    expect(res).toMatchObject({ created: true, organisation: { id_organisation: 12 } });
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ statut: 'en_attente' }), { transaction: T });
    expect(repository.linkUser).toHaveBeenCalledWith(7, 12, 'responsable', { transaction: T });
    expect(service._prevenirModeration).toHaveBeenCalled();
  });

  it('lien impossible : erreur remontée, modération pas prévenue', async () => {
    const { service } = fabriquer({ lienEchoue: true });
    await expect(service.create({ nom: 'Association Tinhinan', id_type_organisation: 1 }, 7)).rejects.toThrow('lien');
    expect(service._prevenirModeration).not.toHaveBeenCalled();
  });

  it('dépôt : la transaction arrive à create et à findOrCreate', async () => {
    const create = jest.fn(async (d) => d);
    const findOrCreate = jest.fn(async () => [{}]);
    const repo = new OrganisationRepository({ Organisation: { create }, UserOrganisation: { findOrCreate } });
    await repo.create({ nom: 'x' }, { transaction: T });
    await repo.linkUser(7, 12, 'responsable', { transaction: T });
    expect(create).toHaveBeenCalledWith({ nom: 'x' }, { transaction: T });
    expect(findOrCreate).toHaveBeenCalledWith(expect.objectContaining({ transaction: T, defaults: { role: 'responsable', actif: true } }));
  });
});

describe('connexions (BDD-17) : plus de purge de toute la table à chaque connexion', () => {
  it('_saveRefreshToken ne supprime que les connexions expirées de la personne', async () => {
    const SessionConnexion = { destroy: jest.fn(), findAll: jest.fn(async () => []), create: jest.fn(async () => ({ id_session: 1 })) };
    const service = new UserService({}, { models: { SessionConnexion } });
    service.models = { SessionConnexion };
    await service._saveRefreshToken(7, 'jeton', T);
    expect(SessionConnexion.destroy).toHaveBeenCalledTimes(1);
    const { where, transaction } = SessionConnexion.destroy.mock.calls[0][0];
    expect(where.id_user).toBe(7);
    expect(transaction).toBe(T);
  });
});

describe('lieux préparés (BDD-10)', () => {
  const sequelize = () => {
    const appels = [];
    const s = {
      appels,
      QueryTypes: { SELECT: 'SELECT' },
      transaction: jest.fn(async (f) => f(T)),
      query: jest.fn(async (sql, options) => {
        appels.push({ sql, options });
        if (/SELECT c\.id_commune/.test(sql)) return [{ id_commune: 30 }];
        if (/SELECT COUNT/.test(sql)) return [{ n: 0 }];
        if (/SELECT l\.id_lieu/.test(sql)) return [{ id_lieu: 41 }];
        if (/^\s*SELECT/.test(sql)) return [];
        if (/INSERT INTO lieu/.test(sql)) return [40, 1];
        return [0, 1];
      })
    };
    return s;
  };
  const SITES = [{ commune: 'Tazoult', nom: { fr: 'Lambèse' }, latitude: 1, longitude: 2, typePatrimoine: 'site_archeologique',
    points: [{ commune: 'Tazoult', nom: { fr: 'Arc' }, latitude: 1, longitude: 2, typePatrimoine: 'monument' }] }];

  it('creerSites : chaque lecture et écriture passe par la transaction', async () => {
    const s = sequelize();
    await creerSites({ sequelize: s }, SITES, { wilayaId: 5, idCreateur: 75 });
    expect(s.transaction).toHaveBeenCalled();
    expect(s.appels.length).toBeGreaterThan(5);
    expect(s.appels.every((a) => a.options.transaction === T)).toBe(true);
  });

  it('retirerSites : limité à la wilaya et aux comptes donnés, dans une transaction', async () => {
    const s = sequelize();
    await retirerSites({ sequelize: s }, SITES, { wilayaId: 5, createurs: [75, null] });
    const lecture = s.appels[0];
    expect(lecture.sql).toMatch(/d\.wilayaId = \?/);
    expect(lecture.sql).toMatch(/l\.id_createur IS NULL OR l\.id_createur IN \(\?\)/);
    expect(lecture.options.replacements).toEqual([5, ['Lambèse', 'Arc'], [75]]);
    expect(s.appels.every((a) => a.options.transaction === T)).toBe(true);
    expect(s.appels.filter((a) => /^DELETE/.test(a.sql))).toHaveLength(3);
  });

  it('retirerSites sans wilaya : refusé (plus de descente sur toute la base)', async () => {
    await expect(retirerSites({ sequelize: sequelize() }, SITES)).rejects.toThrow('wilayaId');
  });
});
