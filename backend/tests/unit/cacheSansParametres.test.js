/** Page sans paramètres : « ?x=1 », « ?x=2 » partagent la même entrée de cache */
const cacheMiddleware = require('../../middlewares/cacheMiddleware');
const attendre = (ms) => new Promise(r => setTimeout(r, ms));

describe('cache sans paramètres', () => {
  beforeEach(() => cacheMiddleware.clearCache('all'));

  it('une adresse avec paramètres inventés reçoit la copie déjà gardée', async () => {
    const m = cacheMiddleware.conditionalCache(300, { sansParametres: true });
    const res = { statusCode: 200, json: jest.fn() };
    m({ method: 'GET', originalUrl: '/api/stats/public', url: '/api/stats/public' }, res, jest.fn());
    await attendre(200);
    res.json({ success: true, data: 'chiffres' });
    await attendre(300);

    const res2 = { statusCode: 200, json: jest.fn() };
    const next2 = jest.fn();
    m({ method: 'GET', originalUrl: '/api/STATS/Public/?x=123', url: '/api/STATS/Public/?x=123' }, res2, next2);
    await attendre(300);
    expect(next2).not.toHaveBeenCalled();
    expect(res2.json).toHaveBeenCalledWith({ success: true, data: 'chiffres' });
  });
});
