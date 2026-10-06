/**
 * Pas d'énumération de comptes au login / reset ; messages 500 masqués en production.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-de-plus-de-32-caracteres-xx';
process.env.BCRYPT_ROUNDS = '4';
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));
jest.mock('../../services/emailService', () => ({
  sendPasswordResetEmail: jest.fn().mockRejectedValue(new Error('smtp down'))
}));

const bcrypt = require('bcrypt');
const UserService = require('../../services/user/userService');

const makeService = (user) => {
  const repository = { findByEmail: jest.fn().mockResolvedValue(user), updateLastLogin: jest.fn() };
  return new UserService(repository, {});
};

describe('login', () => {
  let hash;
  beforeAll(async () => { hash = await bcrypt.hash('BonMotDePasse!1', 4); });

  it('compte banni + mauvais mot de passe : message générique (statut non révélé)', async () => {
    const svc = makeService({ id_user: 1, statut: 'banni', email_verifie: true, password: hash });
    await expect(svc.login('a@b.dz', 'faux')).rejects.toMatchObject({ statusCode: 401 });
  });

  it('compte banni + bon mot de passe : statut indiqué', async () => {
    const svc = makeService({ id_user: 1, statut: 'banni', email_verifie: true, password: hash });
    await expect(svc.login('a@b.dz', 'BonMotDePasse!1')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('email inconnu : bcrypt exécuté quand même (temps de réponse comparable)', async () => {
    const spy = jest.spyOn(bcrypt, 'compare');
    const svc = makeService(null);
    await expect(svc.login('inconnu@b.dz', 'x')).rejects.toMatchObject({ statusCode: 401 });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('demande de réinitialisation', () => {
  const EmailVerificationService = require('../../services/emailVerificationService');
  const make = (hasActive) => new EmailVerificationService({
    User: { findOne: jest.fn().mockResolvedValue({ id_user: 1, email: 'a@b.dz' }) },
    EmailVerification: {
      hasActiveToken: jest.fn().mockResolvedValue(hasActive),
      createVerificationToken: jest.fn().mockResolvedValue({ token: 't' })
    }
  });

  it('lien déjà envoyé : pas d\'erreur 429 (réponse identique à un email inconnu)', async () => {
    await expect(make(true).requestPasswordReset('a@b.dz', '1.1.1.1')).resolves.toEqual({ rateLimited: true });
  });

  it('échec SMTP : pas d\'erreur visible propre aux comptes existants', async () => {
    await expect(make(false).requestPasswordReset('a@b.dz', '1.1.1.1')).resolves.toBeDefined();
  });
});

describe('errorMiddleware en production', () => {
  it('masque le message technique d\'une erreur 500', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    jest.isolateModules(() => {
      const { errorHandler } = require('../../middlewares/errorMiddleware');
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), headersSent: false };
      errorHandler(new TypeError("Cannot read properties of undefined (reading 'id_user')"), { method: 'GET', originalUrl: '/api/x', path: '/api/x', t: (k) => k }, res, () => {});
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json.mock.calls[0][0].error).toBe('Erreur interne du serveur');
    });
    process.env.NODE_ENV = prev;
  });
});
