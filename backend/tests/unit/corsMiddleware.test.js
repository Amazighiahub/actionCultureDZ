/**
 * Tests unitaires pour corsMiddleware
 *
 * On teste directement le delegate (corsOptionsDelegate expose via _internal)
 * pour eviter de monter un serveur HTTP complet. On reset les variables
 * d'environnement + on reimporte le module entre chaque scenario car la
 * whitelist est construite au boot.
 */

'use strict';

const ORIGINAL_ENV = { ...process.env };

function loadModule({ nodeEnv, frontendUrl, allowedOrigins, allowNoOrigin } = {}) {
  // Nettoie la config d'environnement precedente
  delete process.env.NODE_ENV;
  delete process.env.FRONTEND_URL;
  delete process.env.CORS_ALLOWED_ORIGINS;
  delete process.env.CORS_ALLOW_NO_ORIGIN;

  if (nodeEnv) process.env.NODE_ENV = nodeEnv;
  if (frontendUrl) process.env.FRONTEND_URL = frontendUrl;
  if (allowedOrigins) process.env.CORS_ALLOWED_ORIGINS = allowedOrigins;
  if (allowNoOrigin) process.env.CORS_ALLOW_NO_ORIGIN = allowNoOrigin;

  jest.resetModules();
  return require('../../middlewares/corsMiddleware');
}

function fakeReq({ origin, method = 'GET', path = '/api/test' } = {}) {
  const headers = {};
  if (origin) headers['Origin'] = origin;
  return {
    header: (name) => headers[name],
    get: (name) => headers[name],
    method,
    originalUrl: path,
    url: path,
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' }
  };
}

function runDelegate(mod, req) {
  return new Promise((resolve) => {
    mod._internal.corsOptionsDelegate(req, (err, options) => resolve({ err, options }));
  });
}

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe('corsMiddleware.validateOrigin', () => {
  let validateOrigin;
  beforeAll(() => {
    ({ validateOrigin } = loadModule({ nodeEnv: 'test' }));
  });

  it('accepte https://host', () => {
    const v = validateOrigin('https://taladz.com');
    expect(v.valid).toBe(true);
    expect(v.normalized).toBe('https://taladz.com');
  });

  it('accepte http://localhost:3000', () => {
    const v = validateOrigin('http://localhost:3000');
    expect(v.valid).toBe(true);
  });

  it('refuse une URL sans protocole', () => {
    expect(validateOrigin('taladz.com').valid).toBe(false);
  });

  it('refuse un protocole inattendu', () => {
    expect(validateOrigin('ws://taladz.com').valid).toBe(false);
    expect(validateOrigin('file:///etc/passwd').valid).toBe(false);
  });

  it('refuse une origine avec un chemin', () => {
    expect(validateOrigin('https://taladz.com/login').valid).toBe(false);
  });

  it('refuse une origine avec query string', () => {
    expect(validateOrigin('https://taladz.com?x=1').valid).toBe(false);
  });

  it('refuse http:// en prod quand requireHttps=true', () => {
    expect(validateOrigin('http://taladz.com', { requireHttps: true }).valid).toBe(false);
  });

  it('normalise en supprimant un slash final', () => {
    const v = validateOrigin('https://taladz.com/');
    expect(v.valid).toBe(true);
    expect(v.normalized).toBe('https://taladz.com');
  });
});

describe('corsMiddleware - boot production', () => {
  it('throw si aucune origine valide en production', () => {
    expect(() => loadModule({ nodeEnv: 'production' }))
      .toThrow(/aucune origine valide/i);
  });

  it('throw si FRONTEND_URL est en http:// en production', () => {
    expect(() => loadModule({ nodeEnv: 'production', frontendUrl: 'http://taladz.com' }))
      .toThrow(/aucune origine valide/i);
  });

  it('n ajoute pas automatiquement www en production', () => {
    const mod = loadModule({ nodeEnv: 'production', frontendUrl: 'https://taladz.com' });
    expect(mod.allowedOrigins).toEqual(['https://taladz.com']);
  });

  it('accepte plusieurs origines via CORS_ALLOWED_ORIGINS', () => {
    const mod = loadModule({
      nodeEnv: 'production',
      frontendUrl: 'https://taladz.com',
      allowedOrigins: 'https://www.taladz.com,https://admin.taladz.com'
    });
    expect(mod.allowedOrigins).toEqual([
      'https://taladz.com',
      'https://www.taladz.com',
      'https://admin.taladz.com'
    ]);
  });
});

describe('corsMiddleware - delegate (dev)', () => {
  let mod;
  beforeAll(() => {
    mod = loadModule({ nodeEnv: 'development' });
  });

  it('autorise localhost:3000', async () => {
    const { err, options } = await runDelegate(mod, fakeReq({ origin: 'http://localhost:3000' }));
    expect(err).toBeNull();
    expect(options.origin).toBe(true);
  });

  it('refuse une origine inconnue', async () => {
    const { err } = await runDelegate(mod, fakeReq({ origin: 'https://evil.com' }));
    expect(err).toBeInstanceOf(Error);
  });

  it('autorise tout en dev sans Origin', async () => {
    const { err, options } = await runDelegate(mod, fakeReq({ method: 'POST' }));
    expect(err).toBeNull();
    expect(options.origin).toBe(true);
  });
});

describe('corsMiddleware - delegate (production)', () => {
  let mod;
  beforeAll(() => {
    mod = loadModule({ nodeEnv: 'production', frontendUrl: 'https://taladz.com' });
  });

  it('autorise l origine whitelistee', async () => {
    const { err, options } = await runDelegate(mod, fakeReq({ origin: 'https://taladz.com' }));
    expect(err).toBeNull();
    expect(options.origin).toBe(true);
  });

  it('refuse l origine www non whitelistee (pas d auto-ajout)', async () => {
    const { err } = await runDelegate(mod, fakeReq({ origin: 'https://www.taladz.com' }));
    expect(err).toBeInstanceOf(Error);
  });

  it('refuse une origine totalement inconnue', async () => {
    const { err } = await runDelegate(mod, fakeReq({ origin: 'https://evil.com' }));
    expect(err).toBeInstanceOf(Error);
  });

  it('autorise GET sans Origin (methode safe)', async () => {
    const { err, options } = await runDelegate(mod, fakeReq({ method: 'GET' }));
    expect(err).toBeNull();
    expect(options.origin).toBe(true);
  });

  it('autorise OPTIONS sans Origin (preflight)', async () => {
    const { err, options } = await runDelegate(mod, fakeReq({ method: 'OPTIONS' }));
    expect(err).toBeNull();
    expect(options.origin).toBe(true);
  });

  it('refuse POST sans Origin en prod', async () => {
    const { err } = await runDelegate(mod, fakeReq({ method: 'POST' }));
    expect(err).toBeInstanceOf(Error);
  });
});

describe('corsMiddleware - CORS_ALLOW_NO_ORIGIN backdoor', () => {
  it('autorise POST sans Origin quand bypass active', async () => {
    const mod = loadModule({
      nodeEnv: 'production',
      frontendUrl: 'https://taladz.com',
      allowNoOrigin: 'true'
    });
    const { err, options } = await runDelegate(mod, fakeReq({ method: 'POST' }));
    expect(err).toBeNull();
    expect(options.origin).toBe(true);
  });

  it('bypass inactif si CORS_ALLOW_NO_ORIGIN=false', async () => {
    const mod = loadModule({
      nodeEnv: 'production',
      frontendUrl: 'https://taladz.com',
      allowNoOrigin: 'false'
    });
    const { err } = await runDelegate(mod, fakeReq({ method: 'POST' }));
    expect(err).toBeInstanceOf(Error);
  });
});
