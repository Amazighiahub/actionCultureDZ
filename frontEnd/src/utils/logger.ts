/**
 * Logger utilitaire - N'affiche les logs qu'en développement
 * Remplace console.log pour éviter les logs en production
 */

const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  prefix?: string;
  emoji?: string;
}

class Logger {
  private prefix: string;
  private emoji: string;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix || '';
    this.emoji = options.emoji || '';
  }

  private formatMessage(message: string): string {
    const parts = [this.emoji, this.prefix, message].filter(Boolean);
    return parts.join(' ');
  }

  debug(...args: unknown[]): void {
    if (isDev) {
      const [first, ...rest] = args;
      if (typeof first === 'string') {
        console.log(this.formatMessage(first), ...rest);
      } else {
        console.log(this.emoji, this.prefix, ...args);
      }
    }
  }

  info(...args: unknown[]): void {
    if (isDev) {
      const [first, ...rest] = args;
      if (typeof first === 'string') {
        console.info(this.formatMessage(first), ...rest);
      } else {
        console.info(this.emoji, this.prefix, ...args);
      }
    }
  }

  warn(...args: unknown[]): void {
    // Les warnings sont toujours affichés
    const [first, ...rest] = args;
    if (typeof first === 'string') {
      console.warn(this.formatMessage(first), ...rest);
    } else {
      console.warn(this.emoji, this.prefix, ...args);
    }
  }

  error(...args: unknown[]): void {
    // Les erreurs sont toujours affichées
    const [first, ...rest] = args;
    if (typeof first === 'string') {
      console.error(this.formatMessage(first), ...rest);
    } else {
      console.error(this.emoji, this.prefix, ...args);
    }
  }

  // Méthode pour créer un sous-logger avec un nouveau préfixe
  child(options: LoggerOptions): Logger {
    return new Logger({
      prefix: [this.prefix, options.prefix].filter(Boolean).join(' > '),
      emoji: options.emoji || this.emoji
    });
  }
}

// Loggers pré-configurés pour différents modules
export const logger = new Logger();

export const apiLogger = new Logger({ prefix: '[API]', emoji: '🌐' });
export const authLogger = new Logger({ prefix: '[Auth]', emoji: '🔐' });
export const uploadLogger = new Logger({ prefix: '[Upload]', emoji: '📤' });
export const cacheLogger = new Logger({ prefix: '[Cache]', emoji: '📦' });
export const wsLogger = new Logger({ prefix: '[WebSocket]', emoji: '🔌' });
export const i18nLogger = new Logger({ prefix: '[i18n]', emoji: '🌍' });
export const uiLogger = new Logger({ prefix: '[UI]', emoji: '🎨' });

// Factory pour créer des loggers personnalisés
export const createLogger = (options: LoggerOptions): Logger => new Logger(options);

// Export par défaut
export default logger;
