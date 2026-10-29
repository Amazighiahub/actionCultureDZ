/**
 * Cache serveur : chaque langue du site a sa propre clé (tz-ltn et tz-tfng comprises).
 * Avant, « tz-ltn » échouait au contrôle de langue et partageait la clé du français.
 */
jest.mock('../../utils/redisClient', () => ({ getClient: () => null, isReady: () => false }));
const cacheMiddleware = require('../../middlewares/cacheMiddleware');

const appeler = (mw, lang, url) => new Promise((resolve) => {
  let routeAppelee = false;
  const req = { method: 'GET', lang, originalUrl: url, headers: {} };
  const res = { statusCode: 200, json: (data) => resolve({ depuisCache: !routeAppelee, data }) };
  mw(req, res, () => {
    // Pas en cache : la route répond dans la langue demandée
    routeAppelee = true;
    res.json({ texte: `réponse en ${lang}` });
  });
});

describe('Cache serveur et langues', () => {
  afterAll(() => cacheMiddleware.clearCache('all'));

  test('tamazight, français et tifinagh ne partagent pas la même réponse', async () => {
    const mw = cacheMiddleware.conditionalCache(60);
    const url = `/api/essai-cache-${Date.now()}`;
    await appeler(mw, 'tz-ltn', url);
    const fr = await appeler(mw, 'fr', url);
    expect(fr.depuisCache).toBe(false);
    const tfng = await appeler(mw, 'tz-tfng', url);
    expect(tfng.depuisCache).toBe(false);
    const tzEncore = await appeler(mw, 'tz-ltn', url);
    expect(tzEncore).toEqual({ depuisCache: true, data: { texte: 'réponse en tz-ltn' } });
  });

  test('langue inconnue : clé du français', async () => {
    const mw = cacheMiddleware.conditionalCache(60);
    const url = `/api/essai-cache-inconnue-${Date.now()}`;
    await appeler(mw, 'fr', url);
    expect((await appeler(mw, 'xx-yy', url)).depuisCache).toBe(true);
  });
});
