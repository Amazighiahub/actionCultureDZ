/**
 * ServiceContainer - Conteneur d'injection de dépendances
 *
 * Pattern: Dependency Injection Container / Service Locator
 *
 * Centralise la création et l'accès aux services.
 * Assure que chaque service n'est instancié qu'une fois (Singleton).
 *
 * Architecture:
 * - Controller demande un service au Container
 * - Container crée/retourne le service avec ses dépendances injectées
 * - Service utilise le Repository injecté
 */

const { createRepositories } = require('../repositories');
const UserService = require('./user/userService');
const logger = require('../utils/logger');

class ServiceContainer {
  constructor() {
    this._services = new Map();
    this._repositories = null;
    this._models = null;
    this._initialized = false;
  }

  /**
   * Initialise le container avec les modèles Sequelize
   * @param {Object} models - Modèles Sequelize
   */
  initialize(models) {
    if (this._initialized) {
      logger.warn('ServiceContainer déjà initialisé');
      return this;
    }

    this._models = models;
    this._repositories = createRepositories(models);
    this._initialized = true;

    logger.info('ServiceContainer initialisé avec succès');

    return this;
  }

  /**
   * Vérifie que le container est initialisé
   * @private
   */
  _checkInitialized() {
    if (!this._initialized) {
      throw new Error('ServiceContainer non initialisé. Appelez initialize(models) d\'abord.');
    }
  }

  // ============================================================================
  // GETTERS DE SERVICES (Lazy Loading + Singleton)
  // ============================================================================

  /**
   * Récupère ou crée le UserService
   * @returns {UserService}
   */
  get userService() {
    this._checkInitialized();

    if (!this._services.has('user')) {
      this._services.set('user', new UserService(
        this._repositories.user,
        {
          models: this._models,
          cache: this._cache
        }
      ));
    }

    return this._services.get('user');
  }

  /**
   * Récupère ou crée l'OeuvreService
   * @returns {OeuvreService}
   */
  get oeuvreService() {
    this._checkInitialized();

    if (!this._services.has('oeuvre')) {
      // Import dynamique pour éviter les dépendances circulaires
      const OeuvreService = require('./oeuvre/oeuvreService');
      this._services.set('oeuvre', new OeuvreService(
        this._repositories.oeuvre,
        {
          models: this._models,
          cache: this._cache
        }
      ));
    }

    return this._services.get('oeuvre');
  }

  /**
   * Récupère ou crée l'EvenementService
   * @returns {EvenementService}
   */
  get evenementService() {
    this._checkInitialized();

    if (!this._services.has('evenement')) {
      const EvenementService = require('./evenement/evenementService');
      this._services.set('evenement', new EvenementService(
        this._repositories.evenement,
        {
          models: this._models,
          cache: this._cache
        }
      ));
    }

    return this._services.get('evenement');
  }

  /**
   * Récupère ou crée le PatrimoineService
   * @returns {PatrimoineService}
   */
  get patrimoineService() {
    this._checkInitialized();

    if (!this._services.has('patrimoine')) {
      const PatrimoineService = require('./patrimoine/patrimoineService');
      this._services.set('patrimoine', new PatrimoineService(
        this._repositories.patrimoine,
        {
          models: this._models,
          cache: this._cache
        }
      ));
    }

    return this._services.get('patrimoine');
  }

  /**
   * Récupère ou crée l'ArtisanatService
   * @returns {ArtisanatService}
   */
  get artisanatService() {
    this._checkInitialized();

    if (!this._services.has('artisanat')) {
      const ArtisanatService = require('./artisanat/artisanatService');
      this._services.set('artisanat', new ArtisanatService(
        this._repositories.artisanat,
        {
          models: this._models,
          cache: this._cache,
          repositories: this._repositories
        }
      ));
    }

    return this._services.get('artisanat');
  }

  /**
   * Récupère ou crée le ServiceService (services culturels)
   * @returns {ServiceService}
   */
  get serviceService() {
    this._checkInitialized();

    if (!this._services.has('service')) {
      const ServiceService = require('./service/serviceService');
      this._services.set('service', new ServiceService(
        this._repositories.service,
        {
          models: this._models,
          cache: this._cache
        }
      ));
    }

    return this._services.get('service');
  }

  /**
   * Récupère ou crée le ParcoursService
   * @returns {ParcoursService}
   */
  get parcoursService() {
    this._checkInitialized();

    if (!this._services.has('parcours')) {
      const ParcoursService = require('./parcours/parcoursService');
      this._services.set('parcours', new ParcoursService(
        this._repositories.parcours,
        {
          models: this._models,
          cache: this._cache
        }
      ));
    }

    return this._services.get('parcours');
  }

  /**
   * Recupere ou cree le SignalementService
   * @returns {SignalementService}
   */
  get signalementService() {
    this._checkInitialized();

    if (!this._services.has('signalement')) {
      const SignalementService = require('./signalement/signalementService');
      this._services.set('signalement', new SignalementService(
        this._repositories.signalement,
        {
          models: this._models,
          cache: this._cache
        }
      ));
    }

    return this._services.get('signalement');
  }

  // ============================================================================
  // SERVICES DASHBOARD (existants)
  // ============================================================================

  get statsService() {
    this._checkInitialized();

    if (!this._services.has('stats')) {
      const StatsService = require('./dashboard/statsService');
      this._services.set('stats', new StatsService(this._models));
    }

    return this._services.get('stats');
  }

  get moderationService() {
    this._checkInitialized();

    if (!this._services.has('moderation')) {
      const ModerationService = require('./dashboard/moderationService');
      this._services.set('moderation', new ModerationService(this._models));
    }

    return this._services.get('moderation');
  }

  get userManagementService() {
    this._checkInitialized();

    if (!this._services.has('userManagement')) {
      const UserManagementService = require('./dashboard/userManagementService');
      this._services.set('userManagement', new UserManagementService(this._models, this._repositories));
    }

    return this._services.get('userManagement');
  }

  get analyticsService() {
    this._checkInitialized();

    if (!this._services.has('analytics')) {
      const AnalyticsService = require('./dashboard/analyticsService');
      this._services.set('analytics', new AnalyticsService(this._models));
    }

    return this._services.get('analytics');
  }

  get monitoringService() {
    this._checkInitialized();

    if (!this._services.has('monitoring')) {
      const MonitoringService = require('./dashboard/monitoringService');
      this._services.set('monitoring', new MonitoringService(this._models, this._repositories));
    }

    return this._services.get('monitoring');
  }

  get notificationService() {
    this._checkInitialized();

    if (!this._services.has('notification')) {
      const NotificationService = require('./notificationService');
      this._services.set('notification', new NotificationService(this._models, {
        repositories: this._repositories
      }));
    }

    return this._services.get('notification');
  }

  get lieuService() {
    this._checkInitialized();

    if (!this._services.has('lieu')) {
      const LieuService = require('./lieuService');
      this._services.set('lieu', new LieuService(
        this._repositories.lieu,
        { models: this._models, cache: this._cache }
      ));
    }

    return this._services.get('lieu');
  }

  get programmeService() {
    this._checkInitialized();

    if (!this._services.has('programme')) {
      const ProgrammeService = require('./programmeService');
      this._services.set('programme', new ProgrammeService(
        this._repositories.programme,
        { models: this._models, cache: this._cache }
      ));
    }

    return this._services.get('programme');
  }

  get intervenantService() {
    this._checkInitialized();

    if (!this._services.has('intervenant')) {
      const IntervenantService = require('./intervenantService');
      this._services.set('intervenant', new IntervenantService(
        this._repositories.intervenant,
        { models: this._models, cache: this._cache }
      ));
    }

    return this._services.get('intervenant');
  }

  get professionnelService() {
    this._checkInitialized();

    if (!this._services.has('professionnel')) {
      const ProfessionnelService = require('./professionnelService');
      this._services.set('professionnel', new ProfessionnelService(this._models));
    }

    return this._services.get('professionnel');
  }

  get metadataService() {
    this._checkInitialized();

    if (!this._services.has('metadata')) {
      const MetadataService = require('./metadataService');
      this._services.set('metadata', new MetadataService(this._models));
    }

    return this._services.get('metadata');
  }

  get commentaireService() {
    this._checkInitialized();

    if (!this._services.has('commentaire')) {
      const CommentaireService = require('./commentaireService');
      this._services.set('commentaire', new CommentaireService(
        this._repositories.commentaire,
        { models: this._models, cache: this._cache }
      ));
    }

    return this._services.get('commentaire');
  }

  get favoriService() {
    this._checkInitialized();

    if (!this._services.has('favori')) {
      const FavoriService = require('./favoriService');
      this._services.set('favori', new FavoriService(
        this._repositories.favori,
        { models: this._models, cache: this._cache }
      ));
    }

    return this._services.get('favori');
  }

  /**
   * Recupere ou cree le VueService (tracking des vues)
   * @returns {VueService}
   */
  get vueService() {
    this._checkInitialized();

    if (!this._services.has('vue')) {
      const VueService = require('./vueService');
      this._services.set('vue', new VueService(
        this._repositories.vue,
        { models: this._models, cache: this._cache }
      ));
    }

    return this._services.get('vue');
  }

  get articleBlockService() {
    this._checkInitialized();

    if (!this._services.has('articleBlock')) {
      const ArticleBlockService = require('./articleBlockService');
      this._services.set('articleBlock', new ArticleBlockService(
        this._repositories.articleBlock,
        { models: this._models, cache: this._cache }
      ));
    }

    return this._services.get('articleBlock');
  }

  get emailVerificationService() {
    this._checkInitialized();

    if (!this._services.has('emailVerification')) {
      const EmailVerificationService = require('./emailVerificationService');
      this._services.set('emailVerification', new EmailVerificationService(this._models));
    }

    return this._services.get('emailVerification');
  }

  /**
   * Recupere ou cree l'UploadService (media business logic)
   * @returns {UploadService}
   */
  get uploadService() {
    this._checkInitialized();

    if (!this._services.has('upload')) {
      const UploadService = require('./upload/uploadService');
      this._services.set('upload', new UploadService(this._models));
    }

    return this._services.get('upload');
  }

  get multilingualService() {
    this._checkInitialized();

    if (!this._services.has('multilingual')) {
      const MultilingualService = require('./multilingualService');
      this._services.set('multilingual', new MultilingualService(this._models));
    }

    return this._services.get('multilingual');
  }

  // ============================================================================
  // SERVICES BACKGROUND (singletons externes : queue Bull + crons)
  // ============================================================================

  /**
   * Retourne le singleton emailService (pas instancié via le container)
   * @returns {EmailService}
   */
  get emailService() {
    if (!this._services.has('email')) {
      this._services.set('email', require('./emailService'));
    }
    return this._services.get('email');
  }

  /**
   * Retourne le singleton emailQueueService
   * @returns {EmailQueueService}
   */
  get emailQueueService() {
    if (!this._services.has('emailQueue')) {
      this._services.set('emailQueue', require('./emailQueueService'));
    }
    return this._services.get('emailQueue');
  }

  /**
   * Retourne le singleton cronService
   * @returns {CronService}
   */
  get cronService() {
    if (!this._services.has('cron')) {
      this._services.set('cron', require('./cronService'));
    }
    return this._services.get('cron');
  }

  /**
   * Démarre les services background : queue email Bull + crons planifiés.
   * Idempotent : peut être appelé plusieurs fois, ne fera rien si déjà démarré.
   *
   * @param {Object} [opts]
   * @param {boolean} [opts.enableCrons=true]  Active les crons (respecte ENABLE_SCHEDULED_TASKS)
   * @param {boolean} [opts.enableQueue=true]  Active la queue email
   */
  async bootBackgroundServices(opts = {}) {
    this._checkInitialized();

    const { enableCrons = true, enableQueue = true } = opts;
    const results = { queue: null, crons: null };

    if (enableQueue) {
      try {
        const queue = this.emailQueueService;
        if (!queue.isInitialized) {
          await queue.initialize();
        }
        results.queue = queue.isInitialized ? 'ok' : 'degraded';
      } catch (error) {
        logger.error('Erreur démarrage queue email:', error);
        results.queue = 'failed';
      }
    } else {
      results.queue = 'disabled';
    }

    if (enableCrons) {
      try {
        const cron = this.cronService;
        if (!cron.isRunning) {
          // Bag de services minimal nécessaire aux jobs
          const servicesBag = {
            emailService: this.emailService,
            emailQueueService: this.emailQueueService,
            notificationService: this.notificationService
          };
          cron.initialize(this._models, servicesBag);
        }
        results.crons = cron.isRunning ? 'ok' : 'failed';
      } catch (error) {
        logger.error('Erreur démarrage crons:', error);
        results.crons = 'failed';
      }
    } else {
      results.crons = 'disabled';
    }

    logger.info(`Background services: queue=${results.queue}, crons=${results.crons}`);
    return results;
  }

  /**
   * Arrête proprement les services background (pour graceful shutdown).
   */
  async shutdownBackgroundServices() {
    const tasks = [];

    if (this._services.has('cron')) {
      const cron = this._services.get('cron');
      if (cron.isRunning) {
        try { cron.stopAll(); } catch (e) { logger.error('Erreur stopAll crons:', e); }
      }
    }

    if (this._services.has('emailQueue')) {
      const queue = this._services.get('emailQueue');
      if (queue.isInitialized) {
        tasks.push(queue.close().catch(e => logger.error('Erreur close queue email:', e)));
      }
    }

    await Promise.all(tasks);
    logger.info('Services background arrêtés');
  }

  // ============================================================================
  // ACCÈS AUX REPOSITORIES (pour cas spéciaux)
  // ============================================================================

  get repositories() {
    this._checkInitialized();
    return this._repositories;
  }

  get models() {
    this._checkInitialized();
    return this._models;
  }

  // ============================================================================
  // GESTION DU CACHE
  // ============================================================================

  /**
   * Configure le cache pour les services
   * @param {Object} cache - Instance de cache (Redis, etc.)
   */
  setCache(cache) {
    this._cache = cache;

    // Mettre à jour les services existants
    for (const service of this._services.values()) {
      if (service.cache !== undefined) {
        service.cache = cache;
      }
    }

    logger.info('Cache configuré pour ServiceContainer');
  }

  // ============================================================================
  // UTILITAIRES
  // ============================================================================

  /**
   * Récupère un service par son nom
   * @param {string} name - Nom du service
   * @returns {BaseService}
   */
  getService(name) {
    const serviceGetter = `${name}Service`;
    if (typeof this[serviceGetter] !== 'undefined') {
      return this[serviceGetter];
    }

    throw new Error(`Service inconnu: ${name}`);
  }

  /**
   * Liste tous les services disponibles
   * @returns {Array<string>}
   */
  listServices() {
    return [
      'user',
      'oeuvre',
      'evenement',
      'patrimoine',
      'artisanat',
      'service',
      'parcours',
      'signalement',
      'stats',
      'moderation',
      'userManagement',
      'analytics'
    ];
  }

  /**
   * Réinitialise le container (utile pour les tests)
   */
  reset() {
    this._services.clear();
    this._repositories = null;
    this._models = null;
    this._cache = null;
    this._initialized = false;

    logger.info('ServiceContainer réinitialisé');
  }

  /**
   * Retourne l'état du container
   */
  getStatus() {
    return {
      initialized: this._initialized,
      servicesLoaded: Array.from(this._services.keys()),
      hasCache: !!this._cache
    };
  }
}

// Singleton global
const container = new ServiceContainer();

module.exports = container;
