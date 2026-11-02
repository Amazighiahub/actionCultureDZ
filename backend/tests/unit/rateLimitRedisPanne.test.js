/**
 * Panne de Redis : les limiteurs comptent en mémoire au lieu de faire échouer la requête
 * (avant : toute l'API répondait 500 tant que Redis était absent).
 */
jest.mock('../../utils/redisClient', () => ({
  getClient: jest.fn(() => null), getRedisClient: jest.fn(() => null), isReady: jest.fn(() => false)
}));
const { StoreTolerant } = require('../../middlewares/rateLimitMiddleware');

const redisEnPanne = () => ({
  init: jest.fn(),
  increment: jest.fn(async () => { throw new Error('ECONNREFUSED'); }),
  decrement: jest.fn(async () => { throw new Error('ECONNREFUSED'); }),
  resetKey: jest.fn(async () => { throw new Error('ECONNREFUSED'); })
});

describe('StoreTolerant', () => {
  test('Redis en panne : le comptage continue en mémoire, sans erreur', async () => {
    const store = new StoreTolerant(redisEnPanne(), 'test');
    store.init({ windowMs: 60000 });
    expect((await store.increment('a')).totalHits).toBe(1);
    expect((await store.increment('a')).totalHits).toBe(2);
    await expect(store.decrement('a')).resolves.not.toThrow();
    await expect(store.resetKey('a')).resolves.not.toThrow();
    expect((await store.increment('a')).totalHits).toBe(1);
    store.memoire.shutdown?.();
  });

  test('Redis disponible : c\'est lui qui compte', async () => {
    const redis = { init: jest.fn(), increment: jest.fn(async () => ({ totalHits: 7, resetTime: undefined })), decrement: jest.fn(), resetKey: jest.fn() };
    const store = new StoreTolerant(redis, 'test');
    store.init({ windowMs: 60000 });
    expect((await store.increment('a')).totalHits).toBe(7);
    store.memoire.shutdown?.();
  });
});
