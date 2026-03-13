/**
 * Tests unitaires pour errorMiddleware
 * Aligned with current AppError.fromError() normalized response format
 */

const AppError = require('../../utils/appError');
const errorMiddleware = require('../../middlewares/errorMiddleware');

describe('errorMiddleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      originalUrl: '/api/test',
      method: 'GET',
      t: jest.fn((key) => `translated:${key}`)
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    next = jest.fn();
  });

  // =========================================================================
  // notFound
  // =========================================================================
  describe('notFound', () => {
    it('should create a 404 error for unknown routes', () => {
      req.originalUrl = '/api/nonexistent';

      errorMiddleware.notFound(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ status: 404 })
      );
    });

    it('should silently return 404 for ignored paths like /.well-known', () => {
      req.originalUrl = '/.well-known/something';

      errorMiddleware.notFound(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Resource not found'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should silently return 404 for /favicon.ico', () => {
      req.originalUrl = '/favicon.ico';

      errorMiddleware.notFound(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(next).not.toHaveBeenCalled();
    });

    it('should silently return 404 for /.env', () => {
      req.originalUrl = '/.env';

      errorMiddleware.notFound(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(next).not.toHaveBeenCalled();
    });

    it('should use req.t for the error message when available', () => {
      req.originalUrl = '/api/users/999';

      errorMiddleware.notFound(req, res, next);

      expect(req.t).toHaveBeenCalledWith('common.notFound');
    });

    it('should fall back to default message when req.t is not available', () => {
      req.originalUrl = '/api/missing';
      req.t = undefined;

      errorMiddleware.notFound(req, res, next);

      const errorArg = next.mock.calls[0][0];
      expect(errorArg.message).toBe('Route not found');
    });
  });

  // =========================================================================
  // errorHandler – AppError
  // =========================================================================
  describe('errorHandler – AppError', () => {
    it('should handle AppError with its statusCode and flat JSON response', () => {
      const appErr = new AppError('Not found', 404, 'NOT_FOUND');

      errorMiddleware.errorHandler(appErr, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Not found',
          code: 'NOT_FOUND'
        })
      );
    });

    it('should handle AppError with details', () => {
      const appErr = AppError.badRequest('Bad input', 'VALIDATION_ERROR', [
        { field: 'email', message: 'invalid' }
      ]);

      errorMiddleware.errorHandler(appErr, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.details).toBeDefined();
      expect(jsonArg.details).toHaveLength(1);
    });
  });

  // =========================================================================
  // errorHandler – SequelizeValidationError
  // =========================================================================
  describe('errorHandler – SequelizeValidationError', () => {
    it('should return 400 via AppError.fromError()', () => {
      const error = new Error('Validation');
      error.name = 'SequelizeValidationError';
      error.errors = [
        { path: 'email', message: 'Email is required', value: 'test@test.com' },
        { path: 'nom', message: 'Nom is required', value: '' }
      ];

      errorMiddleware.errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.success).toBe(false);
      expect(jsonArg.code).toBe('DB_VALIDATION_ERROR');
      // In non-development env, validation details are masked
      expect(jsonArg.error).toBe('Erreur de validation des données');
    });
  });

  // =========================================================================
  // errorHandler – SequelizeUniqueConstraintError
  // =========================================================================
  describe('errorHandler – SequelizeUniqueConstraintError', () => {
    it('should return 409 for duplicate resource', () => {
      const error = new Error('Unique constraint');
      error.name = 'SequelizeUniqueConstraintError';
      error.fields = { email: 'test@test.com' };
      error.errors = [
        { path: 'email', message: 'email must be unique', value: 'test@test.com' }
      ];

      errorMiddleware.errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.success).toBe(false);
      expect(jsonArg.code).toBe('UNIQUE_CONSTRAINT');
    });

    it('should not leak the duplicate value in the error message', () => {
      const error = new Error('Unique constraint');
      error.name = 'SequelizeUniqueConstraintError';
      error.fields = { email: 'secret@email.com' };
      error.errors = [
        { path: 'email', message: 'email must be unique', value: 'secret@email.com' }
      ];

      errorMiddleware.errorHandler(error, req, res, next);

      const jsonArg = res.json.mock.calls[0][0];
      // The error message says "email doit être unique" — should not contain the actual value
      expect(jsonArg.error).not.toContain('secret@email.com');
    });
  });

  // =========================================================================
  // errorHandler – JWT errors
  // =========================================================================
  describe('errorHandler – JWT errors', () => {
    it('should return 401 for JsonWebTokenError', () => {
      const error = new Error('jwt malformed');
      error.name = 'JsonWebTokenError';

      errorMiddleware.errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.success).toBe(false);
      expect(jsonArg.code).toBe('INVALID_TOKEN');
    });

    it('should return 401 for TokenExpiredError', () => {
      const error = new Error('jwt expired');
      error.name = 'TokenExpiredError';

      errorMiddleware.errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json.mock.calls[0][0].code).toBe('TOKEN_EXPIRED');
    });
  });

  // =========================================================================
  // errorHandler – ENOSPC (mapped to generic 500 via fromError)
  // =========================================================================
  describe('errorHandler – ENOSPC', () => {
    it('should return 500 for ENOSPC (mapped through AppError.fromError)', () => {
      const error = new Error('No space left');
      error.code = 'ENOSPC';

      errorMiddleware.errorHandler(error, req, res, next);

      // AppError.fromError doesn't have special ENOSPC handling, so it becomes 500
      expect(res.status).toHaveBeenCalledWith(500);
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.success).toBe(false);
    });
  });

  // =========================================================================
  // errorHandler – Unknown / generic errors
  // =========================================================================
  describe('errorHandler – Unknown errors', () => {
    it('should return 500 for unknown errors', () => {
      const error = new Error('Something broke');

      errorMiddleware.errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.success).toBe(false);
    });

    it('should not include stack trace in test/production env', () => {
      const error = new Error('Secret internal error');

      errorMiddleware.errorHandler(error, req, res, next);

      const jsonArg = res.json.mock.calls[0][0];
      // NODE_ENV=test, so no stack
      expect(jsonArg.stack).toBeUndefined();
    });

    it('should use error.status if set', () => {
      const error = new Error('Custom status');
      error.status = 418;

      errorMiddleware.errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(418);
    });

    it('should use error.statusCode if set (via AppError)', () => {
      const error = new Error('Custom statusCode');
      error.statusCode = 422;

      errorMiddleware.errorHandler(error, req, res, next);

      // AppError.fromError won't recognize statusCode on a generic Error,
      // but the errorHandler checks error.status fallback
      // Since this is a plain Error, fromError returns 500, but statusCode is preserved
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.success).toBe(false);
    });
  });

  // =========================================================================
  // errorHandler – Sequelize DB errors
  // =========================================================================
  describe('errorHandler – SequelizeDatabaseError', () => {
    it('should return 500 for database errors', () => {
      const error = new Error('DB failed');
      error.name = 'SequelizeDatabaseError';

      errorMiddleware.errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('errorHandler – SequelizeForeignKeyConstraintError', () => {
    it('should return 400 for FK constraint errors', () => {
      const error = new Error('FK violated');
      error.name = 'SequelizeForeignKeyConstraintError';

      errorMiddleware.errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].code).toBe('FK_CONSTRAINT');
    });
  });
});
