// Contrôle anti-robots Turnstile : réponses de Cloudflare simulées (aucun appel réseau)
jest.mock('../../utils/logger', () => ({ warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() }));
const { verifierTurnstile } = require('../../middlewares/turnstile');

const VRAIE_CLE = '0x4AAAAAAAexemple-secret-pour-test';

const lancer = async (action, body, reponse) => {
  global.fetch = jest.fn(typeof reponse === 'function' ? reponse : async () => reponse);
  const req = { body: { ...body }, ip: '203.0.113.5', t: (k) => k };
  const res = { statusCode: 200, corps: null, status(c) { this.statusCode = c; return this; }, json(o) { this.corps = o; return this; } };
  const next = jest.fn();
  await verifierTurnstile(action)(req, res, next);
  return { req, res, next };
};
const ok = (donnees, status = 200) => ({ status, ok: status < 400, json: async () => donnees });

describe('verifierTurnstile', () => {
  const avant = { secret: process.env.TURNSTILE_SECRET_KEY, front: process.env.FRONTEND_URL };
  beforeEach(() => { process.env.TURNSTILE_SECRET_KEY = VRAIE_CLE; process.env.FRONTEND_URL = 'https://taladz.com'; });
  afterAll(() => {
    if (avant.secret === undefined) delete process.env.TURNSTILE_SECRET_KEY; else process.env.TURNSTILE_SECRET_KEY = avant.secret;
    if (avant.front === undefined) delete process.env.FRONTEND_URL; else process.env.FRONTEND_URL = avant.front;
    delete global.fetch;
  });

  test('sans clé secrète : rien n’est vérifié, le jeton est quand même retiré', async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    const { req, next } = await lancer('contact', { email: 'a@example.com', turnstile_token: 'x' }, ok({}));
    expect(next).toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(req.body).toEqual({ email: 'a@example.com' });
  });

  test('jeton absent : refus 400 CAPTCHA_REQUIS, sans appeler Cloudflare', async () => {
    const { res, next } = await lancer('inscription', { email: 'a@example.com' }, ok({}));
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.corps.code).toBe('CAPTCHA_REQUIS');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('jeton valide, bon site, bonne action : accepté, jeton retiré, IP transmise', async () => {
    const { req, next } = await lancer('inscription', { turnstile_token: 'bon', nom: 'x' }, ok({ success: true, hostname: 'taladz.com', action: 'inscription' }));
    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ nom: 'x' });
    const corps = global.fetch.mock.calls[0][1].body;
    expect(corps.get('secret')).toBe(VRAIE_CLE);
    expect(corps.get('response')).toBe('bon');
    expect(corps.get('remoteip')).toBe('203.0.113.5');
  });

  test('www.taladz.com est aussi accepté', async () => {
    const { next } = await lancer('contact', { turnstile_token: 'bon' }, ok({ success: true, hostname: 'www.taladz.com', action: 'contact' }));
    expect(next).toHaveBeenCalled();
  });

  test.each([
    ['refusé par Cloudflare', { success: false, 'error-codes': ['timeout-or-duplicate'] }],
    ['jeton d’un autre site', { success: true, hostname: 'faux-site.example', action: 'contact' }],
    ['jeton d’un autre formulaire', { success: true, hostname: 'taladz.com', action: 'newsletter' }],
  ])('%s : refus 400 CAPTCHA_INVALIDE', async (_nom, donnees) => {
    const { res, next } = await lancer('contact', { turnstile_token: 'x' }, ok(donnees));
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.corps.code).toBe('CAPTCHA_INVALIDE');
  });

  test('jeton démesuré : refusé sans appeler Cloudflare', async () => {
    const { res } = await lancer('contact', { turnstile_token: 'x'.repeat(3000) }, ok({}));
    expect(res.corps.code).toBe('CAPTCHA_REQUIS');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('Cloudflare injoignable ou en panne : on laisse passer', async () => {
    let r = await lancer('mot_de_passe', { turnstile_token: 'x' }, async () => { throw new Error('ECONNRESET'); });
    expect(r.next).toHaveBeenCalled();
    r = await lancer('mot_de_passe', { turnstile_token: 'x' }, ok({}, 503));
    expect(r.next).toHaveBeenCalled();
  });

  test('Cloudflare répond une erreur 4xx illisible : refus (jamais « injoignable »)', async () => {
    const { res, next } = await lancer('contact', { turnstile_token: 'x' }, async () => ({ status: 429, ok: false, json: async () => { throw new Error('pas du JSON'); } }));
    expect(next).not.toHaveBeenCalled();
    expect(res.corps.code).toBe('CAPTCHA_INVALIDE');
  });

  describe('en production', () => {
    const env = process.env.NODE_ENV;
    beforeEach(() => { process.env.NODE_ENV = 'production'; });
    afterEach(() => { process.env.NODE_ENV = env; });

    test('jeton venu de localhost : refusé', async () => {
      const { res, next } = await lancer('contact', { turnstile_token: 'x' }, ok({ success: true, hostname: 'localhost', action: 'contact' }));
      expect(next).not.toHaveBeenCalled();
      expect(res.corps.code).toBe('CAPTCHA_INVALIDE');
    });

    test('clé de test Cloudflare : ignorée (alerte), jamais utilisée pour valider', async () => {
      process.env.TURNSTILE_SECRET_KEY = '1x0000000000000000000000000000000AA';
      const logger = require('../../utils/logger');
      const { next } = await lancer('contact', { turnstile_token: 'faux' }, ok({ success: true }));
      expect(global.fetch).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  test('clé de test Cloudflare (local) : nom de domaine et action non exigés', async () => {
    process.env.TURNSTILE_SECRET_KEY = '1x0000000000000000000000000000000AA';
    const { next } = await lancer('newsletter', { turnstile_token: 'x' }, ok({ success: true, hostname: 'example.com', action: '' }));
    expect(next).toHaveBeenCalled();
  });
});
