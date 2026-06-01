/**
 * Validateur des variables d'environnement
 * Vérifie que toutes les variables requises sont présentes et valides au démarrage
 */

class EnvironmentValidator {
  static REQUIRED_VARS = {
    all: [
      'NODE_ENV',
      'PORT',
      'DB_NAME',
      'DB_USER',
      'DB_PASSWORD',
      'DB_HOST',
      'JWT_SECRET'
    ],
    production: [
      'API_URL',
      'FRONTEND_URL',
      'EMAIL_HOST',
      'EMAIL_USER',
      'EMAIL_PASSWORD',
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET',
      'REDIS_PASSWORD'
    ],
    development: []
  };

  static OPTIONAL_VARS = {
    'DB_PORT': '3306',
    'DB_DIALECT': 'mysql',
    'PORT': '3001',
    'HOST': '0.0.0.0',
    'JWT_EXPIRES_IN': '24h',
    'BCRYPT_ROUNDS': '12',
    'DB_POOL_MAX': '10',
    'DB_POOL_MIN': '0',
    'DB_POOL_ACQUIRE': '30000',
    'DB_POOL_IDLE': '10000',
    'RATE_LIMIT_WINDOW': '900000',
    'RATE_LIMIT_MAX': '1000',
    'DEFAULT_LANGUAGE': 'fr',
    'SUPPORTED_LANGUAGES': 'fr,ar,en',
    'DEFAULT_TIMEZONE': 'Africa/Algiers',
    'DEFAULT_PAGE_SIZE': '10',
    'MAX_PAGE_SIZE': '100',
    'MIN_SEARCH_LENGTH': '2',
    'MAX_SEARCH_RESULTS': '50',
    'NOTIFICATION_RETENTION_DAYS': '90',
    'AUDIT_LOG_RETENTION_DAYS': '90',
    'SESSION_TIMEOUT': '86400',
    'TEMP_FILES_RETENTION_HOURS': '24',
    'WEBSOCKET_ENABLED': 'true',
    'ENABLE_SCHEDULED_TASKS': 'true',
    'ENABLE_AUDIT_LOGS': 'true',
    'USE_REDIS_MEMORY': 'true',
    'REDIS_HOST': 'localhost',
    'REDIS_PORT': '6379',
    'EMAIL_QUEUE_ENABLED': 'true',
    'EMAIL_RETRY_ATTEMPTS': '3',
    'EMAIL_RETRY_DELAY': '5000',
    'ENABLE_NEWSLETTER': 'true',
    'EMAIL_PAUSED': 'false'
  };

  /**
   * Valide les variables d'environnement au démarrage.
   * @returns {{ errors: string[], warnings: string[] }}
   * @throws {Error} Si des variables requises sont manquantes ou invalides
   */
  static validate() {
    const env = process.env.NODE_ENV || 'development';
    const errors = [];
    const warnings = [];

    // Variables requises
    const requiredVars = [
      ...EnvironmentValidator.REQUIRED_VARS.all,
      ...(EnvironmentValidator.REQUIRED_VARS[env] || [])
    ];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        errors.push(`Variable d'environnement requise manquante: ${varName}`);
      }
    }

    // NODE_ENV valide
    if (process.env.NODE_ENV && !['development', 'test', 'production'].includes(process.env.NODE_ENV)) {
      errors.push(`NODE_ENV invalide: "${process.env.NODE_ENV}". Doit etre: development, test, ou production`);
    }

    // Numériques
    if (process.env.PORT && isNaN(parseInt(process.env.PORT))) {
      errors.push(`PORT doit etre un nombre, recu: "${process.env.PORT}"`);
    }

    if (process.env.DB_PORT && isNaN(parseInt(process.env.DB_PORT))) {
      errors.push(`DB_PORT doit etre un nombre, recu: "${process.env.DB_PORT}"`);
    }

    if (process.env.BCRYPT_ROUNDS) {
      const rounds = parseInt(process.env.BCRYPT_ROUNDS);
      if (isNaN(rounds)) {
        errors.push(`BCRYPT_ROUNDS doit etre un nombre`);
      } else if (rounds < 4) {
        errors.push(`BCRYPT_ROUNDS doit etre >= 4, recu: ${rounds}`);
      }
    }

    if (process.env.UPLOAD_IMAGE_MAX_SIZE && isNaN(parseInt(process.env.UPLOAD_IMAGE_MAX_SIZE))) {
      errors.push(`UPLOAD_IMAGE_MAX_SIZE doit etre un nombre, recu: "${process.env.UPLOAD_IMAGE_MAX_SIZE}"`);
    }

    // Booléens
    if (process.env.CORS_ALLOW_NO_ORIGIN && !['true', 'false'].includes(process.env.CORS_ALLOW_NO_ORIGIN)) {
      errors.push(`CORS_ALLOW_NO_ORIGIN doit valoir "true" ou "false", recu: "${process.env.CORS_ALLOW_NO_ORIGIN}"`);
    }

    // Valeurs d'exemple interdites
    const INSECURE_EXAMPLE_VALUES = [
      'your-secret-key-change-in-production',
      'votre_secret_jwt_tres_long_et_aleatoire_min_32_caracteres',
      'REMPLACER_PAR_UN_SECRET_GENERE_AVEC_LE_SCRIPT',
      'your-email@gmail.com',
      'your-app-password',
      'changeme',
      'secret',
      'password'
    ];

    // JWT_SECRET
    if (process.env.JWT_SECRET) {
      if (process.env.JWT_SECRET.length < 32) {
        if (env === 'production') {
          errors.push(`JWT_SECRET trop court (${process.env.JWT_SECRET.length} chars). Minimum 32 requis en production.`);
        } else {
          warnings.push(`JWT_SECRET est trop court (${process.env.JWT_SECRET.length} chars), recommande: 32+`);
        }
      }
      const isExampleValue = INSECURE_EXAMPLE_VALUES.some(
        ex => process.env.JWT_SECRET.toLowerCase().includes(ex.toLowerCase())
      );
      if (isExampleValue && env === 'production') {
        errors.push(`JWT_SECRET contient une valeur d'exemple non securisee!`);
      }
    }

    // URLs
    if (process.env.API_URL && !/^https?:\/\//.test(process.env.API_URL)) {
      errors.push(`API_URL doit etre une URL absolue (https://...), recu: "${process.env.API_URL}"`);
    }

    // EMAIL_FROM format
    if (process.env.EMAIL_FROM) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(process.env.EMAIL_FROM)) {
        errors.push(`EMAIL_FROM n'est pas un email valide: "${process.env.EMAIL_FROM}"`);
      }
    }

    // Validations strictes en production
    if (env === 'production' && process.env.SKIP_PRODUCTION_CHECKS !== 'true') {
      if (process.env.DB_USER === 'root') {
        errors.push(`DB_USER ne doit pas etre "root" en production!`);
      }

      if (process.env.DB_PASSWORD && process.env.DB_PASSWORD.length < 12) {
        errors.push(`DB_PASSWORD trop court (${process.env.DB_PASSWORD.length} chars). Minimum 12 en production.`);
      }

      if (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.startsWith('https://')) {
        errors.push(`FRONTEND_URL doit utiliser HTTPS en production. Actuel: ${process.env.FRONTEND_URL}`);
      }

      if (process.env.EMAIL_USER) {
        const isExampleEmail = INSECURE_EXAMPLE_VALUES.some(
          ex => process.env.EMAIL_USER.toLowerCase().includes(ex.toLowerCase())
        );
        if (isExampleEmail) {
          errors.push(`EMAIL_USER contient une valeur d'exemple. Configurez un vrai service email.`);
        }
      }

      if (process.env.CLOUDINARY_API_SECRET) {
        const CLOUDINARY_EXAMPLES = ['your_api_secret', 'your-api-secret', 'your_api_key', 'placeholder'];
        const isPlaceholder = CLOUDINARY_EXAMPLES.some(
          ex => process.env.CLOUDINARY_API_SECRET.toLowerCase().includes(ex.toLowerCase())
        );
        if (isPlaceholder) {
          errors.push(`CLOUDINARY_API_SECRET contient une valeur d'exemple. Configurez votre vrai secret.`);
        } else if (process.env.CLOUDINARY_API_SECRET.length < 10) {
          errors.push(`CLOUDINARY_API_SECRET semble trop court (${process.env.CLOUDINARY_API_SECRET.length} chars).`);
        }
      }

      // Avertissements production
      if (process.env.CORS_ALLOW_NO_ORIGIN === 'true') {
        warnings.push(`CORS_ALLOW_NO_ORIGIN=true en production desactive la verification d'origine CORS`);
      }

      if (!process.env.SENTRY_DSN) {
        warnings.push(`SENTRY_DSN non configure — les erreurs production ne seront pas capturees`);
      }
    }

    // Afficher et lever les erreurs
    if (errors.length > 0) {
      const logger = require('../utils/logger');
      logger.error('\n🔴 ERREURS DE CONFIGURATION:\n');
      errors.forEach(e => logger.error(`  ❌ ${e}`));
      logger.error('\n');
      throw new Error(errors.join('\n'));
    }

    if (warnings.length > 0) {
      const logger = require('../utils/logger');
      logger.warn('\n🟡 AVERTISSEMENTS DE CONFIGURATION:\n');
      warnings.forEach(w => logger.warn(`  ⚠️  ${w}`));
      logger.warn('\n');
    }

    const logger = require('../utils/logger');
    logger.info('✅ Validation des variables d\'environnement réussie\n');

    return { errors: [], warnings };
  }

  static get(varName, defaultValue = undefined) {
    return process.env[varName] || defaultValue || EnvironmentValidator.OPTIONAL_VARS[varName];
  }

  static printReport() {
    const env = process.env.NODE_ENV || 'development';
    console.log('\n📋 RAPPORT DE CONFIGURATION\n');
    console.log(`Environnement: ${env}`);
    console.log(`Port: ${process.env.PORT || 3001}`);
    console.log(`Base de données: ${process.env.DB_HOST || 'localhost'}/${process.env.DB_NAME}`);
    console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'Non configuré'}`);
    console.log(`Redis: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`);
    console.log('');
  }
}

module.exports = EnvironmentValidator;
