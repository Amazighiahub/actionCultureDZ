// middlewares/cacheMiddleware.js - Cache with Redis + LRU fallback
const logger = require('../utils/logger');
const { getClient: getRedisClient, isReady: isRedisReady } = require('../utils/redisClient');

// ============================================================
// LRU in-memory cache (fallback when Redis unavailable)
// ============================================================
class LRUCache {
  constructor(maxSize = 500) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return undefined;
    const item = this.cache.get(key);
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  set(key, value, ttlMs) {
    if (this.cache.has(key)) this.cache.delete(key);
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      value,
      expiresAt: ttlMs ? Date.now() + ttlMs : null
    });
  }

  delete(key) { this.cache.delete(key); }
  clear() { this.cache.clear(); }
  get size() { return this.cache.size; }
  keys() { return this.cache.keys(); }
  entries() { return this.cache.entries(); }
  has(key) { return this.cache.has(key); }
}

// ============================================================
// Unified cache store — Redis with LRU fallback
// ============================================================
const lruCache = new LRUCache(500);

const store = {
  async get(key) {
    // Try Redis first
    const redis = getRedisClient();
    if (redis) {
      try {
        const val = await redis.get(`cache:${key}`);
        if (val) return JSON.parse(val);
      } catch (e) { /* fallback below */ }
    }
    return lruCache.get(key);
  },

  async set(key, value, ttlSeconds) {
    // Write to both Redis and LRU
    lruCache.set(key, value, ttlSeconds * 1000);
    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.setEx(`cache:${key}`, ttlSeconds, JSON.stringify(value));
      } catch (e) { /* LRU fallback already written */ }
    }
  },

  async invalidatePattern(pattern) {
    // LRU invalidation
    let count = 0;
    const lruKeys = Array.from(lruCache.keys());
    for (const key of lruKeys) {
      if (key.includes(pattern)) {
        lruCache.delete(key);
        count++;
      }
    }
    if (count > 0) {
      logger.info(`Cache LRU: ${count} entries invalidated for pattern "${pattern}"`);
    }

    // Redis invalidation using SCAN
    const redis = getRedisClient();
    if (redis) {
      try {
        let redisDel = 0;
        let cursor = 0;
        do {
          const reply = await redis.scan(cursor, { MATCH: `cache:*${pattern}*`, COUNT: 100 });
          cursor = reply.cursor;
          if (reply.keys.length > 0) {
            await redis.del(reply.keys);
            redisDel += reply.keys.length;
            count += reply.keys.length;
          }
        } while (cursor !== 0);
        if (redisDel > 0) {
          logger.info(`Cache Redis: ${redisDel} entries invalidated for pattern "${pattern}"`);
        }
      } catch (e) {
        logger.warn(`Cache Redis invalidation error for "${pattern}":`, e.message);
      }
    }

    return count;
  },

  async invalidatePrefix(prefix) {
    // LRU invalidation par préfixe (plus précis que pattern)
    let count = 0;
    for (const key of lruCache.keys()) {
      if (key.startsWith(prefix)) {
        lruCache.delete(key);
        count++;
      }
    }

    // Redis: SCAN par préfixe exact
    const redis = getRedisClient();
    if (redis) {
      try {
        let cursor = 0;
        do {
          const reply = await redis.scan(cursor, { MATCH: `cache:${prefix}*`, COUNT: 200 });
          cursor = reply.cursor;
          if (reply.keys.length > 0) {
            await redis.del(reply.keys);
            count += reply.keys.length;
          }
        } while (cursor !== 0);
      } catch (e) { /* LRU already invalidated */ }
    }
    return count;
  },

  async invalidateKeys(keys) {
    let count = 0;
    for (const key of keys) {
      lruCache.delete(key);
    }
    const redis = getRedisClient();
    if (redis && keys.length > 0) {
      try {
        const redisKeys = keys.map(k => `cache:${k}`);
        count = await redis.del(redisKeys);
      } catch (e) { /* LRU already invalidated */ }
    }
    return count;
  },

  async clear() {
    lruCache.clear();
    const redis = getRedisClient();
    if (redis) {
      try {
        // Only clear cache: prefixed keys
        let cursor = 0;
        do {
          const reply = await redis.scan(cursor, { MATCH: 'cache:*', COUNT: 100 });
          cursor = reply.cursor;
          if (reply.keys.length > 0) await redis.del(reply.keys);
        } while (cursor !== 0);
      } catch (e) { /* LRU already cleared */ }
    }
  }
};

// ============================================================
// Middleware factories
// ============================================================
function createCacheMiddleware(ttl = 300) {
  return (req, res, next) => {
    if (req.method !== 'GET') return next();

    const key = req.originalUrl || req.url;

    store.get(key).then(cachedData => {
      if (cachedData) {
        return res.json(cachedData);
      }

      const originalJson = res.json.bind(res);
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          store.set(key, data, ttl).catch(() => {});
        }
        return originalJson(data);
      };

      next();
    }).catch(() => next());
  };
}

function createUserCacheMiddleware(ttl = 300) {
  return (req, res, next) => {
    if (req.method !== 'GET' || !req.user) return next();

    const key = `user:${req.user.id_user}:${req.originalUrl || req.url}`;

    store.get(key).then(cachedData => {
      if (cachedData) return res.json(cachedData);

      const originalJson = res.json.bind(res);
      res.json = function(data) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          store.set(key, data, ttl).catch(() => {});
        }
        return originalJson(data);
      };
      next();
    }).catch(() => next());
  };
}

function createInvalidateCacheMiddleware(patterns = []) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      // N'invalider que si la mutation a réussi
      if (res.statusCode < 400) {
        patterns.forEach(pattern => {
          store.invalidatePrefix(pattern).catch(() => {});
        });
      }
      return originalJson(data);
    };
    next();
  };
}

// ============================================================
// Exports
// ============================================================
const cacheMiddleware = {
  conditionalCache: createCacheMiddleware,
  userCache: createUserCacheMiddleware,
  invalidateCache: createInvalidateCacheMiddleware,

  invalidateOnChange: (resourceType) => {
    return createInvalidateCacheMiddleware([`/${resourceType}`]);
  },

  clearCache: async (type = 'all') => {
    try {
      logger.info(`clearCache called with type="${type}"`);
      if (type === 'all') {
        await store.clear();
      } else {
        const cleared = await store.invalidatePattern(type);
        logger.info(`clearCache("${type}"): ${cleared} entries cleared`);
      }
    } catch (e) {
      logger.warn(`clearCache error for "${type}":`, e.message);
    }
  },

  getStats: () => {
    let validEntries = 0;
    let expiredEntries = 0;
    const now = Date.now();

    for (const [, item] of lruCache.entries()) {
      if (!item.expiresAt || item.expiresAt > now) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      backend: isRedisReady() ? 'redis' : 'memory',
      totalEntries: lruCache.size,
      validEntries,
      expiredEntries,
      maxSize: lruCache.maxSize,
      redisConnected: isRedisReady()
    };
  }
};

// Cache strategies with appropriate TTLs
cacheMiddleware.cacheStrategy = {
  short: createCacheMiddleware(60),         // 1 minute
  medium: createCacheMiddleware(300),       // 5 minutes
  long: createCacheMiddleware(3600),        // 1 hour
  veryLong: createCacheMiddleware(86400),   // 24 hours
  metadata: createCacheMiddleware(604800)   // 7 days (for static reference data)
};

// Periodic LRU cleanup (Redis handles its own TTL expiry)
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, item] of lruCache.entries()) {
    if (item.expiresAt && item.expiresAt <= now) {
      lruCache.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    logger.debug(`Cache cleanup: ${cleaned} expired entries removed`);
  }
}, 5 * 60 * 1000);
if (typeof cleanupInterval.unref === 'function') {
  cleanupInterval.unref();
}

module.exports = cacheMiddleware;
