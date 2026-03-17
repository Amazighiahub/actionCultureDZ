require('dotenv').config();

// Adapter les variables d'environnement
const EnvAdapter = require('./config/envAdapter');
const config = EnvAdapter.getConfig();

let Sentry = null;
try {
  Sentry = require('@sentry/node');
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      integrations: [
        Sentry.httpIntegration(),
        Sentry.expressIntegration()
      ]
    });
  } else if (process.env.NODE_ENV === 'production') {
    console.error('⚠️  SENTRY_DSN is not configured. Error tracking is disabled in production!');
  } else {
    Sentry = null;
  }
} catch (e) {
  if (process.env.NODE_ENV === 'production') {
    console.error('⚠️  @sentry/node not installed. Error tracking is disabled in production!');
  }
}

const express = require('express');
const crypto = require('crypto');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const { csrfTokenProvider, csrfVerifier } = require('./middlewares/csrfMiddleware');
const cookieParser = require('cookie-parser');

// Importation des middlewares
const corsMiddleware = require('./middlewares/corsMiddleware');
const rateLimitMiddleware = require('./middlewares/rateLimitMiddleware');
const errorMiddleware = require('./middlewares/errorMiddleware');
const createAuthMiddleware = require('./middlewares/authMiddleware');
const securityMiddleware = require('./middlewares/securityMiddleware');
const auditMiddleware = require('./middlewares/auditMiddleware');
const { httpsRedirect, hstsMiddleware } = require('./middlewares/httpsRedirect');

// ⚡ Middleware de langue (i18n)
const { languageMiddleware, setLanguageCookie } = require('./middlewares/language');
const { SUPPORTED_LANGUAGES } = require('./helpers/i18n');
const { i18nMiddleware } = require('./helpers/messages');

// Importation des routes
const initRoutes = require('./routes');

// Importation des services
const { initializeDatabase } = require('./models');
const { createDatabase } = require('./config/database');
const uploadService = require('./services/uploadService');
const FileValidator = require('./utils/fileValidator');

// ✅ Service Container pour l'architecture Service/Repository
const serviceContainer = require('./services/serviceContainer');

class App {
  constructor() {
    this.app = express();
    this.models = null;
    this.authMiddleware = null;
    this.sequelize = null;
    this.config = config;
    // Infos sur les uploads — single source of truth via env
    this.uploadInfo = {
      maxFileSize: {
        image: parseInt(process.env.UPLOAD_IMAGE_MAX_SIZE) || 10 * 1024 * 1024,       // default 10MB
        video: parseInt(process.env.UPLOAD_VIDEO_MAX_SIZE) || 100 * 1024 * 1024,      // default 100MB
        audio: parseInt(process.env.UPLOAD_AUDIO_MAX_SIZE) || 50 * 1024 * 1024,       // default 50MB
        document: parseInt(process.env.UPLOAD_DOCUMENT_MAX_SIZE) || 20 * 1024 * 1024  // default 20MB
      },
      allowedTypes: {
        image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
        video: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
        audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac'],
        document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      }
    };
  }

  // Vérifier les variables requises
  checkRequiredEnvVars() {
    if (!this.config.database.name || !this.config.database.username) {
      throw new Error('Configuration de base de données manquante');
    }
    
    if (!this.config.jwt.secret || this.config.jwt.secret === 'your-secret-key-change-in-production') {
      if (this.config.server.environment === 'production') {
        throw new Error('JWT_SECRET doit être configuré en production');
      } else {
        console.warn('⚠️ JWT_SECRET utilise la valeur par défaut (non sécurisé)');
      }
    }
  }

  // Initialisation des middlewares de base
  initializeMiddlewares() {
    // Trust proxy pour obtenir la vraie IP derrière un reverse proxy
    this.app.set('trust proxy', 1);

    // Redirection HTTPS et HSTS en production
    this.app.use(httpsRedirect);
    this.app.use(hstsMiddleware);

    // Correlation ID + request timing (must be early in the chain)
    const requestContext = require('./middlewares/requestContext');
    this.app.use(requestContext);

    // Sécurité avec Helmet — CSP with per-request nonce (no unsafe-inline for scripts)
    this.app.use((req, res, next) => {
      const nonce = crypto.randomBytes(16).toString('base64');
      req.cspNonce = nonce;
      res.locals.cspNonce = nonce;

      helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            scriptSrc: ["'self'", `'nonce-${nonce}'`],
            styleSrc: ["'self'"],
            fontSrc: ["'self'", "https:", "data:"],
            connectSrc: ["'self'", process.env.FRONTEND_URL || "http://localhost:3000", process.env.FRONTEND_URL ? `wss://${new URL(process.env.FRONTEND_URL).host}` : "ws://localhost:3001"],
            frameAncestors: ["'none'"],
          },
        },
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true
        }
      })(req, res, next);
    });

    // CORS
    this.app.use(corsMiddleware);
    
    this.app.use((req, res, next) => {
      if (req.path === '/.well-known/appspecific/com.chrome.devtools.json' ||
          req.path === '/favicon.ico') {
        return res.status(404).end();
      }
      next();
    });

    // Compression gzip — skip small responses (< 1KB), optimize for JSON API
    this.app.use(compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      level: 6,
      threshold: 1024 // Skip responses < 1KB (gzip overhead > gain)
    }));

    // Logging
    if (this.config.server.environment === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms'));
    }

    // Cookie Parser (nécessaire pour langue)
    this.app.use(cookieParser());

    // ⚡ Middleware de détection de langue (i18n)
    // Détecte automatiquement via: ?lang=ar, cookie, header X-Language, Accept-Language
    this.app.use(languageMiddleware);
    this.app.use(i18nMiddleware);

    // CSRF — Double Submit Cookie (set token on every response)
    this.app.use(csrfTokenProvider);

    // Headers de performance pour les réponses API
    this.app.use('/api', (req, res, next) => {
      // Vary pour CDN/proxies (langue + encoding)
      res.set('Vary', 'Accept-Encoding, Accept-Language');
      // Empêcher le cache sur les mutations
      if (req.method !== 'GET') {
        res.set('Cache-Control', 'no-store');
      }
      next();
    });

    // Augmenter les limites pour les uploads de médias
    this.app.use(express.json({ limit: '5mb' }));
    this.app.use((err, req, res, next) => {
      if (err.type === 'entity.parse.failed') {
        return res.status(400).json({
          success: false,
          error: 'Invalid JSON in request body'
        });
      }
      next(err);
    });
    this.app.use(express.urlencoded({ extended: true, limit: '5mb' }));

    // Sanitization des entrées
    this.app.use(securityMiddleware.sanitizeInput);

    // Configuration améliorée pour servir les fichiers statiques
    const staticOptions = {
      maxAge: this.config.server.environment === 'production' ? '7d' : 0,
      etag: true,
      lastModified: true,
      index: false,
      dotfiles: 'ignore',
      setHeaders: (res, path, stat) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        
        if (path.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          res.setHeader('Cache-Control', 'public, max-age=604800');
        } else if (path.match(/\.(mp4|webm|ogg)$/i)) {
          res.setHeader('Cache-Control', 'public, max-age=604800');
        } else if (path.match(/\.(pdf|doc|docx)$/i)) {
          res.setHeader('Cache-Control', 'public, max-age=86400');
        } else if (path.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      }
    };

    this.app.use('/uploads/private', (req, res) => {
      return res.status(404).end();
    });

    // Servir le dossier uploads
    this.app.use('/uploads', express.static(path.join(__dirname, this.config.upload.baseDir || 'uploads'), staticOptions));

    // Logger les accès aux fichiers en développement
    if (this.config.server.environment === 'development') {
      this.app.use('/uploads', (req, res, next) => {
        console.log(`📁 Accès fichier: ${req.path}`);
        next();
      });
    }

    this.app.use('/public', express.static(path.join(__dirname, 'public'), staticOptions));

    // NOTE: auditMiddleware.logUnauthorizedAccess is registered in initialize()
    // after the database is ready, so AuditLog is available when it runs.
    
    if (this.config.server.environment === 'development') {
      this.app.use((req, res, next) => {
        console.log(`${req.method} ${req.path} - ${req.ip}`);
        next();
      });
    }

    // Headers de sécurité supplémentaires
    // Security headers sont gérés par Helmet (lignes 94-111)
  }

  // Initialiser la structure des dossiers uploads
  async initializeUploadStructure() {
    const fs = require('fs').promises;
    const uploadBase = path.join(__dirname, this.config.upload.baseDir || 'uploads');
    
    const structure = [
      'images',
      'videos', 
      'audios',
      'documents',
      'private/images',
      'private/videos',
      'private/audios',
      'private/documents',
      'oeuvres/images',
      'oeuvres/videos',
      'oeuvres/audios',
      'oeuvres/documents',
      'profiles',
      'temp'
    ];
    
    try {
      for (const dir of structure) {
        const dirPath = path.join(uploadBase, dir);
        await fs.mkdir(dirPath, { recursive: true });
      }
      console.log('✅ Structure des dossiers uploads créée');
    } catch (error) {
      console.error('⚠️ Erreur création structure uploads:', error);
    }
  }

  // Initialisation de la base de données
  async initializeDatabase() {
    try {
      console.log('🔌 Connexion à la base de données...');
      
      // Étape 1 : Créer la base de données si nécessaire
      try {
        const { createDatabase } = require('./config/database');
        if (typeof createDatabase === 'function') {
          await createDatabase(process.env.NODE_ENV || 'development');
          console.log('✅ Base de données vérifiée/créée');
        }
      } catch (err) {
        console.log('ℹ️ Base de données probablement existante');
      }
      
      // Étape 2 : Charger les modèles
      const db = require('./models');
      
      if (!db || !db.sequelize) {
        throw new Error('Sequelize non chargé correctement dans models/index.js');
      }
      
      // Étape 3 : Tester la connexion
      await db.sequelize.authenticate();
      console.log('✅ Connexion à MySQL établie avec succès');
      
      // Étape 4 : Synchroniser si demandé
      if (process.env.DB_SYNC === 'true') {
        await db.sequelize.sync({ alter: false });
        console.log('✅ Modèles synchronisés');
      }
      
      // Étape 5 : Insérer les données par défaut si nécessaire
      if (process.env.DB_SEED === 'true' && db.insertDefaultData) {
        console.log('🌱 Insertion des données par défaut...');
        await db.insertDefaultData(db);
        console.log('✅ Données par défaut insérées');
      }
      
      // Stocker la référence
      this.db = db;
      this.models = db; 
      this.sequelize = db.sequelize;
      
      const createAuthMiddleware = require('./middlewares/authMiddleware');
      if (createAuthMiddleware && this.models.User) {
        this.authMiddleware = createAuthMiddleware(this.models);
        console.log('✅ Middleware d\'authentification initialisé');
      } else {
        this.authMiddleware = {
          authenticate: (req, res) => {
            console.error('🚨 Middleware auth non initialisé - accès refusé');
            return res.status(503).json({
              success: false,
              error: 'Service d\'authentification temporairement indisponible',
              code: 'AUTH_SERVICE_UNAVAILABLE'
            });
          },
          optionalAuth: (req, res, next) => next(),
          isAuthenticated: (req, res) => {
            console.error('🚨 Middleware auth non initialisé - accès refusé');
            return res.status(503).json({
              success: false,
              error: 'Service d\'authentification temporairement indisponible',
              code: 'AUTH_SERVICE_UNAVAILABLE'
            });
          },
          requireValidatedProfessional: (req, res) => {
            console.error('🚨 Middleware auth non initialisé - accès refusé');
            return res.status(503).json({
              success: false,
              error: 'Service d\'authentification temporairement indisponible',
              code: 'AUTH_SERVICE_UNAVAILABLE'
            });
          },
          requireOwnership: () => (req, res) => {
            console.error('🚨 Middleware auth non initialisé - accès refusé');
            return res.status(503).json({
              success: false,
              error: 'Service d\'authentification temporairement indisponible',
              code: 'AUTH_SERVICE_UNAVAILABLE'
            });
          },
          requireRole: () => (req, res) => {
            console.error('🚨 Middleware auth non initialisé - accès refusé');
            return res.status(503).json({
              success: false,
              error: 'Service d\'authentification temporairement indisponible',
              code: 'AUTH_SERVICE_UNAVAILABLE'
            });
          },
          requireAdmin: (req, res) => {
            console.error('🚨 Middleware auth non initialisé - accès refusé');
            return res.status(503).json({
              success: false,
              error: 'Service d\'authentification temporairement indisponible',
              code: 'AUTH_SERVICE_UNAVAILABLE'
            });
          },
          isAdmin: (req, res) => {
            console.error('🚨 Middleware auth non initialisé - accès refusé');
            return res.status(503).json({
              success: false,
              error: 'Service d\'authentification temporairement indisponible',
              code: 'AUTH_SERVICE_UNAVAILABLE'
            });
          }
        };
        console.error('🚨 Middleware d\'authentification indisponible - mode fail-closed activé');
      }
      
      // Afficher les modèles chargés
      const modelNames = Object.keys(db).filter(key => 
        key !== 'sequelize' && 
        key !== 'Sequelize' && 
        typeof db[key] === 'function'
      );
      
      console.log(`📊 ${modelNames.length} modèles disponibles`);
      console.log(`📋 Modèles: ${modelNames.slice(0, 10).join(', ')}${modelNames.length > 10 ? '...' : ''}`);

      // ✅ Initialiser le ServiceContainer avec les modèles
      serviceContainer.initialize(db);
      console.log('✅ ServiceContainer initialisé');

      return true;
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation de la base de données:', error.message);
      
      if (error.code === 'ECONNREFUSED') {
        console.log('\n⚠️ MySQL n\'est pas accessible. Vérifiez que MySQL est démarré.');
      } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        console.log('\n⚠️ Accès refusé. Vérifiez vos identifiants MySQL.');
      } else if (error.code === 'ER_BAD_DB_ERROR') {
        console.log('\n⚠️ Base de données introuvable. Créez-la manuellement :');
        console.log('mysql -u root -p');
        console.log('CREATE DATABASE actionculture;');
      }
      
      throw error;
    }
  }

  // Initialisation des rate limiters
  initializeRateLimiters() {
    // Rate limiting par endpoint (un seul limiter approprié par route)
    this.app.use('/api/users/login', rateLimitMiddleware.endpointLimiters.login);
    this.app.use('/api/users/register', rateLimitMiddleware.endpointLimiters.register);
    this.app.use('/api/email-verification/request-password-reset', rateLimitMiddleware.endpointLimiters.forgotPassword);
    this.app.use('/api/email-verification/reset-password', rateLimitMiddleware.endpointLimiters.forgotPassword);

    // Account lockout protection (brute force par compte email)
    this.app.use('/api/users/login', rateLimitMiddleware.accountRateLimiter.checkAccountLock);

    // Rate limiting pour les créations
    this.app.use('/api/oeuvres', ...rateLimitMiddleware.creation);
    this.app.use('/api/evenements', ...rateLimitMiddleware.creation);
    this.app.use('/api/artisanat', ...rateLimitMiddleware.creation);
    this.app.use('/api/patrimoine/sites', ...rateLimitMiddleware.creation);
    
    // Rate limiting pour les actions sensibles
    this.app.use('/api/dashboard/actions', ...rateLimitMiddleware.sensitiveActions);
    this.app.use('/api/users/change-password', ...rateLimitMiddleware.sensitiveActions);
    this.app.use('/api/professionnel/export', ...rateLimitMiddleware.sensitiveActions);
    
    // Rate limiting général
    this.app.use('/api/', ...rateLimitMiddleware.general);

    // Request timeout (30s for API, skips uploads)
    const createTimeoutMiddleware = require('./middlewares/timeoutMiddleware');
    this.app.use('/api/', createTimeoutMiddleware(30000));

    console.log('✅ Rate limiters et timeout initialisés');
  }

  // Initialisation des routes
  initializeRoutes() {
    if (!this.models) {
      throw new Error('Les modèles doivent être initialisés avant les routes');
    }
    if (!this.authMiddleware) {
      throw new Error('Le middleware d\'authentification doit être initialisé avant les routes');
    }

    // 🗺️ Sitemap.xml dynamique (SEO)
    const initSitemapRoutes = require('./routes/sitemapRoutes');
    this.app.use('/sitemap.xml', initSitemapRoutes(this.models));

    // ⚡ Route pour obtenir les langues supportées (i18n)
    this.app.get('/api/languages', (req, res) => {
      res.json({
        success: true,
        languages: [
          { code: 'fr', label: 'Français', dir: 'ltr' },
          { code: 'ar', label: 'العربية', dir: 'rtl' },
          { code: 'en', label: 'English', dir: 'ltr' },
          { code: 'tz-ltn', label: 'Tamaziɣt', dir: 'ltr' },
          { code: 'tz-tfng', label: 'ⵜⴰⵎⴰⵣⵉⵖⵜ', dir: 'ltr' }
        ],
        current: req.lang,
        dir: req.dir,
        supported: SUPPORTED_LANGUAGES
      });
    });

    // ⚡ Route pour changer la langue (stockée en cookie)
    this.app.post('/api/set-language', setLanguageCookie, (req, res) => {
      res.json({ 
        success: true, 
        lang: req.lang,
        dir: req.dir,
        message: `Langue changée en ${req.lang}`
      });
    });

    // Route de santé — vérifie DB + Redis
    this.app.get('/health', async (req, res) => {
      const checks = { db: false, redis: false };
      const start = Date.now();

      // Check database
      try {
        if (this.sequelize) {
          await this.sequelize.authenticate();
          checks.db = true;
        }
      } catch (e) {
        checks.db = false;
      }

      // Check Redis
      try {
        const redis = this._getRedisClient();
        if (redis) {
          await redis.ping();
          checks.redis = true;
        } else {
          checks.redis = 'not_configured';
        }
      } catch (e) {
        checks.redis = false;
      }

      const allHealthy = checks.db === true && checks.redis !== false;
      const isProduction = process.env.NODE_ENV === 'production';

      res.status(allHealthy ? 200 : 503).json({
        status: allHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        ...(isProduction ? {} : {
          version: '1.0.0',
          responseTimeMs: Date.now() - start,
          checks,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          environment: this.config.server.environment,
          lang: req.lang,
        })
      });
    });

    // Route racine
    this.app.get('/', (req, res) => {
      const isProduction = process.env.NODE_ENV === 'production';
      res.json({
        message: 'API Action Culture',
        status: 'running',
        lang: req.lang,
        dir: req.dir,
        ...(isProduction ? {} : {
          version: '1.0.0',
          documentation: '/api',
          health: '/health',
          languages: '/api/languages',
          environment: this.config.server.environment,
          uploads: {
            public: 'POST /api/upload/image/public',
            private: 'POST /api/upload/image',
            config: {
              max_size: {
                image: `${Math.round(this.config.upload.maxSizes.image / 1048576)}MB`,
                document: `${Math.round(this.config.upload.maxSizes.document / 1048576)}MB`,
                video: `${Math.round(this.config.upload.maxSizes.video / 1048576)}MB`
              }
            }
          }
        })
      });
    });

    // CSRF — verify token on mutating API requests (POST, PUT, PATCH, DELETE)
    this.app.use('/api', csrfVerifier);

    // Routes API principales (utilise ServiceContainer en interne)
    this.app.use('/api', initRoutes(this.models, this.authMiddleware));

    // Route pour obtenir les infos d'upload
    this.app.get('/api/upload/info', (req, res) => {
      res.json({
        success: true,
        data: {
          limits: {
            image: `${this.uploadInfo.maxFileSize.image / 1024 / 1024}MB`,
            video: `${this.uploadInfo.maxFileSize.video / 1024 / 1024}MB`,
            audio: `${this.uploadInfo.maxFileSize.audio / 1024 / 1024}MB`,
            document: `${this.uploadInfo.maxFileSize.document / 1024 / 1024}MB`
          },
          supportedFormats: {
            image: ['JPEG', 'JPG', 'PNG', 'GIF', 'WebP'],
            video: ['MP4', 'MPEG', 'MOV', 'AVI'],
            audio: ['MP3', 'WAV', 'OGG'],
            document: ['PDF', 'DOC', 'DOCX']
          },
          uploadEndpoints: {
            public: '/api/upload/image/public',
            image: '/api/upload/image',
            video: '/api/upload/video',
            audio: '/api/upload/audio',
            document: '/api/upload/document',
            oeuvreMedia: '/api/upload/oeuvre/media'
          }
        }
      });
    });

    // Route pour upload PUBLIC (rate limited: 5 uploads/heure par IP)
    this.app.post('/api/upload/image/public',
      ...rateLimitMiddleware.creation,
      auditMiddleware.logAction('upload_image_public', { entityType: 'media' }),
      uploadService.uploadImage().single('image'),
      FileValidator.uploadValidator(this.uploadInfo.allowedTypes.image, this.uploadInfo.maxFileSize.image),
      this.handlePublicUpload.bind(this)
    );

    // Route pour upload avec authentification
    this.app.post('/api/upload/image', 
      this.authMiddleware.authenticate,
      auditMiddleware.logAction('upload_image', { entityType: 'media' }),
      uploadService.uploadImage().single('image'),
      FileValidator.uploadValidator(this.uploadInfo.allowedTypes.image, this.uploadInfo.maxFileSize.image),
      this.handleAuthenticatedUpload.bind(this)
    );

    // Route pour upload de documents
    this.app.post('/api/upload/document',
      this.authMiddleware.authenticate,
      auditMiddleware.logAction('upload_document', { entityType: 'document' }),
      uploadService.uploadDocument().single('document'),
      FileValidator.uploadValidator(this.uploadInfo.allowedTypes.document, this.uploadInfo.maxFileSize.document),
      this.handleDocumentUpload.bind(this)
    );

    // Routes pour upload de médias d'œuvres
    this.app.post('/api/upload/oeuvre/media',
      this.authMiddleware.authenticate,
      this.authMiddleware.requireValidatedProfessional,
      auditMiddleware.logAction('upload_oeuvre_media', { entityType: 'media' }),
      uploadService.uploadMedia().array('medias', 10),
      async (req, res, next) => {
        try {
          if (!req.files || req.files.length === 0) return next();
          const allowedTypes = [
            ...this.uploadInfo.allowedTypes.image,
            ...this.uploadInfo.allowedTypes.video,
            ...this.uploadInfo.allowedTypes.audio,
            ...this.uploadInfo.allowedTypes.document
          ];
          const results = await FileValidator.validateFilesBatch(
            req.files.map(f => f.path),
            allowedTypes
          );
          const invalidFiles = results.filter(r => !r.valid);
          if (invalidFiles.length > 0) {
            const fs = require('fs');
            req.files.forEach(f => {
              try { fs.unlinkSync(f.path); } catch (e) { /* ignore */ }
            });
            return res.status(400).json({
              success: false,
              error: req.t('upload.invalidFileType'),
              details: invalidFiles
            });
          }
          next();
        } catch (error) {
          next(error);
        }
      },
      this.handleOeuvreMediaUpload.bind(this)
    );

    // Upload de vidéo
    this.app.post('/api/upload/video',
      this.authMiddleware.authenticate,
      auditMiddleware.logAction('upload_video', { entityType: 'video' }),
      uploadService.uploadVideo().single('video'),
      FileValidator.uploadValidator(this.uploadInfo.allowedTypes.video, this.uploadInfo.maxFileSize.video),
      this.handleVideoUpload.bind(this)
    );

    // Upload d'audio
    this.app.post('/api/upload/audio',
      this.authMiddleware.authenticate,
      auditMiddleware.logAction('upload_audio', { entityType: 'audio' }),
      uploadService.uploadAudio().single('audio'),
      FileValidator.uploadValidator(this.uploadInfo.allowedTypes.audio, this.uploadInfo.maxFileSize.audio),
      this.handleAudioUpload.bind(this)
    );

    // Route de recherche globale
    this.app.get('/api/search', 
      this.authMiddleware.isAuthenticated,
      this.handleGlobalSearch.bind(this)
    );

    // Route pour suggestions de recherche
    this.app.get('/api/search/suggestions', 
      this.authMiddleware.isAuthenticated,
      this.handleSearchSuggestions.bind(this)
    );

    // Route pour les métriques si activées
    if (this.config.features.metrics) {
      this.app.get('/metrics', 
        this.authMiddleware.authenticate, 
        this.authMiddleware.isAdmin, 
        (req, res) => {
          const metrics = {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            timestamp: Date.now(),
            pid: process.pid,
            nodeVersion: process.version
          };
          res.json(metrics);
        }
      );
    }

    console.log('✅ Routes initialisées');
    console.log(`  📍 Port configuré: ${this.config.server.port}`);
    console.log(`  📍 URL de base: ${this.config.server.baseUrl}`);
    console.log(`  🌍 Routes i18n: /api/languages, /api/set-language`);
  }

  // Handlers pour les routes upload
  handlePublicUpload(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: req.t('upload.noImage')
        });
      }

      const fileUrl = `${this.config.server.baseUrl}/${req.file.path.replace(/\\/g, '/')}`;
      
      console.log(`📸 Upload public réussi: ${req.file.filename}`);
      
      res.json({
        success: true,
        message: req.t('upload.imageSuccess'),
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          url: fileUrl,
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      });
    } catch (error) {
      console.error('❌ Erreur lors de l\'upload public:', error);
      res.status(500).json({
        success: false,
        error: req.t('upload.imageError')
      });
    }
  }

  handleAuthenticatedUpload(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: req.t('upload.noFile')
        });
      }

      const fileUrl = `${this.config.server.baseUrl}/${req.file.path.replace(/\\/g, '/')}`;
      
      console.log(`📸 Upload par ${req.user.id_user}: ${req.file.filename}`);
      
      res.json({
        success: true,
        message: req.t('upload.imageSuccess'),
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          url: fileUrl,
          size: req.file.size,
          mimetype: req.file.mimetype,
          uploadedBy: req.user.id_user
        }
      });
    } catch (error) {
      console.error('❌ Erreur lors de l\'upload:', error);
      res.status(500).json({
        success: false,
        error: req.t('upload.imageError')
      });
    }
  }

  handleDocumentUpload(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: req.t('upload.noDocument')
        });
      }

      const fileUrl = `${this.config.server.baseUrl}/${req.file.path.replace(/\\/g, '/')}`;
      
      console.log(`📄 Document uploadé par ${req.user.id_user}: ${req.file.filename}`);
      
      res.json({
        success: true,
        message: req.t('upload.documentSuccess'),
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          url: fileUrl,
          size: req.file.size,
          mimetype: req.file.mimetype,
          uploadedBy: req.user.id_user
        }
      });
    } catch (error) {
      console.error('❌ Erreur lors de l\'upload du document:', error);
      res.status(500).json({
        success: false,
        error: req.t('upload.documentError')
      });
    }
  }

  handleOeuvreMediaUpload(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: req.t('upload.noFile')
        });
      }

      const uploadedFiles = req.files.map(file => {
        const fileUrl = `${this.config.server.baseUrl}/${file.path.replace(/\\/g, '/')}`;
        
        return {
          filename: file.filename,
          originalName: file.originalname,
          url: fileUrl,
          size: file.size,
          mimetype: file.mimetype,
          type: this.getFileType(file.mimetype)
        };
      });
      
      console.log(`📸 ${req.files.length} médias uploadés pour œuvre par user:${req.user.id_user}`);
      
      res.json({
        success: true,
        message: req.t('upload.mediaSuccess', { count: req.files.length }),
        data: uploadedFiles
      });
    } catch (error) {
      console.error('❌ Erreur upload médias œuvre:', error);
      res.status(500).json({
        success: false,
        error: req.t('upload.mediaError')
      });
    }
  }

  handleVideoUpload(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: req.t('upload.noVideo')
        });
      }

      const fileUrl = `${this.config.server.baseUrl}/${req.file.path.replace(/\\/g, '/')}`;
      
      console.log(`🎥 Vidéo uploadée par ${req.user.id_user}: ${req.file.filename}`);
      
      res.json({
        success: true,
        message: req.t('upload.videoSuccess'),
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          url: fileUrl,
          size: req.file.size,
          mimetype: req.file.mimetype,
          duration: null
        }
      });
    } catch (error) {
      console.error('❌ Erreur upload vidéo:', error);
      res.status(500).json({
        success: false,
        error: req.t('upload.videoError')
      });
    }
  }

  handleAudioUpload(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: req.t('upload.noAudio')
        });
      }

      const fileUrl = `${this.config.server.baseUrl}/${req.file.path.replace(/\\/g, '/')}`;
      
      console.log(`🎵 Audio uploadé par ${req.user.id_user}: ${req.file.filename}`);
      
      res.json({
        success: true,
        message: req.t('upload.audioSuccess'),
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          url: fileUrl,
          size: req.file.size,
          mimetype: req.file.mimetype,
          duration: null
        }
      });
    } catch (error) {
      console.error('❌ Erreur upload audio:', error);
      res.status(500).json({
        success: false,
        error: req.t('upload.audioError')
      });
    }
  }

  async handleGlobalSearch(req, res) {
    try {
      const { q, types, limit, page } = req.query;
      
      if (!q || q.trim().length < this.config.limits.minSearchLength) {
        return res.status(400).json({
          success: false,
          error: req.t('search.minLength', { min: this.config.limits.minSearchLength })
        });
      }

      const SearchService = require('./services/searchService');
      const searchService = new SearchService(this.models);
      
      const results = await searchService.globalSearch(q.trim(), {
        types: types ? types.split(',') : undefined,
        limit: limit ? parseInt(limit) : this.config.limits.defaultPageSize,
        page: page ? parseInt(page) : 1,
        userId: req.user?.id_user,
        lang: req.lang  // ⚡ Passer la langue au service de recherche
      });

      res.json(results);
    } catch (error) {
      console.error('Erreur lors de la recherche globale:', error);
      res.status(500).json({
        success: false,
        error: req.t('search.error')
      });
    }
  }

  async handleSearchSuggestions(req, res) {
    try {
      const { q, limit } = req.query;
      
      if (!q || q.trim().length < 1) {
        return res.json({ 
          success: true, 
          suggestions: [] 
        });
      }

      const SearchService = require('./services/searchService');
      const searchService = new SearchService(this.models);
      
      const results = await searchService.getSuggestions(
        q.trim(), 
        limit ? parseInt(limit) : 5,
        req.lang  // ⚡ Passer la langue
      );

      res.json(results);
    } catch (error) {
      console.error('Erreur lors de la génération de suggestions:', error);
      res.status(500).json({
        success: false,
        error: req.t('search.suggestionsError')
      });
    }
  }

  // Helper pour obtenir le client Redis
  _getRedisClient() {
    try {
      const redis = require('redis');
      const client = redis.createClient({
        url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
        password: process.env.REDIS_PASSWORD || undefined
      });
      return client.isOpen ? client : null;
    } catch (e) {
      return null;
    }
  }

  // Méthode helper pour déterminer le type de fichier
  getFileType(mimetype) {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    if (mimetype === 'application/pdf') return 'pdf';
    return 'document';
  }

  // Initialisation de la gestion d'erreurs
  initializeErrorHandling() {
    // Gestionnaire pour les promesses rejetées
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      if (Sentry) Sentry.captureException(reason);
    });

    // Gestionnaire pour les exceptions non capturées
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      if (Sentry) Sentry.captureException(error);
      this.gracefulShutdown(1);
    });

    // Sentry error handler (must be before other error handlers)
    if (Sentry) this.app.use(Sentry.expressErrorHandler());

    // Middleware 404
    this.app.use(errorMiddleware.notFound);

    // Gestionnaire d'erreurs global
    this.app.use(errorMiddleware.errorHandler);

    console.log('✅ Gestion d\'erreurs initialisée');
  }

  // Fermeture gracieuse
  async gracefulShutdown(code = 0) {
    console.log('🛑 Arrêt gracieux de l\'application...');
    
    try {
      if (this.sequelize) {
        await this.sequelize.close();
        console.log('✅ Connexion à la base de données fermée');
      }

      console.log('👋 Application arrêtée proprement');
      process.exit(code);
    } catch (error) {
      console.error('❌ Erreur lors de l\'arrêt:', error);
      process.exit(1);
    }
  }

  // Tâches planifiées
  async startScheduledTasks() {
    if (!this.config.features.scheduledTasks) {
      console.log('⏰ Tâches planifiées désactivées');
      return;
    }

    try {
      let cron;
      try {
        cron = require('node-cron');
      } catch (error) {
        console.log('⚠️ node-cron non installé, tâches planifiées désactivées');
        return;
      }
      
      // Nettoyer les anciens logs si les audits sont activés
      if (this.config.features.auditLogs) {
        cron.schedule('0 3 * * *', async () => {
          console.log('🧹 Nettoyage des anciens logs d\'audit...');
          try {
            await auditMiddleware.cleanOldLogs(this.config.maintenance.auditLogRetentionDays);
          } catch (error) {
            console.error('❌ Erreur lors du nettoyage des logs:', error);
          }
        });
      }

      // Nettoyer les fichiers temporaires (toutes les 6 heures)
      cron.schedule('0 */6 * * *', async () => {
        console.log('🧹 Nettoyage des fichiers temporaires...');
        try {
          const { cleanAllTemporaryFiles } = require('./scripts/cleanTempFiles');
          await cleanAllTemporaryFiles();
        } catch (error) {
          console.error('❌ Erreur lors du nettoyage des fichiers temporaires:', error);
        }
      });

      console.log('⏰ Tâches planifiées démarrées');
    } catch (error) {
      console.error('❌ Erreur lors du démarrage des tâches planifiées:', error);
    }
  }

  // Initialisation complète
  async initialize() {
    try {
      console.log('🚀 Initialisation de l\'application Action Culture...');
      console.log('📋 Environnement:', this.config.server.environment);
      console.log('🔧 Port:', this.config.server.port);
      
      // Vérifier les variables critiques
      this.checkRequiredEnvVars();
      
      // Initialiser dans l'ordre
      this.initializeMiddlewares();
      await this.initializeDatabase();

      // Re-initialize audit middleware now that models are loaded
      auditMiddleware.initialize(this.models);

      // Register logUnauthorizedAccess here (after DB init) so AuditLog is available
      this.app.use(auditMiddleware.logUnauthorizedAccess);
      
      // Initialiser la structure des uploads
      await this.initializeUploadStructure();
      
      this.initializeRateLimiters();
      this.initializeRoutes();
      this.initializeErrorHandling();
      
      // Démarrer les tâches planifiées
      await this.startScheduledTasks();
      
      console.log('🎉 Application initialisée avec succès !');
      console.log('🌍 Support multilingue: FR, AR, EN, TZ-LTN, TZ-TFNG');
      return this.app;
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation de l\'application:', error);
      throw error;
    }
  }

  // Méthodes utilitaires
  getApp() {
    return this.app;
  }

  getModels() {
    return this.models;
  }

  getSequelize() {
    return this.sequelize;
  }

  getAuthMiddleware() {
    return this.authMiddleware;
  }

  getConfig() {
    return this.config;
  }

  async closeDatabase() {
    if (this.sequelize) {
      await this.sequelize.close();
      console.log('🔌 Connexion à la base de données fermée');
    }
  }
}

// Gérer les signaux si exécuté directement
if (require.main === module) {
  const app = new App();
  
  ['SIGINT', 'SIGTERM'].forEach(signal => {
    process.on(signal, () => {
      console.log(`\n${signal} reçu`);
      app.gracefulShutdown(0);
    });
  });
}

module.exports = App;

// FOR TEST PURPOSES
module.exports.appInstance = new App().app;