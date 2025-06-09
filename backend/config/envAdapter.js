// config/envAdapter.js
// Ce fichier adapte les noms de variables de votre .env aux noms attendus par l'application

/**
 * Adaptateur de configuration pour gérer les différents noms de variables d'environnement
 */
class EnvAdapter {
  static adapt() {
    // Adapter les noms de variables pour les uploads
    if (process.env.UPLOAD_IMAGE_MAX_SIZE && !process.env.MAX_FILE_SIZE_IMAGE) {
      process.env.MAX_FILE_SIZE_IMAGE = process.env.UPLOAD_IMAGE_MAX_SIZE;
    }
    
    if (process.env.UPLOAD_DOCUMENT_MAX_SIZE && !process.env.MAX_FILE_SIZE_DOCUMENT) {
      process.env.MAX_FILE_SIZE_DOCUMENT = process.env.UPLOAD_DOCUMENT_MAX_SIZE;
    }
    
    if (process.env.UPLOAD_VIDEO_MAX_SIZE && !process.env.MAX_FILE_SIZE_VIDEO) {
      process.env.MAX_FILE_SIZE_VIDEO = process.env.UPLOAD_VIDEO_MAX_SIZE;
    }

    // Adapter les types de fichiers autorisés
    if (process.env.UPLOAD_ALLOWED_IMAGE_TYPES && !process.env.ALLOWED_IMAGE_TYPES) {
      process.env.ALLOWED_IMAGE_TYPES = process.env.UPLOAD_ALLOWED_IMAGE_TYPES;
    }
    
    if (process.env.UPLOAD_ALLOWED_DOCUMENT_TYPES && !process.env.ALLOWED_DOCUMENT_TYPES) {
      process.env.ALLOWED_DOCUMENT_TYPES = process.env.UPLOAD_ALLOWED_DOCUMENT_TYPES;
    }
    
    if (process.env.UPLOAD_ALLOWED_VIDEO_TYPES && !process.env.ALLOWED_VIDEO_TYPES) {
      process.env.ALLOWED_VIDEO_TYPES = process.env.UPLOAD_ALLOWED_VIDEO_TYPES;
    }

    // Adapter la configuration email
    if (process.env.EMAIL_HOST && !process.env.SMTP_HOST) {
      process.env.SMTP_HOST = process.env.EMAIL_HOST;
    }
    
    if (process.env.EMAIL_PORT && !process.env.SMTP_PORT) {
      process.env.SMTP_PORT = process.env.EMAIL_PORT;
    }
    
    if (process.env.EMAIL_USER && !process.env.SMTP_USER) {
      process.env.SMTP_USER = process.env.EMAIL_USER;
    }
    
    if (process.env.EMAIL_PASSWORD && !process.env.SMTP_PASS) {
      process.env.SMTP_PASS = process.env.EMAIL_PASSWORD;
    }

    // Définir BASE_URL si non définie
    if (!process.env.BASE_URL && process.env.API_URL) {
      process.env.BASE_URL = process.env.API_URL;
    } else if (!process.env.BASE_URL) {
      process.env.BASE_URL = `http://localhost:${process.env.PORT || 3000}`;
    }

    // Adapter les limites de rate
    if (process.env.RATE_LIMIT_WINDOW && !process.env.RATE_LIMIT_WINDOW_MS) {
      process.env.RATE_LIMIT_WINDOW_MS = process.env.RATE_LIMIT_WINDOW;
    }
    
    if (process.env.RATE_LIMIT_MAX && !process.env.RATE_LIMIT_MAX_REQUESTS) {
      process.env.RATE_LIMIT_MAX_REQUESTS = process.env.RATE_LIMIT_MAX;
    }

    // Définir des valeurs par défaut pour les variables manquantes
    this.setDefaults();
  }

  static setDefaults() {
    // Valeurs par défaut pour la base de données
    process.env.DB_POOL_MAX = process.env.DB_POOL_MAX || '10';
    process.env.DB_POOL_MIN = process.env.DB_POOL_MIN || '0';
    process.env.DB_POOL_ACQUIRE = process.env.DB_POOL_ACQUIRE || '30000';
    process.env.DB_POOL_IDLE = process.env.DB_POOL_IDLE || '10000';

    // JWT
    process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

    // Fonctionnalités
    process.env.ENABLE_SCHEDULED_TASKS = process.env.ENABLE_SCHEDULED_TASKS || 'true';
    process.env.ENABLE_AUDIT_LOGS = process.env.ENABLE_AUDIT_LOGS || 'true';
    process.env.ENABLE_METRICS = process.env.ENABLE_METRICS || 'false';

    // Localisation
    process.env.DEFAULT_LANGUAGE = process.env.DEFAULT_LANGUAGE || 'fr';
    process.env.SUPPORTED_LANGUAGES = process.env.SUPPORTED_LANGUAGES || 'fr,ar,en';
    process.env.DEFAULT_TIMEZONE = process.env.DEFAULT_TIMEZONE || 'Africa/Algiers';

    // Pagination
    process.env.DEFAULT_PAGE_SIZE = process.env.DEFAULT_PAGE_SIZE || '10';
    process.env.MAX_PAGE_SIZE = process.env.MAX_PAGE_SIZE || '100';

    // Recherche
    process.env.MIN_SEARCH_LENGTH = process.env.MIN_SEARCH_LENGTH || '2';
    process.env.MAX_SEARCH_RESULTS = process.env.MAX_SEARCH_RESULTS || '50';

    // Nettoyage
    process.env.AUDIT_LOG_RETENTION_DAYS = process.env.AUDIT_LOG_RETENTION_DAYS || '90';
    process.env.TEMP_FILES_RETENTION_HOURS = process.env.TEMP_FILES_RETENTION_HOURS || '24';
  }

  static getConfig() {
    this.adapt();
    
    return {
      // Serveur
      server: {
        port: parseInt(process.env.PORT) || 3000,
        host: process.env.HOST || '0.0.0.0',
        baseUrl: process.env.BASE_URL,
        environment: process.env.NODE_ENV || 'development'
      },
      
      // Base de données
      database: {
        name: process.env.DB_NAME,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 3306,
        dialect: process.env.DB_DIALECT || 'mysql',
        pool: {
          max: parseInt(process.env.DB_POOL_MAX),
          min: parseInt(process.env.DB_POOL_MIN),
          acquire: parseInt(process.env.DB_POOL_ACQUIRE),
          idle: parseInt(process.env.DB_POOL_IDLE)
        },
        sync: process.env.DB_SYNC === 'true'
      },
      
      // JWT
      jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN
      },
      
      // Upload
      upload: {
        baseDir: process.env.UPLOAD_DIR || 'uploads',
        dirs: {
          images: process.env.UPLOAD_IMAGES_DIR,
          documents: process.env.UPLOAD_DOCUMENTS_DIR,
          videos: process.env.UPLOAD_VIDEOS_DIR,
          temp: process.env.UPLOAD_TEMP_DIR
        },
        maxSizes: {
          image: parseInt(process.env.MAX_FILE_SIZE_IMAGE || process.env.UPLOAD_IMAGE_MAX_SIZE),
          document: parseInt(process.env.MAX_FILE_SIZE_DOCUMENT || process.env.UPLOAD_DOCUMENT_MAX_SIZE),
          video: parseInt(process.env.MAX_FILE_SIZE_VIDEO || process.env.UPLOAD_VIDEO_MAX_SIZE)
        },
        allowedTypes: {
          image: (process.env.ALLOWED_IMAGE_TYPES || process.env.UPLOAD_ALLOWED_IMAGE_TYPES || '').split(','),
          document: (process.env.ALLOWED_DOCUMENT_TYPES || process.env.UPLOAD_ALLOWED_DOCUMENT_TYPES || '').split(','),
          video: (process.env.ALLOWED_VIDEO_TYPES || process.env.UPLOAD_ALLOWED_VIDEO_TYPES || '').split(',')
        }
      },
      
      // Email
      email: {
        host: process.env.SMTP_HOST || process.env.EMAIL_HOST,
        port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        password: process.env.SMTP_PASS || process.env.EMAIL_PASSWORD,
        from: process.env.EMAIL_FROM
      },
      
      // Sécurité
      security: {
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
        sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 86400,
        rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || process.env.RATE_LIMIT_WINDOW),
        rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || process.env.RATE_LIMIT_MAX)
      },
      
      // Fonctionnalités
      features: {
        scheduledTasks: process.env.ENABLE_SCHEDULED_TASKS !== 'false',
        auditLogs: process.env.ENABLE_AUDIT_LOGS !== 'false',
        metrics: process.env.ENABLE_METRICS === 'true'
      },
      
      // Localisation
      localization: {
        defaultLanguage: process.env.DEFAULT_LANGUAGE,
        supportedLanguages: process.env.SUPPORTED_LANGUAGES.split(','),
        timezone: process.env.DEFAULT_TIMEZONE
      },
      
      // Limites
      limits: {
        defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE),
        maxPageSize: parseInt(process.env.MAX_PAGE_SIZE),
        minSearchLength: parseInt(process.env.MIN_SEARCH_LENGTH),
        maxSearchResults: parseInt(process.env.MAX_SEARCH_RESULTS)
      },
      
      // Maintenance
      maintenance: {
        auditLogRetentionDays: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS),
        tempFilesRetentionHours: parseInt(process.env.TEMP_FILES_RETENTION_HOURS)
      }
    };
  }
}

module.exports = EnvAdapter;