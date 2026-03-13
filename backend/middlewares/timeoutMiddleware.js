// middlewares/timeoutMiddleware.js - Request timeout protection

/**
 * Creates middleware that enforces a maximum request duration.
 * Prevents slow queries or external calls from holding connections indefinitely.
 *
 * @param {number} ms - Timeout in milliseconds (default: 30000 = 30s)
 */
function createTimeoutMiddleware(ms = 30000) {
  return (req, res, next) => {
    // Skip for file uploads which legitimately take longer
    if (req.path.includes('/upload')) {
      return next();
    }

    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: 'Request timeout',
          code: 'REQUEST_TIMEOUT',
          requestId: req.requestId
        });
      }
    }, ms);

    // Clear timeout when response finishes
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));

    next();
  };
}

module.exports = createTimeoutMiddleware;
