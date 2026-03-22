/**
 * CacheManager — Abstraction de cache avec Redis + LRU fallback
 *
 * Redis est le store primaire (partagé entre workers en cluster).
 * LRU en mémoire sert de fallback si Redis est indisponible.
 *
 * Interface unifiée : get, set, delete, clear, invalidate(pattern), getOrSet
 */
const LRUCache = require('./LRUCache');
const { getClient: getRedisClient } = require('./redisClient');

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
   * Factory method
   */
  static create(options = {}) {
    return new CacheManager(options);
  }

  /**
   * Clé interne préfixée par namespace
   */
  _key(key) {
    return `${this.namespace}:${key}`;
  }

  /**
   * Clé Redis préfixée pour éviter les collisions globales
   */
  _redisKey(key) {
    return `cm:${this.namespace}:${key}`;
  }

  /**
   * Récupère une valeur du cache (Redis → LRU fallback)
   */
  get(key) {
    // Synchrone : LRU seulement. Pour Redis, utiliser getAsync ou getOrSet.
    const value = this._store.get(this._key(key));
    if (value !== undefined) {
      this._stats.hits++;
    } else {
      this._stats.misses++;
    }
    return value;
  }

  /**
   * Récupère une valeur du cache (Redis → LRU fallback, async)
   */
  async getAsync(key) {
    const redis = getRedisClient();
    if (redis) {
      try {
        const val = await redis.get(this._redisKey(key));
        if (val) {
          this._stats.hits++;
          return JSON.parse(val);
        }
      } catch (_) { /* fallback LRU */ }
    }

    const value = this._store.get(this._key(key));
    if (value !== undefined) {
      this._stats.hits++;
    } else {
      this._stats.misses++;
    }
    return value;
  }

  /**
   * Stocke une valeur dans le cache (LRU + Redis)
   * @param {string} key
   * @param {*} value
   * @param {number} [ttl] - TTL en ms (utilise defaultTTL si omis)
   */
  set(key, value, ttl) {
    const ttlMs = ttl || this.defaultTTL;
    this._store.set(this._key(key), value, ttlMs);

    // Write-through vers Redis (non-bloquant)
    const redis = getRedisClient();
    if (redis) {
      const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000));
      redis.setEx(this._redisKey(key), ttlSec, JSON.stringify(value)).catch(() => {});
    }
  }

  /**
   * Supprime une clé
   */
  delete(key) {
    this._store.delete(this._key(key));
    const redis = getRedisClient();
    if (redis) {
      redis.del(this._redisKey(key)).catch(() => {});
    }
  }

  /**
   * Vide tout le namespace
   */
  clear() {
    // LRU : ne supprimer que les clés de ce namespace
    const prefix = `${this.namespace}:`;
    for (const key of this._store.keys()) {
      if (key.startsWith(prefix)) {
        this._store.delete(key);
      }
    }

    // Redis : SCAN + DEL par préfixe (non-bloquant)
    const redis = getRedisClient();
    if (redis) {
      (async () => {
        try {
          let cursor = 0;
          do {
            const reply = await redis.scan(cursor, { MATCH: `cm:${this.namespace}:*`, COUNT: 200 });
            cursor = reply.cursor;
            if (reply.keys.length > 0) await redis.del(reply.keys);
          } while (cursor !== 0);
        } catch (_) { /* best-effort */ }
      })();
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
    // LRU
    const prefix = `${this.namespace}:`;
    for (const key of this._store.keys()) {
      if (key.startsWith(prefix) && key.includes(pattern)) {
        this._store.delete(key);
      }
    }

    // Redis
    const redis = getRedisClient();
    if (redis) {
      (async () => {
        try {
          let cursor = 0;
          do {
            const reply = await redis.scan(cursor, { MATCH: `cm:${this.namespace}:*${pattern}*`, COUNT: 200 });
            cursor = reply.cursor;
            if (reply.keys.length > 0) await redis.del(reply.keys);
          } while (cursor !== 0);
        } catch (_) { /* best-effort */ }
      })();
    }
  }

  /**
   * Wrapper get-or-set : retourne le cache ou exécute le generator
   * Essaie Redis → LRU → generator
   * @param {string} key
   * @param {Function} generator - Async function qui génère la valeur
   * @param {number} [ttl] - TTL en ms
   */
  async getOrSet(key, generator, ttl) {
    // 1. Redis
    const redis = getRedisClient();
    if (redis) {
      try {
        const val = await redis.get(this._redisKey(key));
        if (val) {
          this._stats.hits++;
          return JSON.parse(val);
        }
      } catch (_) { /* fallback LRU */ }
    }

    // 2. LRU
    const cached = this._store.get(this._key(key));
    if (cached !== undefined) {
      this._stats.hits++;
      return cached;
    }

    // 3. Generate + store both
    this._stats.misses++;
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
      size: this._store.size,
      backend: getRedisClient() ? 'redis+lru' : 'lru'
    };
  }

  resetStats() {
    this._stats = { hits: 0, misses: 0 };
  }
}

module.exports = CacheManager;
