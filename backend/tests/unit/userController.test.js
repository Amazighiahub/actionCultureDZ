/**
 * Tests unitaires — UserController (auth: register, login, logout)
 * Priorité #1 : L'authentification est le flux le plus critique
 */

// Mock du container AVANT le require du controller
const mockUserService = {
  register: jest.fn(),
  login: jest.fn(),
  revokeRefreshToken: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
};

jest.mock('../../services/serviceContainer', () => ({
  userService: mockUserService,
}));

jest.mock('../../middlewares/rateLimitMiddleware', () => ({
  accountRateLimiter: {
    resetAttempts: jest.fn(),
    recordFailedAttempt: jest.fn(),
  }
}));

// Le controller est un singleton exporté
const controller = require('../../controllers/userController');
const { accountRateLimiter } = require('../../middlewares/rateLimitMiddleware');

describe('UserController — Authentification', () => {
  let req, res;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };
    req = {
      body: {},
      headers: {},
      cookies: {},
      lang: 'fr',
      t: jest.fn((key) => `translated:${key}`),
    };
  });

  // =============================================
  // POST /register
  // =============================================
  describe('register', () => {
    it('doit créer un utilisateur et retourner 201', async () => {
      mockUserService.register.mockResolvedValue({
        user: { id_user: 1, nom: 'Test', prenom: 'User', email: 'test@test.com', toJSON: () => ({ id_user: 1, nom: 'Test' }) },
        token: 'jwt-token',
        refreshToken: 'refresh-token',
      });
      req.body = { nom: 'Test', prenom: 'User', email: 'test@test.com', password: 'SecurePass123!' };

      await controller.register(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('doit retourner une erreur si le service échoue', async () => {
      const error = new Error('Email déjà utilisé');
      error.statusCode = 409;
      mockUserService.register.mockRejectedValue(error);
      req.body = { email: 'existing@test.com', password: 'Pass123!' };

      await controller.register(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  // =============================================
  // POST /login
  // =============================================
  describe('login', () => {
    it('doit connecter un utilisateur avec des credentials valides', async () => {
      mockUserService.login.mockResolvedValue({
        user: { id_user: 1, nom: 'Test', email: 'test@test.com', toJSON: () => ({ id_user: 1, nom: 'Test' }) },
        token: 'jwt-token',
        refreshToken: 'refresh-token',
      });
      req.body = { email: 'test@test.com', password: 'ValidPass123!' };

      await controller.login(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
      expect(accountRateLimiter.resetAttempts).toHaveBeenCalledWith('test@test.com');
    });

    it('doit retourner 400 si email ou password manquant', async () => {
      req.body = { email: 'test@test.com' }; // password manquant

      await controller.login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('doit enregistrer un échec si le login échoue', async () => {
      mockUserService.login.mockRejectedValue(new Error('Invalid credentials'));
      req.body = { email: 'test@test.com', password: 'wrong' };

      await controller.login(req, res);

      expect(accountRateLimiter.recordFailedAttempt).toHaveBeenCalledWith('test@test.com');
    });
  });

  // =============================================
  // POST /logout
  // =============================================
  describe('logout', () => {
    it('doit déconnecter et nettoyer les cookies', async () => {
      req.user = { id_user: 1 };

      await controller.logout(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('doit fonctionner même si la révocation du token échoue', async () => {
      req.user = { id_user: 1 };
      mockUserService.revokeRefreshToken.mockRejectedValue(new Error('DB error'));

      await controller.logout(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });
});
