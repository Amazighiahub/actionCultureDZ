/**
 * Audit V11 BDD-17 et BDD-19 : verrou des tâches planifiées (GET_LOCK sur une connexion réservée,
 * tâche sautée si le verrou est incertain) et purge des connexions expirées la nuit.
 */
jest.mock('../../utils/redisClient', () => ({ getClient: () => null, getRedisClient: async () => null, isReady: () => false }));
jest.mock('node-cron', () => ({ schedule: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })) }));
const cron = require('node-cron');
const CronLock = require('../../utils/cronLock');

const fabriquer = ({ ok = 1, erreurAcquisition = null, erreurLiberation = null } = {}) => {
  const requetes = [];
  const connexion = {
    query: jest.fn(({ sql, values }, cb) => {
      requetes.push({ sql, values });
      if (/GET_LOCK/.test(sql)) return erreurAcquisition ? cb(erreurAcquisition) : cb(null, [{ ok }]);
      return erreurLiberation ? cb(erreurLiberation) : cb(null, [{ ok: 1 }]);
    })
  };
  const connectionManager = {
    getConnection: jest.fn(async () => connexion),
    releaseConnection: jest.fn(),
    destroyConnection: jest.fn(async () => {})
  };
  const verrou = new CronLock({ config: { database: 'taladz' }, connectionManager });
  return { verrou, connexion, connectionManager, requetes };
};

describe('CronLock', () => {
  it('verrou pris : la tâche tourne, puis verrou libéré et connexion rendue', async () => {
    const { verrou, connectionManager, requetes } = fabriquer();
    const tache = jest.fn();
    expect(await verrou.withLock('weekly-newsletter', tache)).toBe(true);
    expect(tache).toHaveBeenCalled();
    expect(requetes.map((r) => r.sql)).toEqual(['SELECT GET_LOCK(?, 0) AS ok', 'SELECT RELEASE_LOCK(?) AS ok']);
    expect(requetes[0].values).toEqual(['taladz:cron:weekly-newsletter']);
    expect(connectionManager.releaseConnection).toHaveBeenCalledTimes(1);
  });

  it('verrou déjà pris ailleurs : tâche sautée, connexion rendue', async () => {
    const { verrou, connectionManager } = fabriquer({ ok: 0 });
    const tache = jest.fn();
    expect(await verrou.withLock('event-reminders', tache)).toBe(false);
    expect(tache).not.toHaveBeenCalled();
    expect(connectionManager.releaseConnection).toHaveBeenCalledTimes(1);
  });

  it('erreur SQL en prenant le verrou : tâche sautée (plus de passage sans verrou)', async () => {
    const { verrou, connectionManager } = fabriquer({ erreurAcquisition: new Error('Lost connection') });
    const tache = jest.fn();
    expect(await verrou.withLock('event-reminders', tache)).toBe(false);
    expect(tache).not.toHaveBeenCalled();
    expect(connectionManager.destroyConnection).toHaveBeenCalled();
  });

  it('base injoignable : tâche sautée', async () => {
    const { verrou, connectionManager } = fabriquer();
    connectionManager.getConnection.mockRejectedValue(new Error('ECONNREFUSED'));
    const tache = jest.fn();
    expect(await verrou.withLock('event-reminders', tache)).toBe(false);
    expect(tache).not.toHaveBeenCalled();
  });

  it('tâche en erreur : verrou libéré quand même', async () => {
    const { verrou, requetes } = fabriquer();
    await expect(verrou.withLock('x', async () => { throw new Error('boum'); })).rejects.toThrow('boum');
    expect(requetes.some((r) => /RELEASE_LOCK/.test(r.sql))).toBe(true);
  });

  it('libération impossible : connexion détruite (MySQL libère alors le verrou)', async () => {
    const { verrou, connectionManager } = fabriquer({ erreurLiberation: new Error('gone') });
    await verrou.withLock('x', jest.fn());
    expect(connectionManager.destroyConnection).toHaveBeenCalled();
    expect(connectionManager.releaseConnection).not.toHaveBeenCalled();
  });
});

describe('cronService', () => {
  const cronService = require('../../services/cronService');

  it('purge de nuit : connexions expirées supprimées par lots', async () => {
    const destroy = jest.fn().mockResolvedValueOnce(5000).mockResolvedValueOnce(12);
    cronService.models = { SessionConnexion: { destroy }, EmailVerification: { destroy: jest.fn(async () => 0) } };
    jest.spyOn(require('../../services/newsletterAbonnes'), 'purgerNonConfirmes').mockResolvedValue(0);
    await cronService.cleanExpiredTokens();
    expect(destroy).toHaveBeenCalledTimes(2);
    expect(destroy.mock.calls[0][0]).toMatchObject({ limit: 5000 });
    expect(destroy.mock.calls[0][0].where.expire_le).toBeDefined();
  });

  it('journal d’audit et fichiers temporaires : planifiés par cronService (sous verrou), une seule fois', () => {
    cron.schedule.mockClear();
    cronService.jobs = new Map();
    cronService.configurer({ auditLogs: true, auditLogRetentionDays: 400 });
    cronService.scheduleJobs();
    const noms = [...cronService.jobs.keys()];
    expect(noms).toContain('clean-old-audit-logs');
    expect(noms.filter((n) => n === 'clean-temp-files')).toHaveLength(1);
    cronService.jobs = new Map();
  });

  it('journal d’audit : lignes plus vieilles que la durée réglée, par lots', async () => {
    const destroy = jest.fn().mockResolvedValue(3);
    cronService.models = { AuditLog: { destroy } };
    cronService.configurer({ auditLogRetentionDays: 400 });
    expect(await cronService.cleanOldAuditLogs()).toBe(3);
    const limite = destroy.mock.calls[0][0].where.date_action;
    const date = Object.getOwnPropertySymbols(limite).map((k) => limite[k])[0];
    expect(Math.round((Date.now() - date.getTime()) / 86400000)).toBe(400);
  });
});
