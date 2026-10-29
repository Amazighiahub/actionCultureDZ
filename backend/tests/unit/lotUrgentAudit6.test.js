/**
 * Lot urgent de l'audit V6 : cycle de vie des événements (tâches planifiées), profil d'un
 * participant vu par l'organisateur, recherche de mots-clés.
 * (La suppression de compte et les liens Wikipédia ont été vérifiés sur la base locale.)
 */
const { Op } = require('sequelize');
const cron = require('../../services/cronService');
const EvenementRepository = require('../../repositories/evenementRepository');

describe('Tâches planifiées : un événement publié peut être « planifie » (posé par le modèle)', () => {
  const appels = [];
  beforeAll(() => {
    cron.models = {
      Evenement: {
        findAll: jest.fn(async (opts) => { appels.push(['findAll', opts.where]); return []; }),
        update: jest.fn(async (champs, opts) => { appels.push(['update', champs.statut, opts.where]); return [0]; })
      },
      Lieu: {}, TypeEvenement: {}
    };
    cron.services = { notificationService: {} };
  });

  test('rappels de la veille et d’une heure avant : publie et planifie', async () => {
    await cron.sendEventReminders();
    await cron.checkUpcomingEvents();
    const statuts = appels.filter(a => a[0] === 'findAll').map(a => a[1].statut);
    expect(statuts).toEqual([['publie', 'planifie'], ['publie', 'planifie']]);
  });

  test('passage à « en_cours » et à « termine », y compris depuis « en_cours »', async () => {
    await cron.updateEventStatuses();
    const maj = Object.fromEntries(appels.filter(a => a[0] === 'update').map(a => [a[1], a[2].statut]));
    expect(maj.en_cours).toEqual(['publie', 'planifie']);
    expect(maj.termine).toEqual(['publie', 'planifie', 'en_cours']);
  });
});

describe('Profil d’un participant vu par l’organisateur', () => {
  const makeRepo = (user) => {
    const repo = Object.create(EvenementRepository.prototype);
    const findByPk = jest.fn(async () => user);
    repo.models = { User: { findByPk }, TypeUser: {}, Wilaya: {}, Oeuvre: {} };
    return { repo, findByPk };
  };
  const user = (telephone_public) => ({
    telephone: '0550000000', telephone_public,
    setDataValue(k, v) { this[k] = v; }
  });

  test('jamais la date de naissance, l’adresse, les documents ni l’état du compte', async () => {
    const { repo, findByPk } = makeRepo(user(true));
    await repo.getParticipantProfile(5);
    const attributs = findByPk.mock.calls[0][1].attributes;
    expect(Array.isArray(attributs)).toBe(true);
    for (const prive of ['password', 'date_naissance', 'adresse', 'documents_fournis', 'suspension_motif', 'raison_rejet', 'ip_inscription']) {
      expect(attributs).not.toContain(prive);
    }
  });

  test('téléphone seulement s’il est public', async () => {
    expect((await makeRepo(user(false)).repo.getParticipantProfile(5)).telephone).toBeNull();
    expect((await makeRepo(user(true)).repo.getParticipantProfile(5)).telephone).toBe('0550000000');
  });
});

describe('Recherche de mots-clés', () => {
  test('table « oeuvretags » et recherche sans tenir compte des majuscules', async () => {
    const MetadataService = require('../../services/metadataService');
    const svc = Object.create(MetadataService.prototype);
    const findAll = jest.fn(async () => []);
    const sequelize = require('sequelize');
    svc.models = { TagMotCle: { findAll }, OeuvreTag: {} };
    svc.sequelize = { fn: sequelize.fn, col: sequelize.col, literal: sequelize.literal, where: sequelize.where };
    svc.cache = { getOrSet: async (_k, f) => f() };
    await svc.getTags({ search: 'SAH' });
    const opts = findAll.mock.calls[0][0];
    expect(JSON.stringify(opts.attributes)).toContain('FROM oeuvretags');
    expect(JSON.stringify(opts.where)).toContain('%sah%');
    expect(opts.where.logic[Op.ne]).toBeNull();
  });
});
