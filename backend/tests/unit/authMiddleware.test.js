/**
 * Tests unitaires pour authMiddleware
 */

const jwt = require('jsonwebtoken');

jest.mock('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';

describe('authMiddleware', () => {
  let authMiddleware;
  let mockUser;
  let mockModels;
  let req, res, next;

  beforeEach(() => {
    mockUser = {
      id_user: 1,
      nom: 'Test',
      prenom: 'User',
      email: 'test@example.com',
      statut: 'actif',
      id_type_user: 1,
      Roles: [{ nom_role: 'User' }],
      Organisations: [],
      roleNames: ['User'],
      isAdmin: false,
      isProfessionnel: false,
      isUser: true,
      hasOrganisation: false,
      isProfessionnelValide: false
    };

    mockModels = {
      User: {
        findByPk: jest.fn().mockResolvedValue(mockUser)
      },
      Role: { name: 'Role' },
      Organisation: { name: 'Organisation' }
    };

    authMiddleware = require('../../middlewares/authMiddleware')(mockModels);

    req = {
      headers: {},
      cookies: {},
      t: jest.fn((key, params) => `translated:${key}`)
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    next = jest.fn();
  });

  // =========================================================================
  // authenticate
  // =========================================================================
  describe('authenticate', () => {
    it('should return 401 when no token is provided', async () => {
      await authMiddleware.authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should authenticate with a valid cookie token', async () => {
      const token = 'valid-token';
      req.cookies = { access_token: token };
      jwt.verify.mockReturnValue({ userId: 1 });

      await authMiddleware.authenticate(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith(token, JWT_SECRET, { algorithms: ['HS256'] });
      expect(req.user).toBeDefined();
      expect(req.userId).toBe(1);
      expect(next).toHaveBeenCalled();
    });

    it('should authenticate with a valid Bearer header', async () => {
      const token = 'valid-bearer-token';
      req.headers.authorization = `Bearer ${token}`;
      jwt.verify.mockReturnValue({ userId: 1 });

      await authMiddleware.authenticate(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith(token, JWT_SECRET, { algorithms: ['HS256'] });
      expect(req.user).toBeDefined();
      expect(next).toHaveBeenCalled();
    });

    it('should authenticate with x-access-token header', async () => {
      const token = 'legacy-token';
      req.headers['x-access-token'] = token;
      jwt.verify.mockReturnValue({ userId: 1 });

      await authMiddleware.authenticate(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith(token, JWT_SECRET, { algorithms: ['HS256'] });
      expect(next).toHaveBeenCalled();
    });

    it('should prioritize cookie over Bearer header', async () => {
      req.cookies = { access_token: 'cookie-token' };
      req.headers.authorization = 'Bearer header-token';
      jwt.verify.mockReturnValue({ userId: 1 });

      await authMiddleware.authenticate(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('cookie-token', JWT_SECRET, { algorithms: ['HS256'] });
    });

    it('should return 401 for expired/invalid token (verify returns null)', async () => {
      req.cookies = { access_token: 'expired-token' };
      jwt.verify.mockImplementation(() => { throw new Error('jwt expired'); });

      await authMiddleware.authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 for malformed token', async () => {
      req.cookies = { access_token: 'malformed' };
      jwt.verify.mockImplementation(() => { throw new Error('jwt malformed'); });

      await authMiddleware.authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not found in database', async () => {
      req.cookies = { access_token: 'valid-token' };
      jwt.verify.mockReturnValue({ userId: 999 });
      mockModels.User.findByPk.mockResolvedValue(null);

      await authMiddleware.authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 for suspended user', async () => {
      req.cookies = { access_token: 'valid-token' };
      jwt.verify.mockReturnValue({ userId: 1 });
      mockUser.statut = 'suspendu';

      await authMiddleware.authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, statut: 'suspendu' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 for banned user', async () => {
      req.cookies = { access_token: 'valid-token' };
      jwt.verify.mockReturnValue({ userId: 1 });
      mockUser.statut = 'banni';

      await authMiddleware.authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ statut: 'banni' })
      );
    });

    it('should return 403 for inactive user', async () => {
      req.cookies = { access_token: 'valid-token' };
      jwt.verify.mockReturnValue({ userId: 1 });
      mockUser.statut = 'inactif';

      await authMiddleware.authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ statut: 'inactif' })
      );
    });

    it('should allow user with en_attente_validation status', async () => {
      req.cookies = { access_token: 'valid-token' };
      jwt.verify.mockReturnValue({ userId: 1 });
      mockUser.statut = 'en_attente_validation';

      await authMiddleware.authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user.statut).toBe('en_attente_validation');
    });

    it('should return 401 for unknown account status', async () => {
      req.cookies = { access_token: 'valid-token' };
      jwt.verify.mockReturnValue({ userId: 1 });
      mockUser.statut = 'unknown_status';

      await authMiddleware.authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should set req.userRoles from user Roles', async () => {
      req.cookies = { access_token: 'valid-token' };
      jwt.verify.mockReturnValue({ userId: 1 });
      mockUser.Roles = [{ nom_role: 'User' }, { nom_role: 'Professionnel' }];

      await authMiddleware.authenticate(req, res, next);

      expect(req.userRoles).toEqual(['User', 'Professionnel']);
    });

    it('should decode token with id field', async () => {
      req.cookies = { access_token: 'valid-token' };
      jwt.verify.mockReturnValue({ id: 1 });

      await authMiddleware.authenticate(req, res, next);

      expect(mockModels.User.findByPk).toHaveBeenCalledWith(
        1,
        expect.any(Object)
      );
      expect(next).toHaveBeenCalled();
    });

    it('should decode token with id_user field', async () => {
      req.cookies = { access_token: 'valid-token' };
      jwt.verify.mockReturnValue({ id_user: 1 });

      await authMiddleware.authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // requireRole
  // =========================================================================
  describe('requireRole', () => {
    it('should pass when user has a required role', () => {
      req.user = { ...mockUser, isAdmin: false };
      req.userRoles = ['User', 'Professionnel'];

      const middleware = authMiddleware.requireRole('Professionnel');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject when user lacks the required role', () => {
      req.user = { ...mockUser, isAdmin: false };
      req.userRoles = ['User'];

      const middleware = authMiddleware.requireRole('Administrateur');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when no user is attached to request', () => {
      req.user = undefined;

      const middleware = authMiddleware.requireRole('User');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should accept role aliases (Admin → Administrateur)', () => {
      req.user = { ...mockUser, isAdmin: true };
      req.userRoles = ['Administrateur'];

      const middleware = authMiddleware.requireRole('Admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should accept multiple roles and pass if user has any', () => {
      req.user = { ...mockUser, isAdmin: false };
      req.userRoles = ['Professionnel'];

      const middleware = authMiddleware.requireRole('User', 'Professionnel');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject when user has none of the required roles', () => {
      req.user = { ...mockUser, isAdmin: false };
      req.userRoles = ['User'];

      const middleware = authMiddleware.requireRole('Professionnel', 'Modérateur');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should let admin pass when Admin is in required roles', () => {
      req.user = { ...mockUser, isAdmin: true };
      req.userRoles = [];

      const middleware = authMiddleware.requireRole('Admin', 'Professionnel');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // requireAdmin
  // =========================================================================
  describe('requireAdmin', () => {
    it('should pass for admin users', () => {
      req.user = { ...mockUser, isAdmin: true };

      authMiddleware.requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject non-admin users with 403', () => {
      req.user = { ...mockUser, isAdmin: false };

      authMiddleware.requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when no user is attached', () => {
      req.user = undefined;

      authMiddleware.requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('isAdmin alias should behave the same as requireAdmin', () => {
      req.user = { ...mockUser, isAdmin: true };

      authMiddleware.isAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // optionalAuth
  // =========================================================================
  describe('optionalAuth', () => {
    it('should call next without setting user when no token', async () => {
      await authMiddleware.optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });

    it('should set user when valid token is provided', async () => {
      req.cookies = { access_token: 'valid-token' };
      jwt.verify.mockReturnValue({ userId: 1 });

      await authMiddleware.optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
    });

    it('should call next without user when token is invalid', async () => {
      req.cookies = { access_token: 'bad-token' };
      jwt.verify.mockImplementation(() => { throw new Error('invalid'); });

      await authMiddleware.optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });

    it('should not set user for blocked statuses', async () => {
      req.cookies = { access_token: 'valid-token' };
      jwt.verify.mockReturnValue({ userId: 1 });
      mockUser.statut = 'suspendu';

      await authMiddleware.optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });
  });

  // =========================================================================
  // requireActiveAccount
  // =========================================================================
  describe('requireActiveAccount', () => {
    it('should pass for active users', async () => {
      req.user = { ...mockUser, statut: 'actif' };

      await authMiddleware.requireActiveAccount(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject non-active users with 403', async () => {
      req.user = { ...mockUser, statut: 'en_attente_validation' };

      await authMiddleware.requireActiveAccount(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 401 when no user is attached', async () => {
      req.user = undefined;

      await authMiddleware.requireActiveAccount(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  // =========================================================================
  // requireOwnerOrAdmin
  // =========================================================================
  describe('requireOwnerOrAdmin', () => {
    it('should pass when user is the owner', () => {
      req.user = { ...mockUser, id_user: 5, isAdmin: false };
      req.params = { id_user: '5' };

      const middleware = authMiddleware.requireOwnerOrAdmin();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should pass when user is admin but not owner', () => {
      req.user = { ...mockUser, id_user: 1, isAdmin: true };
      req.params = { id_user: '5' };
      req.body = {};

      const middleware = authMiddleware.requireOwnerOrAdmin();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject when user is neither owner nor admin', () => {
      req.user = { ...mockUser, id_user: 1, isAdmin: false };
      req.params = { id_user: '5' };
      req.body = {};

      const middleware = authMiddleware.requireOwnerOrAdmin();
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
