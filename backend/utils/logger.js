const { createLogger, format, transports } = require('winston');

const env = process.env.NODE_ENV || 'development';

const logger = createLogger({
  level: env === 'development' ? 'debug' : 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.printf(({ timestamp, level, message, stack }) => {
      return `${timestamp} [${level.toUpperCase()}] ${stack || message}`;
    })
  ),
  transports: [
    new transports.Console({
      stderrLevels: ['error']
    })
  ]
});

// Override global console to use our logger to avoid changing many files
const originalConsole = global.console;
global.console = {
  log: (...args) => logger.info(args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')),
  info: (...args) => logger.info(args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')),
  warn: (...args) => logger.warn(args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')),
  error: (...args) => logger.error(args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')),
  debug: (...args) => logger.debug(args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')),
  // keep other console methods if required
  trace: (...args) => logger.debug(args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '))
};

module.exports = logger;
