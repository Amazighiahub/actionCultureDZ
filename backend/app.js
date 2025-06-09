require('dotenv').config();

// Adapter les variables d'environnement
const EnvAdapter = require('./config/envAdapter');
const config = EnvAdapter.getConfig();

const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');

// Importation des middlewares
const corsMiddleware = require('./middlewares/corsMiddleware');
const rateLimitMiddleware = require('./middlewares/rateLimitMiddleware');
const errorMiddleware = require('./middlewares/errorMiddleware');
const createAuthMiddleware = require('./middlewares/authMiddleware');
const securityMiddleware = require('./middlewares/securityMiddleware');
const auditMiddleware = require('./middlewares/auditMiddleware');

// Importation des routes
const initRoutes = require('./routes');

// Importation des services
const { initializeDatabase } = require('./models');
const { createDatabase } = require('./config/database');
const uploadService = require('./services/uploadService');

class App {
  constructor() {
    this.app = express();
    this.models = null;
    this.authMiddleware = null;
    this.sequelize = null;
    this.config = config; // Stocker la configuration adaptée
  }

  // Initialisation des middlewares de base
  initializeMiddlewares() {
    // Trust proxy pour obtenir la vraie IP derrière un reverse proxy
    this.app.set('trust proxy', 1);

    // Sécurité avec Helmet
    this.app.use(helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          fontSrc: ["'self'", "https:", "data:"],
          connectSrc: ["'self'", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS
    this.app.use(corsMiddleware);
 this.app.use((req, res, next) => {
    if (req.path === '/.well-known/appspecific/com.chrome.devtools.json' ||
        req.path === '/favicon.ico' ||
        req.path === '/robots.txt') {
      return res.status(404).end();
    }
    next();
  });
    // Compression
    this.app.use(compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      level: 6
    }));

    // Logging
    if (this.config.server.environment === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms'));
    }

    // Parsing des données
    this.app.use(express.json({ 
      limit: '10mb',
      verify: (req, res, buf, encoding) => {
        req.rawBody = buf.toString(encoding || 'utf8');
      }
    }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Sanitization des entrées
    this.app.use(securityMiddleware.sanitizeInput);

    // Servir les fichiers statiques
    const staticOptions = {
      maxAge: this.config.server.environment === 'production' ? '1d' : 0,
      etag: true,
      lastModified: true,
      setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      }
    };

    // Utiliser les dossiers configurés
    this.app.use('/uploads', express.static(path.join(__dirname, this.config.upload.baseDir), staticOptions));
    this.app.use('/public', express.static(path.join(__dirname, 'public'), staticOptions));

    // Log des accès non autorisés
    this.app.use(auditMiddleware.logUnauthorizedAccess);

    // Headers de sécurité supplémentaires
    this.app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
      next();
    });

    console.log('✅ Middlewares de base initialisés');
  }

  // Initialisation de la base de données
  // Dans app.js, méthode initializeDatabase
async initializeDatabase() {
  try {
    const dbConfig = {
      database: this.config.database.name,
      username: this.config.database.username,
      password: this.config.database.password,
      host: this.config.database.host,
      port: this.config.database.port,
      dialect: this.config.database.dialect,
      logging: this.config.server.environment === 'development' ? console.log : false,
      pool: this.config.database.pool
    };

    // Créer la base de données si elle n'existe pas
    await createDatabase(dbConfig);

    // Initialiser la connexion et les modèles
    const { sequelize, models } = await initializeDatabase(dbConfig);
    
    // IMPORTANT: Ajouter sequelize aux modèles AVANT de les stocker
    models.sequelize = sequelize;
    models.Sequelize = require('sequelize');
    
    this.models = models;
    this.sequelize = sequelize;

    // Initialiser le middleware d'authentification avec les modèles
    this.authMiddleware = createAuthMiddleware(models);

    // Vérifier la connexion
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données établie avec succès');
    console.log('✅ sequelize ajouté aux modèles');

    // Synchroniser les modèles si configuré
    if (this.config.server.environment === 'development' && this.config.database.sync) {
      await sequelize.sync({ alter: true });
      console.log('✅ Modèles synchronisés avec la base de données');
    }

    return { sequelize, models };
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de la base de données:', error);
    throw error;
  }
}

  // Initialisation des rate limiters
  initializeRateLimiters() {
    // Rate limiting pour l'authentification
    this.app.use('/api/users/login', rateLimitMiddleware.auth);
    this.app.use('/api/users/register', rateLimitMiddleware.auth);
    this.app.use('/api/users/forgot-password', rateLimitMiddleware.auth);
    this.app.use('/api/users/reset-password', rateLimitMiddleware.auth);

    // Rate limiting pour les créations
    this.app.use('/api/oeuvres', rateLimitMiddleware.creation);
    this.app.use('/api/evenements', rateLimitMiddleware.creation);
    this.app.use('/api/artisanat', rateLimitMiddleware.creation);
    this.app.use('/api/patrimoine/sites', rateLimitMiddleware.creation);
    
    // Rate limiting pour les actions sensibles
    this.app.use('/api/dashboard/actions', rateLimitMiddleware.sensitiveActions);
    this.app.use('/api/users/change-password', rateLimitMiddleware.sensitiveActions);
    this.app.use('/api/professionnel/export', rateLimitMiddleware.sensitiveActions);
    
    // Rate limiting adaptatif général
    this.app.use('/api/', rateLimitMiddleware.adaptive);

    console.log('✅ Rate limiters initialisés');
  }

  // Initialisation des routes
  initializeRoutes() {
    if (!this.models) {
      throw new Error('Les modèles doivent être initialisés avant les routes');
    }
    if (!this.authMiddleware) {
      throw new Error('Le middleware d\'authentification doit être initialisé avant les routes');
    }

    // Route de santé
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: this.config.server.environment,
        version: '1.0.0'
      });
    });

    // Route racine
    this.app.get('/', (req, res) => {
      res.json({
        message: 'API Action Culture - Système de gestion culturelle algérien',
        version: '1.0.0',
        status: 'running',
        documentation: '/api',
        health: '/health',
        environment: this.config.server.environment,
        uploads: {
          public: 'POST /api/upload/image/public - Upload sans authentification',
          private: 'POST /api/upload/image - Upload avec authentification',
          config: {
            images_dir: this.config.upload.dirs.images,
            max_size: {
              image: `${Math.round(this.config.upload.maxSizes.image / 1048576)}MB`,
              document: `${Math.round(this.config.upload.maxSizes.document / 1048576)}MB`,
              video: `${Math.round(this.config.upload.maxSizes.video / 1048576)}MB`
            },
            base_url: this.config.server.baseUrl
          }
        }
      });
    });

    // Routes API principales
    this.app.use('/api', initRoutes(this.models, this.authMiddleware));

    // Route pour upload PUBLIC
    this.app.post('/api/upload/image/public', 
      auditMiddleware.logAction('upload_image_public', { entityType: 'media' }),
      uploadService.uploadImage().single('image'),
      this.handlePublicUpload.bind(this)
    );

    // Route pour upload avec authentification
    this.app.post('/api/upload/image', 
      this.authMiddleware.authenticate,
      auditMiddleware.logAction('upload_image', { entityType: 'media' }),
      uploadService.uploadImage().single('image'),
      this.handleAuthenticatedUpload.bind(this)
    );

    // Route pour upload de documents
    this.app.post('/api/upload/document',
      this.authMiddleware.authenticate,
      auditMiddleware.logAction('upload_document', { entityType: 'document' }),
      uploadService.uploadDocument().single('document'),
      this.handleDocumentUpload.bind(this)
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
          res.json({
            message: 'Metrics endpoint not implemented yet',
            todo: 'Integrate prometheus-client'
          });
        }
      );
    }

    console.log('✅ Routes initialisées');
    console.log(`  📍 Port configuré: ${this.config.server.port}`);
    console.log(`  📍 URL de base: ${this.config.server.baseUrl}`);
  }

  // Handlers pour les routes upload
  handlePublicUpload(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Aucune image fournie'
        });
      }

      const fileUrl = `${this.config.server.baseUrl}/${req.file.path.replace(/\\/g, '/')}`;
      
      console.log(`📸 Upload public réussi: ${req.file.filename}`);
      
      res.json({
        success: true,
        message: 'Image uploadée avec succès',
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
        error: 'Erreur lors de l\'upload de l\'image'
      });
    }
  }

  handleAuthenticatedUpload(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Aucun fichier fourni'
        });
      }

      const fileUrl = `${this.config.server.baseUrl}/${req.file.path.replace(/\\/g, '/')}`;
      
      console.log(`📸 Upload par ${req.user.email}: ${req.file.filename}`);
      
      res.json({
        success: true,
        message: 'Image uploadée avec succès',
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
        error: 'Erreur lors de l\'upload de l\'image'
      });
    }
  }

  handleDocumentUpload(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Aucun document fourni'
        });
      }

      const fileUrl = `${this.config.server.baseUrl}/${req.file.path.replace(/\\/g, '/')}`;
      
      console.log(`📄 Document uploadé par ${req.user.email}: ${req.file.filename}`);
      
      res.json({
        success: true,
        message: 'Document uploadé avec succès',
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
        error: 'Erreur lors de l\'upload du document'
      });
    }
  }

  async handleGlobalSearch(req, res) {
    try {
      const { q, types, limit, page } = req.query;
      
      if (!q || q.trim().length < this.config.limits.minSearchLength) {
        return res.status(400).json({
          success: false,
          error: `Le terme de recherche doit contenir au moins ${this.config.limits.minSearchLength} caractères`
        });
      }

      const SearchService = require('./services/searchService');
      const searchService = new SearchService(this.models);
      
      const results = await searchService.globalSearch(q.trim(), {
        types: types ? types.split(',') : undefined,
        limit: limit ? parseInt(limit) : this.config.limits.defaultPageSize,
        page: page ? parseInt(page) : 1,
        userId: req.user?.id_user
      });

      res.json(results);
    } catch (error) {
      console.error('Erreur lors de la recherche globale:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la recherche'
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
        limit ? parseInt(limit) : 5
      );

      res.json(results);
    } catch (error) {
      console.error('Erreur lors de la génération de suggestions:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la génération de suggestions'
      });
    }
  }

  // Initialisation de la gestion d'erreurs
  initializeErrorHandling() {
    // Gestionnaire pour les promesses rejetées
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      if (this.config.server.environment === 'production') {
        // Logger dans un service externe
      }
    });

    // Gestionnaire pour les exceptions non capturées
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      this.gracefulShutdown(1);
    });

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
      this.initializeRateLimiters();
      this.initializeRoutes();
      this.initializeErrorHandling();
      
      // Démarrer les tâches planifiées
      await this.startScheduledTasks();
      
      console.log('🎉 Application initialisée avec succès !');
      return this.app;
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation de l\'application:', error);
      throw error;
    }
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