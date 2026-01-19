/**
 * Validateur des variables d'environnement
 * Vérifie que toutes les variables requises sont présentes et valides au démarrage
 */

class EnvironmentValidator {
  /**
   * Variables requises par environnement
   */
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
      'EMAIL_PASSWORD'
    ],
    development: []
  };

  /**
   * Variables optionnelles avec valeurs par défaut
   */
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
   * Valide les variables d'environnement au démarrage
   * @throws {Error} Si des variables requises sont manquantes
   */
  static validate() {
    const env = process.env.NODE_ENV || 'development';
    const errors = [];
    const warnings = [];

    // Vérifier les variables requises
    const requiredVars = [
      ...EnvironmentValidator.REQUIRED_VARS.all,
      ...(EnvironmentValidator.REQUIRED_VARS[env] || [])
    ];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        errors.push(`❌ Variable d'environnement requise manquante: ${varName}`);
      }
    }

    // Avertissements pour les valeurs par défaut utilisées
    for (const [varName, defaultValue] of Object.entries(
      EnvironmentValidator.OPTIONAL_VARS
    )) {
      if (!process.env[varName]) {
        warnings.push(
          `⚠️ ${varName} utilise la valeur par défaut: "${defaultValue}"`
        );
      }
    }

    // Validations spécifiques
    if (process.env.NODE_ENV && !['development', 'test', 'production'].includes(process.env.NODE_ENV)) {
      errors.push(
        `❌ NODE_ENV invalide: "${process.env.NODE_ENV}". Doit être: development, test, ou production`
      );
    }

    if (process.env.PORT && isNaN(parseInt(process.env.PORT))) {
      errors.push(`❌ PORT doit être un nombre, reçu: "${process.env.PORT}"`);
    }

    if (process.env.DB_PORT && isNaN(parseInt(process.env.DB_PORT))) {
      errors.push(`❌ DB_PORT doit être un nombre, reçu: "${process.env.DB_PORT}"`);
    }

    // Valeurs d'exemple à rejeter
    const INSECURE_EXAMPLE_VALUES = [
      'your-secret-key-change-in-production',
      'votre_secret_jwt_tres_long_et_aleatoire_min_32_caracteres',
      'your-email@gmail.com',
      'your-app-password',
      'changeme',
      'secret',
      'password'
    ];

    // Validation JWT_SECRET
    if (process.env.JWT_SECRET) {
      if (process.env.JWT_SECRET.length < 32) {
        if (env === 'production') {
          errors.push(
            `❌ JWT_SECRET trop court (${process.env.JWT_SECRET.length} caractères). Minimum 32 requis en production.`
          );
        } else {
          warnings.push(
            `⚠️ JWT_SECRET est très court (${process.env.JWT_SECRET.length} caractères), recommandé: 32+`
          );
        }
      }

      // Vérifier si c'est une valeur d'exemple
      const isExampleValue = INSECURE_EXAMPLE_VALUES.some(
        example => process.env.JWT_SECRET.toLowerCase().includes(example.toLowerCase())
      );
      if (isExampleValue && env === 'production') {
        errors.push(
          `❌ JWT_SECRET contient une valeur d'exemple non sécurisée! Générez un nouveau secret avec: node scripts/generateSecret.js`
        );
      }
    }

    if (process.env.BCRYPT_ROUNDS && isNaN(parseInt(process.env.BCRYPT_ROUNDS))) {
      errors.push(`❌ BCRYPT_ROUNDS doit être un nombre`);
    }

    // Validations strictes en production
    if (env === 'production') {
      // Vérifier DB_USER n'est pas root
      if (process.env.DB_USER === 'root') {
        errors.push(
          `❌ DB_USER ne doit pas être "root" en production! Créez un utilisateur dédié avec des privilèges limités.`
        );
      }

      // Vérifier DB_PASSWORD n'est pas faible
      if (process.env.DB_PASSWORD && process.env.DB_PASSWORD.length < 12) {
        errors.push(
          `❌ DB_PASSWORD trop court (${process.env.DB_PASSWORD.length} caractères). Minimum 12 requis en production.`
        );
      }

      // Vérifier que FRONTEND_URL utilise HTTPS
      if (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.startsWith('https://')) {
        errors.push(
          `❌ FRONTEND_URL doit utiliser HTTPS en production. Actuel: ${process.env.FRONTEND_URL}`
        );
      }

      // Vérifier que EMAIL n'utilise pas les valeurs d'exemple
      if (process.env.EMAIL_USER) {
        const isExampleEmail = INSECURE_EXAMPLE_VALUES.some(
          example => process.env.EMAIL_USER.toLowerCase().includes(example.toLowerCase())
        );
        if (isExampleEmail) {
          errors.push(
            `❌ EMAIL_USER contient une valeur d'exemple. Configurez un vrai service email.`
          );
        }
      }

      if (process.env.NODE_ENV !== 'production') {
        warnings.push('⚠️ NODE_ENV ne vaut pas "production" en environnement production');
      }
    }

    // Afficher les résultats
    if (errors.length > 0) {
      const logger = require('../utils/logger');
      logger.error('\n🔴 ERREURS DE CONFIGURATION:\n');
        errors.forEach(error => logger.error(error));
        logger.error('\n');
      throw new Error('Configuration invalide. Voir les erreurs ci-dessus.');
    }

      if (warnings.length > 0) {
        const logger = require('../utils/logger');
        logger.warn('\n🟡 AVERTISSEMENTS DE CONFIGURATION:\n');
        warnings.forEach(warning => logger.warn(warning));
        logger.warn('\n');
      }

      const logger = require('../utils/logger');
      logger.info('✅ Validation des variables d\'environnement réussie\n');
  }

  /**
   * Obtient la valeur d'une variable d'environnement avec valeur par défaut
   */
  static get(varName, defaultValue = undefined) {
    return process.env[varName] || defaultValue || EnvironmentValidator.OPTIONAL_VARS[varName];
  }

  /**
   * Affiche un rapport de configuration
   */
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
