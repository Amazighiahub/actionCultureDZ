const requestContext = require('../../middlewares/requestContext');

describe('requestContext middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      method: 'GET',
      originalUrl: '/api/test',
      ip: '127.0.0.1'
    };
    res = {
      setHeader: jest.fn(),
      statusCode: 200,
      on: jest.fn()
    };
    next = jest.fn();
  });

  it('generates a UUID request ID when none provided', () => {
    requestContext(req, res, next);

    expect(req.requestId).toBeDefined();
    // UUID v4 format
    expect(req.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(next).toHaveBeenCalled();
  });

  it('uses existing X-Request-Id header if provided', () => {
    req.headers['x-request-id'] = 'existing-id-123';

    requestContext(req, res, next);

    expect(req.requestId).toBe('existing-id-123');
  });

  it('sets X-Request-Id response header', () => {
    requestContext(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', req.requestId);
  });

  it('calls next()', () => {
    requestContext(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(); // no error argument
  });

  it('registers a finish event listener for timing', () => {
    requestContext(req, res, next);

    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });
});
