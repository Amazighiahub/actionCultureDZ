const createTimeoutMiddleware = require('../../middlewares/timeoutMiddleware');

describe('timeoutMiddleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { path: '/api/test', requestId: 'req-123' };
    res = {
      headersSent: false,
      statusCode: null,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      on: jest.fn()
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls next() for normal requests', () => {
    const middleware = createTimeoutMiddleware(30000);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('skips timeout for upload paths', () => {
    jest.useFakeTimers();
    req.path = '/api/upload/image';
    const middleware = createTimeoutMiddleware(100);

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);

    // Even after timeout, no 408 should be sent (res.on not called for uploads)
    jest.advanceTimersByTime(200);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 408 on timeout', () => {
    jest.useFakeTimers();
    const middleware = createTimeoutMiddleware(100);

    middleware(req, res, next);

    jest.advanceTimersByTime(150);

    expect(res.status).toHaveBeenCalledWith(408);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Request timeout',
        code: 'REQUEST_TIMEOUT'
      })
    );
  });

  it('does not send 408 if headers already sent', () => {
    jest.useFakeTimers();
    const middleware = createTimeoutMiddleware(100);

    middleware(req, res, next);
    res.headersSent = true;

    jest.advanceTimersByTime(150);

    expect(res.status).not.toHaveBeenCalled();
  });

  it('registers finish and close event listeners', () => {
    const middleware = createTimeoutMiddleware(30000);
    middleware(req, res, next);

    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
    expect(res.on).toHaveBeenCalledWith('close', expect.any(Function));
  });

  it('clears timeout when response finishes', () => {
    jest.useFakeTimers();
    const middleware = createTimeoutMiddleware(100);

    middleware(req, res, next);

    // Simulate response finishing before timeout
    const finishCallback = res.on.mock.calls.find(c => c[0] === 'finish')[1];
    finishCallback();

    jest.advanceTimersByTime(200);

    // Should NOT have sent 408 because timer was cleared
    expect(res.status).not.toHaveBeenCalled();
  });

  it('uses default timeout of 30000ms', () => {
    const middleware = createTimeoutMiddleware();
    // Just verify it creates without error and calls next
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
