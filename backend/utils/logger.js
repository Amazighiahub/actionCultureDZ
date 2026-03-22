const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');

const env = process.env.NODE_ENV || 'development';

// Créer le dossier logs s'il n'existe pas
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Format personnalisé pour la console (coloré en dev)
const consoleFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.splat(),
  env === 'development'
    ? format.colorize({ all: true })
    : format.uncolorize(),
  format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level}] ${stack || message}`;
    if (Object.keys(meta).length > 0 && meta.service !== 'action-culture-api') {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

// Format pour les fichiers (JSON structuré)
const fileFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.json()
);

// Transports
const loggerTransports = [
  // Console - warn+ en production, debug en dev
  new transports.Console({
    format: consoleFormat,
    level: env === 'production' ? 'warn' : 'debug',
    stderrLevels: ['error']
  })
];

// En production, ajouter les fichiers de log
if (env === 'production') {
  // Fichier pour tous les logs
  loggerTransports.push(
    new transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    })
  );

  // Fichier séparé pour les erreurs
  loggerTransports.push(
    new transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      tailable: true
    })
  );
}

const logger = createLogger({
  level: env === 'development' ? 'debug' : 'info',
  defaultMeta: { service: 'action-culture-api' },
  transports: loggerTransports,
  exitOnError: false
});

// Méthodes utilitaires pour le logging structuré
logger.logRequest = (req, message = 'Request') => {
  logger.info(message, {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userId: req.user?.id_user,
    lang: req.lang
  });
};

logger.logError = (error, context = {}) => {
  logger.error(error.message, {
    requestId: context.requestId,
    stack: error.stack,
    code: error.code,
    ...context
  });
};

logger.logDb = (operation, table, duration) => {
  const level = duration > 1000 ? 'warn' : 'debug';
  logger[level](`DB ${operation} on ${table}`, { duration: `${duration}ms`, slow: duration > 1000 });
};

// Override global console to use our logger
const originalConsole = global.console;
const safeStringify = (a) => {
  if (typeof a === 'string') return a;
  try { return JSON.stringify(a); } catch { return String(a); }
};
const formatArgs = (...args) => args.map(safeStringify).join(' ');
global.console = {
  log: (...args) => logger.info(formatArgs(...args)),
  info: (...args) => logger.info(formatArgs(...args)),
  warn: (...args) => logger.warn(formatArgs(...args)),
  error: (...args) => logger.error(formatArgs(...args)),
  debug: (...args) => logger.debug(formatArgs(...args)),
  trace: (...args) => logger.debug(formatArgs(...args)),
  // Conserver les méthodes natives pour les librairies tierces
  table: originalConsole.table.bind(originalConsole),
  dir: originalConsole.dir.bind(originalConsole),
  time: originalConsole.time.bind(originalConsole),
  timeEnd: originalConsole.timeEnd.bind(originalConsole),
  timeLog: originalConsole.timeLog.bind(originalConsole),
  assert: originalConsole.assert.bind(originalConsole),
  clear: originalConsole.clear.bind(originalConsole),
  count: originalConsole.count.bind(originalConsole),
  countReset: originalConsole.countReset.bind(originalConsole),
  group: originalConsole.group.bind(originalConsole),
  groupEnd: originalConsole.groupEnd.bind(originalConsole),
  // Garder la console originale accessible si besoin
  _original: originalConsole
};

module.exports = logger;
