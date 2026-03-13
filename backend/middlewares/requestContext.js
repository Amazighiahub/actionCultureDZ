// middlewares/requestContext.js - Correlation ID + Request timing
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Generates a unique request ID and attaches it to the request.
 * Also measures request duration and logs slow requests.
 */
function requestContext(req, res, next) {
  // Generate or forward correlation ID
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  // Track timing
  const startTime = process.hrtime.bigint();

  // Log on response finish
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startTime) / 1e6;
    const logData = {
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      ip: req.ip,
      userId: req.user?.id_user || null,
      userAgent: req.headers['user-agent']?.substring(0, 100)
    };

    // Slow request warning (> 2s)
    if (durationMs > 2000) {
      logger.warn('Slow request detected', logData);
    } else if (res.statusCode >= 500) {
      logger.error('Server error response', logData);
    } else if (res.statusCode >= 400) {
      logger.debug('Client error response', logData);
    }
  });

  next();
}

module.exports = requestContext;
