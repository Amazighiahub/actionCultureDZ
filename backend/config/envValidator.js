/**
 * Validateur des variables d'environnement
 * Verifie que toutes les variables requises sont presentes et valides au demarrage
 *
 * Conventions :
 * - errors : bloquent le boot via throw (config incompatible avec l'env)
 * - warnings : loguent sans bloquer (defaut utilise, optionnel manquant)
 *
 * Etendu Lot 8 (2026-04) : validation Cloudinary, Redis password, CORS, JWT
 * issuer/audience, uploads numeriques, Sentry DSN, BCRYPT range, formats
 * (email / url / nombre).
 */

// Regex email simplifiee — pas RFC5322 complete, suffisant pour EMAIL_FROM
// et detecter les placeholders "your-email@gmail.com".
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Placeholder values qu'on refuse de voir en prod (copie de .env.example)
const INSECURE_EXAMPLE_VALUES = [
  'your-secret-key-change-in-production',
  'votre_secret_jwt_tres_long_et_aleatoire_min_32_caracteres',
  'your-email@gmail.com',
  'your-app-password',
  'your_cloud_name',
  'your_api_key',
  'your_api_secret',
  'REMPLACER_PAR_UN_SECRET_GENERE_AVEC_LE_SCRIPT',
  'changeme',
  'secret',
  'password'
];

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
      'EMAIL_PASSWORD',
      // Lot 8 : uploads Cloudinary indispensables (sinon /api/upload casse
      // silencieusement et les images d'oeuvres/evenements n'arrivent plus).
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET',
      // Lot 10 : REDIS_PASSWORD doit etre defini en prod pour que le rate-limit
      // distribue fonctionne (sinon connexion refusee sur redis protege).
      'REDIS_PASSWORD'
    ],
    development: []
  };

  /**
   * Variables optionnelles avec valeurs par defaut
   */
  static OPTIONAL_VARS = {
    DB_PORT: '3306',
    DB_DIALECT: 'mysql',
    PORT: '3001',
    HOST: '0.0.0.0',
    JWT_EXPIRES_IN: '24h',
    BCRYPT_ROUNDS: '12',
    DB_POOL_MAX: '10',
    DB_POOL_MIN: '0',
    DB_POOL_ACQUIRE: '30000',
    DB_POOL_IDLE: '10000',
    RATE_LIMIT_WINDOW: '900000',
    RATE_LIMIT_MAX: '1000',
    DEFAULT_LANGUAGE: 'fr',
    SUPPORTED_LANGUAGES: 'fr,ar,en',
    DEFAULT_TIMEZONE: 'Africa/Algiers',
    DEFAULT_PAGE_SIZE: '10',
    MAX_PAGE_SIZE: '100',
    MIN_SEARCH_LENGTH: '2',
    MAX_SEARCH_RESULTS: '50',
    NOTIFICATION_RETENTION_DAYS: '90',
    AUDIT_LOG_RETENTION_DAYS: '90',
    SESSION_TIMEOUT: '86400',
    TEMP_FILES_RETENTION_HOURS: '24',
    WEBSOCKET_ENABLED: 'true',
    ENABLE_SCHEDULED_TASKS: 'true',
    ENABLE_AUDIT_LOGS: 'true',
    USE_REDIS_MEMORY: 'true',
    REDIS_HOST: 'localhost',
    REDIS_PORT: '6379',
    EMAIL_QUEUE_ENABLED: 'true',
    EMAIL_RETRY_ATTEMPTS: '3',
    EMAIL_RETRY_DELAY: '5000',
    ENABLE_NEWSLETTER: 'true',
    EMAIL_PAUSED: 'false',
    // Lot 8 : defauts explicites pour les vars introduites par lots recents.
    JWT_ISSUER: 'eventculture-api',
    JWT_AUDIENCE: 'eventculture-web',
    JWT_BLACKLIST_FAIL_CLOSED: 'true',
    UPLOAD_IMAGE_MAX_SIZE: String(10 * 1024 * 1024),
    UPLOAD_DOCUMENT_MAX_SIZE: String(20 * 1024 * 1024),
    UPLOAD_VIDEO_MAX_SIZE: String(100 * 1024 * 1024),
    UPLOAD_AUDIO_MAX_SIZE: String(50 * 1024 * 1024),
    REDIS_BOOT_TIMEOUT_MS: '5000',
    CORS_ALLOW_NO_ORIGIN: 'false'
  };

  /**
   * Variables a valider comme entiers positifs (NaN => erreur).
   * min/max inclus si definis.
   */
  static NUMERIC_VARS = {
    PORT: { min: 1, max: 65535 },
    DB_PORT: { min: 1, max: 65535 },
    REDIS_PORT: { min: 1, max: 65535 },
    EMAIL_PORT: { min: 1, max: 65535 },
    BCRYPT_ROUNDS: { min: 4, max: 15 },
    RATE_LIMIT_WINDOW: { min: 1000 },
    RATE_LIMIT_MAX: { min: 1 },
    UPLOAD_MAX_SIZE: { min: 1024 },
    UPLOAD_IMAGE_MAX_SIZE: { min: 1024 },
    UPLOAD_DOCUMENT_MAX_SIZE: { min: 1024 },
    UPLOAD_VIDEO_MAX_SIZE: { min: 1024 },
    UPLOAD_AUDIO_MAX_SIZE: { min: 1024 },
    REDIS_BOOT_TIMEOUT_MS: { min: 0, max: 60000 },
    SESSION_TIMEOUT: { min: 60 },
    DB_POOL_MAX: { min: 1, max: 1000 },
    DB_POOL_MIN: { min: 0, max: 1000 }
  };

  /**
   * Variables a valider comme booleens 'true' | 'false' (strict).
   */
  static BOOLEAN_VARS = [
    'CORS_ALLOW_NO_ORIGIN',
    'JWT_BLACKLIST_FAIL_CLOSED',
    'JWT_VERIFY_STRICT',
    'USE_REDIS_MEMORY',
    'USE_REDIS_RATE_LIMIT',
    'WEBSOCKET_ENABLED',
    'ENABLE_SCHEDULED_TASKS',
    'ENABLE_AUDIT_LOGS',
    'EMAIL_QUEUE_ENABLED',
    'EMAIL_PAUSED',
    'ENABLE_NEWSLETTER',
    'SKIP_PRODUCTION_CHECKS'
  ];

  /**
   * Valide les variables d'environnement au demarrage.
   * @throws {Error} Si des variables requises sont manquantes ou invalides.
   */
  static validate() {
    const env = process.env.NODE_ENV || 'development';
    const isProd = env === 'production';
    const skipChecks = process.env.SKIP_PRODUCTION_CHECKS === 'true';
    const errors = [];
    const warnings = [];

    // ---- 1. Variables requises ----
    const requiredVars = [
      ...EnvironmentValidator.REQUIRED_VARS.all,
      ...(EnvironmentValidator.REQUIRED_VARS[env] || [])
    ];
    for (const varName of requiredVars) {
      if (!process.env[varName] || process.env[varName].trim() === '') {
        errors.push(`Variable d'environnement requise manquante: ${varName}`);
      }
    }

    // ---- 2. Defauts notifies ----
    for (const [varName, defaultValue] of Object.entries(EnvironmentValidator.OPTIONAL_VARS)) {
      if (!process.env[varName]) {
        warnings.push(`${varName} utilise la valeur par defaut: "${defaultValue}"`);
      }
    }

    // ---- 3. NODE_ENV ----
    if (process.env.NODE_ENV && !['development', 'test', 'production'].includes(process.env.NODE_ENV)) {
      errors.push(`NODE_ENV invalide: "${process.env.NODE_ENV}". Doit etre: development, test, ou production`);
    }

    // ---- 4. Variables numeriques ----
    for (const [varName, range] of Object.entries(EnvironmentValidator.NUMERIC_VARS)) {
      const raw = process.env[varName];
      if (!raw) continue; // optionnel => skip
      const n = Number(raw);
      if (!Number.isFinite(n) || Number.isNaN(n)) {
        errors.push(`${varName} doit etre un nombre, recu: "${raw}"`);
        continue;
      }
      if (range.min !== undefined && n < range.min) {
        errors.push(`${varName} doit etre >= ${range.min}, recu: ${n}`);
      }
      if (range.max !== undefined && n > range.max) {
        errors.push(`${varName} doit etre <= ${range.max}, recu: ${n}`);
      }
    }

    // ---- 5. Variables booleennes ----
    for (const varName of EnvironmentValidator.BOOLEAN_VARS) {
      const raw = process.env[varName];
      if (!raw) continue;
      if (!['true', 'false'].includes(raw)) {
        errors.push(`${varName} doit etre "true" ou "false", recu: "${raw}"`);
      }
    }

    // ---- 6. JWT_SECRET ----
    if (process.env.JWT_SECRET) {
      if (process.env.JWT_SECRET.length < 32) {
        if (isProd) {
          errors.push(`JWT_SECRET trop court (${process.env.JWT_SECRET.length} caracteres). Minimum 32 requis en production.`);
        } else {
          warnings.push(`JWT_SECRET est tres court (${process.env.JWT_SECRET.length} caracteres), recommande: 32+`);
        }
      }
      const secretLower = process.env.JWT_SECRET.toLowerCase();
      const isExampleValue = INSECURE_EXAMPLE_VALUES.some(ex => secretLower.includes(ex.toLowerCase()));
      if (isExampleValue && isProd) {
        errors.push(`JWT_SECRET contient une valeur d'exemple non securisee. Generer: node scripts/generateSecret.js`);
      }
    }

    // ---- 7. URLs HTTPS en prod ----
    for (const urlVar of ['FRONTEND_URL', 'API_URL', 'BASE_URL']) {
      const v = process.env[urlVar];
      if (!v) continue;
      if (isProd && !v.startsWith('https://')) {
        errors.push(`${urlVar} doit utiliser HTTPS en production. Actuel: ${v}`);
      }
      // Format minimal : commence par http(s)://
      if (!/^https?:\/\//i.test(v)) {
        errors.push(`${urlVar} doit etre une URL absolue (http:// ou https://). Actuel: ${v}`);
      }
    }

    // ---- 8. Email format ----
    if (process.env.EMAIL_FROM && !EMAIL_REGEX.test(process.env.EMAIL_FROM)) {
      errors.push(`EMAIL_FROM n'est pas un email valide: "${process.env.EMAIL_FROM}"`);
    }
    if (process.env.EMAIL_USER && isProd) {
      const isExampleEmail = INSECURE_EXAMPLE_VALUES.some(ex =>
        process.env.EMAIL_USER.toLowerCase().includes(ex.toLowerCase())
      );
      if (isExampleEmail) {
        errors.push(`EMAIL_USER contient une valeur d'exemple. Configurez un vrai service email.`);
      }
    }

    // ---- 9. Cloudinary valeurs exemple ----
    if (isProd && !skipChecks) {
      for (const cloudVar of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
        const v = process.env[cloudVar];
        if (!v) continue; // deja signale dans REQUIRED
        if (INSECURE_EXAMPLE_VALUES.some(ex => v.toLowerCase() === ex.toLowerCase())) {
          errors.push(`${cloudVar} contient une valeur d'exemple (.env.example). Configurez Cloudinary.`);
        }
      }
      // API secret doit avoir une longueur minimale plausible (cloudinary secrets ~28 chars)
      if (process.env.CLOUDINARY_API_SECRET && process.env.CLOUDINARY_API_SECRET.length < 20) {
        errors.push(`CLOUDINARY_API_SECRET semble trop court (${process.env.CLOUDINARY_API_SECRET.length} caracteres). Verifier le dashboard Cloudinary.`);
      }
    }

    // ---- 10. Redis password ----
    if (isProd && !skipChecks) {
      const rp = process.env.REDIS_PASSWORD;
      if (rp && rp.length < 16) {
        warnings.push(`REDIS_PASSWORD est court (${rp.length} caracteres), recommande: 24+`);
      }
      if (rp && INSECURE_EXAMPLE_VALUES.some(ex => rp.toLowerCase() === ex.toLowerCase())) {
        errors.push(`REDIS_PASSWORD contient une valeur d'exemple. Generer un password fort.`);
      }
    }

    // ---- 11. CORS en prod ----
    if (isProd && !skipChecks) {
      if (process.env.CORS_ALLOW_NO_ORIGIN === 'true') {
        warnings.push(`CORS_ALLOW_NO_ORIGIN=true en production : requetes sans Origin autorisees (curl, webhooks). Risque CSRF eleve, a n'utiliser que temporairement.`);
      }
      // Au moins une origine valide (FRONTEND_URL compte, CORS_ALLOWED_ORIGINS optionnel)
      const hasFrontend = !!process.env.FRONTEND_URL;
      const hasExtra = !!process.env.CORS_ALLOWED_ORIGINS;
      if (!hasFrontend && !hasExtra) {
        errors.push(`En production, FRONTEND_URL OU CORS_ALLOWED_ORIGINS doit etre defini sinon aucune requete cross-origin ne passera.`);
      }
    }

    // ---- 12. Production: DB user/password strength ----
    if (isProd && !skipChecks) {
      if (process.env.DB_USER === 'root') {
        errors.push(`DB_USER ne doit pas etre "root" en production. Creez un utilisateur dedie.`);
      }
      if (process.env.DB_PASSWORD && process.env.DB_PASSWORD.length < 12) {
        errors.push(`DB_PASSWORD trop court (${process.env.DB_PASSWORD.length} caracteres). Minimum 12 requis en production.`);
      }
    }

    // ---- 13. Sentry DSN (warn seulement, Sentry n'est pas critique) ----
    if (isProd && !process.env.SENTRY_DSN) {
      warnings.push(`SENTRY_DSN non configure : les erreurs de production ne seront pas tracees externement.`);
    }

    // ---- 14. Affichage / throw ----
    const logger = require('../utils/logger');

    if (errors.length > 0) {
      logger.error('ERREURS DE CONFIGURATION:');
      errors.forEach(e => logger.error(`  ${e}`));
      // On concatene le detail dans le message de l'Error pour que :
      // - les tests automatises puissent utiliser toThrow(/regex/)
      // - un operateur qui lit uniquement stdout (pas le logger) voie la cause
      throw new Error(
        `Configuration invalide (${errors.length} erreur(s)): ${errors.join(' | ')}`
      );
    }

    if (warnings.length > 0) {
      logger.warn('AVERTISSEMENTS DE CONFIGURATION:');
      warnings.forEach(w => logger.warn(`  ${w}`));
    }

    logger.info('Validation des variables d\'environnement reussie');
    return { errors, warnings };
  }

  /**
   * Obtient la valeur d'une variable d'environnement avec valeur par defaut.
   */
  static get(varName, defaultValue = undefined) {
    return process.env[varName] || defaultValue || EnvironmentValidator.OPTIONAL_VARS[varName];
  }

  /**
   * Affiche un rapport de configuration (non sensible).
   */
  static printReport() {
    const env = process.env.NODE_ENV || 'development';
    // On utilise console.log (intercepte par logger) car ce rapport est
    // essentiellement humain / boot-time et pas structure.
    console.log('\nRAPPORT DE CONFIGURATION');
    console.log(`  Environnement : ${env}`);
    console.log(`  Port          : ${process.env.PORT || 3001}`);
    console.log(`  DB            : ${process.env.DB_HOST || 'localhost'}/${process.env.DB_NAME}`);
    console.log(`  Frontend URL  : ${process.env.FRONTEND_URL || 'Non configure'}`);
    console.log(`  Redis         : ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}${process.env.REDIS_PASSWORD ? ' (auth)' : ' (no-auth)'}`);
    console.log(`  Cloudinary    : ${process.env.CLOUDINARY_CLOUD_NAME || 'Non configure'}`);
    console.log(`  Sentry        : ${process.env.SENTRY_DSN ? 'configure' : 'non configure'}`);
    console.log('');
  }
}

module.exports = EnvironmentValidator;
