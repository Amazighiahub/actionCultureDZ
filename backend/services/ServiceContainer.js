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
const UserService = require('./user/UserService');
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
      const OeuvreService = require('./oeuvre/OeuvreService');
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
      const EvenementService = require('./evenement/EvenementService');
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
      const PatrimoineService = require('./patrimoine/PatrimoineService');
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
      const ArtisanatService = require('./artisanat/ArtisanatService');
      this._services.set('artisanat', new ArtisanatService(
        this._repositories.artisanat,
        {
          models: this._models,
          cache: this._cache
        }
      ));
    }

    return this._services.get('artisanat');
  }

  // ============================================================================
  // SERVICES DASHBOARD (existants)
  // ============================================================================

  get statsService() {
    this._checkInitialized();

    if (!this._services.has('stats')) {
      const StatsService = require('./dashboard/StatsService');
      this._services.set('stats', new StatsService(this._models));
    }

    return this._services.get('stats');
  }

  get moderationService() {
    this._checkInitialized();

    if (!this._services.has('moderation')) {
      const ModerationService = require('./dashboard/ModerationService');
      this._services.set('moderation', new ModerationService(this._models));
    }

    return this._services.get('moderation');
  }

  get userManagementService() {
    this._checkInitialized();

    if (!this._services.has('userManagement')) {
      const UserManagementService = require('./dashboard/UserManagementService');
      this._services.set('userManagement', new UserManagementService(this._models));
    }

    return this._services.get('userManagement');
  }

  get analyticsService() {
    this._checkInitialized();

    if (!this._services.has('analytics')) {
      const AnalyticsService = require('./dashboard/AnalyticsService');
      this._services.set('analytics', new AnalyticsService(this._models));
    }

    return this._services.get('analytics');
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
