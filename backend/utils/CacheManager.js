/**
 * CacheManager — Abstraction de cache avec adapter pattern
 *
 * Utilise LRU en mémoire par défaut.
 * Swappable vers Redis sans modifier les services :
 *   const cache = CacheManager.create({ adapter: 'redis', redis: redisClient });
 *
 * Interface unifiée : get, set, delete, clear, invalidate(pattern)
 */
const LRUCache = require('./LRUCache');

class CacheManager {
  /**
   * @param {Object} options
   * @param {string} options.namespace - Préfixe des clés (ex: 'metadata', 'evenements')
   * @param {number} options.defaultTTL - TTL par défaut en ms
   * @param {number} options.maxSize - Taille max du cache LRU (ignoré pour Redis)
   */
  constructor(options = {}) {
    const {
      namespace = 'app',
      defaultTTL = 5 * 60 * 1000,
      maxSize = 200
    } = options;

    this.namespace = namespace;
    this.defaultTTL = defaultTTL;
    this._store = new LRUCache(maxSize);
    this._stats = { hits: 0, misses: 0 };
  }

  /**
   * Factory method — point d'entrée pour futur adapter Redis
   */
  static create(options = {}) {
    // Futur : if (options.adapter === 'redis') return new RedisCacheManager(options);
    return new CacheManager(options);
  }

  /**
   * Clé interne préfixée par namespace
   */
  _key(key) {
    return `${this.namespace}:${key}`;
  }

  /**
   * Récupère une valeur du cache
   */
  get(key) {
    const value = this._store.get(this._key(key));
    if (value !== undefined) {
      this._stats.hits++;
    } else {
      this._stats.misses++;
    }
    return value;
  }

  /**
   * Stocke une valeur dans le cache
   * @param {string} key
   * @param {*} value
   * @param {number} [ttl] - TTL en ms (utilise defaultTTL si omis)
   */
  set(key, value, ttl) {
    this._store.set(this._key(key), value, ttl || this.defaultTTL);
  }

  /**
   * Supprime une clé
   */
  delete(key) {
    this._store.delete(this._key(key));
  }

  /**
   * Vide tout le namespace
   */
  clear() {
    // Ne supprimer que les clés de ce namespace
    const prefix = `${this.namespace}:`;
    for (const key of this._store.keys()) {
      if (key.startsWith(prefix)) {
        this._store.delete(key);
      }
    }
  }

  /**
   * Invalide les clés qui matchent un pattern (substring)
   * @param {string} pattern - Ex: 'published' invalide 'evenements:published:page=1'
   */
  invalidate(pattern) {
    if (!pattern) {
      this.clear();
      return;
    }
    const prefix = `${this.namespace}:`;
    for (const key of this._store.keys()) {
      if (key.startsWith(prefix) && key.includes(pattern)) {
        this._store.delete(key);
      }
    }
  }

  /**
   * Wrapper get-or-set : retourne le cache ou exécute le generator
   * @param {string} key
   * @param {Function} generator - Async function qui génère la valeur
   * @param {number} [ttl] - TTL en ms
   */
  async getOrSet(key, generator, ttl) {
    const cached = this.get(key);
    if (cached !== undefined) return cached;

    const value = await generator();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Statistiques du cache (monitoring)
   */
  getStats() {
    const total = this._stats.hits + this._stats.misses;
    return {
      namespace: this.namespace,
      hits: this._stats.hits,
      misses: this._stats.misses,
      hitRate: total > 0 ? (this._stats.hits / total * 100).toFixed(1) + '%' : '0%',
      size: this._store.size
    };
  }

  resetStats() {
    this._stats = { hits: 0, misses: 0 };
  }
}

module.exports = CacheManager;
