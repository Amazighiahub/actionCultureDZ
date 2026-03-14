// middlewares/timeoutMiddleware.js - Request timeout protection

/**
 * Creates middleware that enforces a maximum request duration.
 * Prevents slow queries or external calls from holding connections indefinitely.
 *
 * @param {number} ms - Timeout in milliseconds (default: 30000 = 30s)
 */
function createTimeoutMiddleware(ms = 30000) {
  return (req, res, next) => {
    // Uploads get a longer timeout (5 minutes) instead of being skipped entirely
    const timeout = req.path.includes('/upload') ? 5 * 60 * 1000 : ms;

    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: 'Request timeout',
          code: 'REQUEST_TIMEOUT',
          requestId: req.requestId
        });
      }
    }, timeout);

    // Clear timeout when response finishes
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));

    next();
  };
}

module.exports = createTimeoutMiddleware;
