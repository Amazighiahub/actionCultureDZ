/**
 * Tests unitaires pour EnvironmentValidator.
 *
 * On mock le logger pour ne pas polluer la sortie Jest, et on snapshot
 * process.env entre chaque test pour garantir l'isolation.
 */

'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

const ORIGINAL_ENV = { ...process.env };

// Base minimale "valide" pour NODE_ENV=production (evite les erreurs
// secondaires quand on ne teste qu'une verification particuliere).
const PROD_BASE = {
  NODE_ENV: 'production',
  PORT: '3001',
  DB_NAME: 'actionculture',
  DB_USER: 'actionculture_user', // != 'root'
  DB_PASSWORD: 'UnMotDePasseAssezLong123!',
  DB_HOST: 'localhost',
  JWT_SECRET: 'x'.repeat(64),
  API_URL: 'https://taladz.com',
  FRONTEND_URL: 'https://taladz.com',
  EMAIL_HOST: 'smtp.example.com',
  EMAIL_USER: 'noreply@example.com',
  EMAIL_PASSWORD: 'applicationPassword123',
  CLOUDINARY_CLOUD_NAME: 'real-cloud',
  CLOUDINARY_API_KEY: '123456789012345',
  CLOUDINARY_API_SECRET: 'aVeryLongCloudinarySecret12345',
  REDIS_PASSWORD: 'n2asNgyLIFfqRzd9lbyeP55KyqYNO6I4'
};

function setEnv(overrides = {}) {
  // Reset total
  for (const key of Object.keys(process.env)) {
    delete process.env[key];
  }
  Object.assign(process.env, overrides);
}

function loadValidator() {
  jest.resetModules();
  // Re-mock car resetModules invalide le mock precedent
  jest.doMock('../../utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }));
  return require('../../config/envValidator');
}

afterEach(() => {
  setEnv(ORIGINAL_ENV);
});

// ============================================================================
// Variables requises
// ============================================================================
describe('REQUIRED vars', () => {
  it('throws si JWT_SECRET manquant (all envs)', () => {
    setEnv({ NODE_ENV: 'development', PORT: '3001', DB_NAME: 'a', DB_USER: 'a', DB_PASSWORD: 'a', DB_HOST: 'a' });
    const V = loadValidator();
    expect(() => V.validate()).toThrow(/JWT_SECRET/);
  });

  it('throws en prod si CLOUDINARY_* manquants', () => {
    const base = { ...PROD_BASE };
    delete base.CLOUDINARY_CLOUD_NAME;
    setEnv(base);
    const V = loadValidator();
    expect(() => V.validate()).toThrow(/CLOUDINARY_CLOUD_NAME/);
  });

  it('throws en prod si REDIS_PASSWORD manquant', () => {
    const base = { ...PROD_BASE };
    delete base.REDIS_PASSWORD;
    setEnv(base);
    const V = loadValidator();
    expect(() => V.validate()).toThrow(/REDIS_PASSWORD/);
  });

  it('dev ne demande pas Cloudinary / Redis', () => {
    setEnv({
      NODE_ENV: 'development',
      PORT: '3001',
      DB_NAME: 'a', DB_USER: 'a', DB_PASSWORD: 'a', DB_HOST: 'a',
      JWT_SECRET: 'x'.repeat(40)
    });
    const V = loadValidator();
    expect(() => V.validate()).not.toThrow();
  });
});

// ============================================================================
// Numeric vars
// ============================================================================
describe('NUMERIC vars', () => {
  it('rejette PORT non numerique', () => {
    setEnv({ ...PROD_BASE, PORT: 'abc' });
    const V = loadValidator();
    expect(() => V.validate()).toThrow(/PORT doit etre un nombre/);
  });

  it('rejette BCRYPT_ROUNDS hors plage', () => {
    setEnv({ ...PROD_BASE, BCRYPT_ROUNDS: '3' });
    const V = loadValidator();
    expect(() => V.validate()).toThrow(/BCRYPT_ROUNDS doit etre >= 4/);
  });

  it('rejette UPLOAD_IMAGE_MAX_SIZE non numerique', () => {
    setEnv({ ...PROD_BASE, UPLOAD_IMAGE_MAX_SIZE: 'ten-mega' });
    const V = loadValidator();
    expect(() => V.validate()).toThrow(/UPLOAD_IMAGE_MAX_SIZE doit etre un nombre/);
  });

  it('accepte UPLOAD_IMAGE_MAX_SIZE valide', () => {
    setEnv({ ...PROD_BASE, UPLOAD_IMAGE_MAX_SIZE: '10485760' });
    const V = loadValidator();
    expect(() => V.validate()).not.toThrow();
  });
});

// ============================================================================
// Boolean vars
// ============================================================================
describe('BOOLEAN vars', () => {
  it('rejette valeur non-boolean pour CORS_ALLOW_NO_ORIGIN', () => {
    setEnv({ ...PROD_BASE, CORS_ALLOW_NO_ORIGIN: 'yes' });
    const V = loadValidator();
    expect(() => V.validate()).toThrow(/CORS_ALLOW_NO_ORIGIN.*true.*false/);
  });

  it('accepte "true" et "false"', () => {
    setEnv({ ...PROD_BASE, CORS_ALLOW_NO_ORIGIN: 'false' });
    const V = loadValidator();
    expect(() => V.validate()).not.toThrow();
  });
});

// ============================================================================
// JWT_SECRET
// ============================================================================
describe('JWT_SECRET', () => {
  it('throw en prod si < 32 chars', () => {
    setEnv({ ...PROD_BASE, JWT_SECRET: 'short' });
    const V = loadValidator();
    expect(() => V.validate()).toThrow(/JWT_SECRET trop court/);
  });

  it('warn seulement en dev si < 32 chars', () => {
    setEnv({
      NODE_ENV: 'development',
      PORT: '3001',
      DB_NAME: 'a', DB_USER: 'a', DB_PASSWORD: 'a', DB_HOST: 'a',
      JWT_SECRET: 'short'
    });
    const V = loadValidator();
    const res = V.validate();
    expect(res.warnings.some(w => /JWT_SECRET.*court/.test(w))).toBe(true);
  });

  it('rejette valeur exemple en prod', () => {
    setEnv({ ...PROD_BASE, JWT_SECRET: 'REMPLACER_PAR_UN_SECRET_GENERE_AVEC_LE_SCRIPT_0123456789abcd' });
    const V = loadValidator();
    expect(() => V.validate()).toThrow(/valeur d'exemple/);
  });
});

// ============================================================================
// URLs
// ============================================================================
describe('URLs', () => {
  it('rejette FRONTEND_URL http:// en prod', () => {
    setEnv({ ...PROD_BASE, FRONTEND_URL: 'http://taladz.com' });
    const V = loadValidator();
    expect(() => V.validate()).toThrow(/FRONTEND_URL doit utiliser HTTPS/);
  });

  it('rejette API_URL sans protocol', () => {
    setEnv({ ...PROD_BASE, API_URL: 'taladz.com' });
    const V = loadValidator();
    expect(() => V.validate()).toThrow(/API_URL doit etre une URL absolue/);
  });
});

// ============================================================================
// Email
// ============================================================================
describe('Email format', () => {
  it('rejette EMAIL_FROM invalide', () => {
    setEnv({ ...PROD_BASE, EMAIL_FROM: 'pas-un-email' });
    const V = loadValidator();
    expect(() => V.validate()).toThrow(/EMAIL_FROM n'est pas un email valide/);
  });

  it('accepte EMAIL_FROM valide', () => {
    setEnv({ ...PROD_BASE, EMAIL_FROM: 'noreply@taladz.com' });
    const V = loadValidator();
    expect(() => V.validate()).not.toThrow();
  });

  it('rejette EMAIL_USER exemple en prod', () => {
    setEnv({ ...PROD_BASE, EMAIL_USER: 'your-email@gmail.com' });
    const V = loadValidator();
    expect(() => V.validate()).toThrow(/EMAIL_USER contient une valeur d'exemple/);
  });
});

// ============================================================================
// Cloudinary
// ============================================================================
describe('Cloudinary', () => {
  it('rejette CLOUDINARY_API_SECRET placeholder', () => {
    setEnv({ ...PROD_BASE, CLOUDINARY_API_SECRET: 'your_api_secret' });
    const V = loadValidator();
    expect(() => V.validate()).toThrow(/CLOUDINARY_API_SECRET contient une valeur d'exemple/);
  });

  it('rejette CLOUDINARY_API_SECRET trop court', () => {
    setEnv({ ...PROD_BASE, CLOUDINARY_API_SECRET: 'short' });
    const V = loadValidator();
    expect(() => V.validate()).toThrow(/CLOUDINARY_API_SECRET semble trop court/);
  });
});

// ============================================================================
// CORS en prod
// ============================================================================
describe('CORS production checks', () => {
  it('warn si CORS_ALLOW_NO_ORIGIN=true en prod', () => {
    setEnv({ ...PROD_BASE, CORS_ALLOW_NO_ORIGIN: 'true' });
    const V = loadValidator();
    const res = V.validate();
    expect(res.warnings.some(w => /CORS_ALLOW_NO_ORIGIN=true/.test(w))).toBe(true);
  });

  it('throw si ni FRONTEND_URL ni CORS_ALLOWED_ORIGINS en prod', () => {
    const base = { ...PROD_BASE };
    delete base.FRONTEND_URL;
    setEnv(base);
    const V = loadValidator();
    // Note : FRONTEND_URL est dans REQUIRED.production donc ca throw pour
    // cette raison d'abord, ce qui est deja la bonne detection.
    expect(() => V.validate()).toThrow(/FRONTEND_URL/);
  });
});

// ============================================================================
// DB strength
// ============================================================================
describe('DB production checks', () => {
  it('rejette DB_USER=root en prod', () => {
    setEnv({ ...PROD_BASE, DB_USER: 'root' });
    const V = loadValidator();
    expect(() => V.validate()).toThrow(/DB_USER ne doit pas etre "root"/);
  });

  it('rejette DB_PASSWORD faible en prod', () => {
    setEnv({ ...PROD_BASE, DB_PASSWORD: 'short1' });
    const V = loadValidator();
    expect(() => V.validate()).toThrow(/DB_PASSWORD trop court/);
  });

  it('SKIP_PRODUCTION_CHECKS bypass', () => {
    setEnv({ ...PROD_BASE, DB_USER: 'root', SKIP_PRODUCTION_CHECKS: 'true' });
    const V = loadValidator();
    expect(() => V.validate()).not.toThrow();
  });
});

// ============================================================================
// Sentry
// ============================================================================
describe('Sentry', () => {
  it('warn si SENTRY_DSN manquant en prod', () => {
    setEnv(PROD_BASE);
    const V = loadValidator();
    const res = V.validate();
    expect(res.warnings.some(w => /SENTRY_DSN/.test(w))).toBe(true);
  });

  it('pas de warn Sentry en dev', () => {
    setEnv({
      NODE_ENV: 'development',
      PORT: '3001',
      DB_NAME: 'a', DB_USER: 'a', DB_PASSWORD: 'a', DB_HOST: 'a',
      JWT_SECRET: 'x'.repeat(40)
    });
    const V = loadValidator();
    const res = V.validate();
    expect(res.warnings.every(w => !/SENTRY_DSN/.test(w))).toBe(true);
  });
});

// ============================================================================
// NODE_ENV
// ============================================================================
describe('NODE_ENV', () => {
  it('rejette valeur inconnue', () => {
    setEnv({ ...PROD_BASE, NODE_ENV: 'staging' });
    const V = loadValidator();
    expect(() => V.validate()).toThrow(/NODE_ENV invalide/);
  });
});

// ============================================================================
// Returns structure
// ============================================================================
describe('validate() return value', () => {
  it('retourne { errors: [], warnings: [] }', () => {
    setEnv({
      NODE_ENV: 'development',
      PORT: '3001',
      DB_NAME: 'a', DB_USER: 'a', DB_PASSWORD: 'a', DB_HOST: 'a',
      JWT_SECRET: 'x'.repeat(40)
    });
    const V = loadValidator();
    const res = V.validate();
    expect(res).toHaveProperty('errors');
    expect(res).toHaveProperty('warnings');
    expect(Array.isArray(res.errors)).toBe(true);
    expect(Array.isArray(res.warnings)).toBe(true);
  });
});
