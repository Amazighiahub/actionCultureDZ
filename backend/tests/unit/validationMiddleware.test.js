/**
 * Tests unitaires pour validationMiddleware
 */

const validationMiddleware = require('../../middlewares/validationMiddleware');

jest.mock('express-validator', () => {
  const mockValidationResult = jest.fn();
  return {
    validationResult: mockValidationResult
  };
});

const { validationResult } = require('express-validator');

describe('validationMiddleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {},
      t: jest.fn((key, params) => `translated:${key}`)
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    next = jest.fn();
  });

  // =========================================================================
  // validateId
  // =========================================================================
  describe('validateId', () => {
    it('should pass with a valid numeric ID', () => {
      req.params = { id: '42' };

      const middleware = validationMiddleware.validateId('id');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.params.id).toBe(42);
    });

    it('should reject non-numeric ID', () => {
      req.params = { id: 'abc' };

      const middleware = validationMiddleware.validateId('id');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject negative ID', () => {
      req.params = { id: '-5' };

      const middleware = validationMiddleware.validateId('id');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject zero as ID', () => {
      req.params = { id: '0' };

      const middleware = validationMiddleware.validateId('id');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should use default param name "id" when none specified', () => {
      req.params = { id: '10' };

      const middleware = validationMiddleware.validateId();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.params.id).toBe(10);
    });

    it('should validate custom param names', () => {
      req.params = { id_user: '7' };

      const middleware = validationMiddleware.validateId('id_user');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.params.id_user).toBe(7);
    });

    it('should reject float values (parsed as integer)', () => {
      req.params = { id: '3.14' };

      const middleware = validationMiddleware.validateId('id');
      middleware(req, res, next);

      // parseInt('3.14') = 3, which is > 0, so it should pass
      expect(next).toHaveBeenCalled();
      expect(req.params.id).toBe(3);
    });

    it('should reject empty string', () => {
      req.params = { id: '' };

      const middleware = validationMiddleware.validateId('id');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // validatePagination
  // =========================================================================
  describe('validatePagination', () => {
    it('should pass with valid page and limit', () => {
      req.query = { page: '2', limit: '20' };

      validationMiddleware.validatePagination(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.query.page).toBe(2);
      expect(req.query.limit).toBe(20);
    });

    it('should use defaults when page and limit are not provided', () => {
      req.query = {};

      validationMiddleware.validatePagination(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.query.page).toBe(1);
      expect(req.query.limit).toBe(10);
    });

    it('should reject invalid page (non-numeric)', () => {
      req.query = { page: 'abc', limit: '10' };

      validationMiddleware.validatePagination(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject page < 1', () => {
      req.query = { page: '0', limit: '10' };

      validationMiddleware.validatePagination(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject negative page', () => {
      req.query = { page: '-1', limit: '10' };

      validationMiddleware.validatePagination(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should reject invalid limit (non-numeric)', () => {
      req.query = { page: '1', limit: 'abc' };

      validationMiddleware.validatePagination(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject limit > 100', () => {
      req.query = { page: '1', limit: '101' };

      validationMiddleware.validatePagination(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject limit < 1', () => {
      req.query = { page: '1', limit: '0' };

      validationMiddleware.validatePagination(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should accept limit = 100 (boundary)', () => {
      req.query = { page: '1', limit: '100' };

      validationMiddleware.validatePagination(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.query.limit).toBe(100);
    });

    it('should accept limit = 1 (boundary)', () => {
      req.query = { page: '1', limit: '1' };

      validationMiddleware.validatePagination(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.query.limit).toBe(1);
    });
  });

  // =========================================================================
  // validateStringLengths
  // =========================================================================
  describe('validateStringLengths', () => {
    it('should pass with normal-length strings', () => {
      req.body = { nom: 'John', email: 'john@example.com' };

      validationMiddleware.validateStringLengths(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject a nom exceeding 255 characters', () => {
      req.body = { nom: 'a'.repeat(256) };

      validationMiddleware.validateStringLengths(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject a title exceeding 500 characters', () => {
      req.body = { title: 'x'.repeat(501) };

      validationMiddleware.validateStringLengths(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept a description up to 50000 characters', () => {
      req.body = { description: 'z'.repeat(50000) };

      validationMiddleware.validateStringLengths(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject a description exceeding 50000 characters', () => {
      req.body = { description: 'z'.repeat(50001) };

      validationMiddleware.validateStringLengths(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should apply default limit (10000) for unknown fields', () => {
      req.body = { custom_field: 'c'.repeat(10001) };

      validationMiddleware.validateStringLengths(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should accept unknown fields within default limit', () => {
      req.body = { custom_field: 'c'.repeat(10000) };

      validationMiddleware.validateStringLengths(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should validate nested object string values against default limit', () => {
      req.body = {
        titre: { fr: 'a'.repeat(10001), en: 'Valid' }
      };

      validationMiddleware.validateStringLengths(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should pass nested objects with valid lengths', () => {
      req.body = {
        titre: { fr: 'Titre valide', en: 'Valid title', ar: 'عنوان' }
      };

      validationMiddleware.validateStringLengths(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle empty body gracefully', () => {
      req.body = {};

      validationMiddleware.validateStringLengths(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle null body gracefully', () => {
      req.body = null;

      validationMiddleware.validateStringLengths(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should skip non-string, non-object values', () => {
      req.body = { count: 42, active: true, nom: 'Valid' };

      validationMiddleware.validateStringLengths(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // handleValidationErrors
  // =========================================================================
  describe('handleValidationErrors', () => {
    it('should call next when there are no validation errors', () => {
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      validationMiddleware.handleValidationErrors(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 400 with formatted errors when validation fails', () => {
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [
          { path: 'email', msg: 'Email is required', value: undefined },
          { path: 'nom', msg: 'Nom is required', value: '' }
        ]
      });

      validationMiddleware.handleValidationErrors(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.success).toBe(false);
      expect(jsonArg.details).toHaveLength(2);
      expect(jsonArg.details[0]).toEqual({
        field: 'email',
        message: 'Email is required',
        value: undefined
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should use param fallback when path is not available', () => {
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [
          { param: 'password', msg: 'Too short', value: 'abc' }
        ]
      });

      validationMiddleware.handleValidationErrors(req, res, next);

      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.details[0].field).toBe('password');
    });

    it('should use translation function for error message', () => {
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ path: 'x', msg: 'err', value: '' }]
      });

      validationMiddleware.handleValidationErrors(req, res, next);

      expect(req.t).toHaveBeenCalledWith('validation.invalidData');
    });

    it('should fall back to default message when req.t is unavailable', () => {
      req.t = undefined;
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ path: 'x', msg: 'err', value: '' }]
      });

      validationMiddleware.handleValidationErrors(req, res, next);

      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.error).toBe('Validation errors');
    });
  });
});
