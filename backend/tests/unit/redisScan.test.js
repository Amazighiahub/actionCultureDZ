/**
 * SCAN avec node-redis v5 : le curseur est du texte (« 0 »). Un curseur numérique faisait
 * échouer chaque invalidation de cache en silence (listes périmées jusqu'à expiration).
 */
const { parcourirCles } = require('../../utils/redisScan');

// Client qui se comporte comme node-redis v5 : refuse un curseur numérique, renvoie du texte
const clientV5 = (pages) => ({
  scan: jest.fn(async (cursor) => {
    if (typeof cursor !== 'string') throw new TypeError('"arguments[1]" must be of type "string | Buffer"');
    const i = Number(cursor);
    return { cursor: i + 1 < pages.length ? String(i + 1) : '0', keys: pages[i] };
  })
});

describe('parcourirCles (SCAN)', () => {
  it('parcourt toutes les pages avec un curseur texte, jusqu’au retour à « 0 »', async () => {
    const redis = clientV5([['cache:a'], [], ['cache:b', 'cache:c']]);
    const vus = [];
    await parcourirCles(redis, 'cache:*', async (keys) => { vus.push(...keys); });
    expect(vus).toEqual(['cache:a', 'cache:b', 'cache:c']);
    expect(redis.scan).toHaveBeenCalledTimes(3);
    expect(redis.scan).toHaveBeenNthCalledWith(1, '0', { MATCH: 'cache:*', COUNT: 200 });
  });

  it('accepte aussi le curseur numérique de node-redis v4', async () => {
    const redis = { scan: jest.fn().mockResolvedValueOnce({ cursor: 5, keys: ['k1'] }).mockResolvedValueOnce({ cursor: 0, keys: ['k2'] }) };
    const vus = [];
    await parcourirCles(redis, 'x*', async (keys) => { vus.push(...keys); });
    expect(vus).toEqual(['k1', 'k2']);
  });
});

describe('Invalidation du cache des réponses (Redis v5)', () => {
  it('supprime les entrées Redis du motif, y compris celles d’un compte (userCache)', async () => {
    jest.resetModules();
    const redis = {
      ...clientV5([['cache:user:37:fr:/api/professionnel/evenements?limit=50']]),
      del: jest.fn().mockResolvedValue(1)
    };
    jest.doMock('../../utils/redisClient', () => ({ getClient: () => redis, isReady: () => true }));
    const cacheMiddleware = require('../../middlewares/cacheMiddleware');
    await cacheMiddleware.clearCache('professionnel');
    expect(redis.del).toHaveBeenCalledWith(['cache:user:37:fr:/api/professionnel/evenements?limit=50']);
  });
});
