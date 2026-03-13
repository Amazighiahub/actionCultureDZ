// middlewares/cacheMiddleware.js - Cache with Redis + LRU fallback
const logger = require('../utils/logger');

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
// Redis cache adapter
// ============================================================
let redisClient = null;
let redisReady = false;

async function getRedisClient() {
  if (redisClient && redisReady) return redisClient;

  try {
    const redis = require('redis');
    const url = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;

    redisClient = redis.createClient({
      url,
      password: process.env.REDIS_PASSWORD || undefined,
      socket: { connectTimeout: 3000 }
    });

    redisClient.on('error', (err) => {
      if (redisReady) {
        logger.warn('Redis cache connection error — falling back to LRU', { error: err.message });
        redisReady = false;
      }
    });

    redisClient.on('ready', () => {
      redisReady = true;
    });

    await redisClient.connect();
    redisReady = true;
    logger.info('Redis cache connected');
    return redisClient;
  } catch (e) {
    logger.debug('Redis unavailable for cache — using in-memory LRU');
    redisReady = false;
    return null;
  }
}

// Try to connect to Redis at startup (non-blocking)
getRedisClient().catch(() => {});

// ============================================================
// Unified cache store — Redis with LRU fallback
// ============================================================
const lruCache = new LRUCache(500);

const store = {
  async get(key) {
    // Try Redis first
    if (redisReady && redisClient) {
      try {
        const val = await redisClient.get(`cache:${key}`);
        if (val) return JSON.parse(val);
      } catch (e) { /* fallback below */ }
    }
    return lruCache.get(key);
  },

  async set(key, value, ttlSeconds) {
    // Write to both Redis and LRU
    lruCache.set(key, value, ttlSeconds * 1000);
    if (redisReady && redisClient) {
      try {
        await redisClient.setEx(`cache:${key}`, ttlSeconds, JSON.stringify(value));
      } catch (e) { /* LRU fallback already written */ }
    }
  },

  async invalidatePattern(pattern) {
    // LRU invalidation
    let count = 0;
    for (const key of lruCache.keys()) {
      if (key.includes(pattern)) {
        lruCache.delete(key);
        count++;
      }
    }

    // Redis invalidation using SCAN (non-blocking)
    if (redisReady && redisClient) {
      try {
        let cursor = 0;
        do {
          const reply = await redisClient.scan(cursor, { MATCH: `cache:*${pattern}*`, COUNT: 100 });
          cursor = reply.cursor;
          if (reply.keys.length > 0) {
            await redisClient.del(reply.keys);
            count += reply.keys.length;
          }
        } while (cursor !== 0);
      } catch (e) { /* LRU already invalidated */ }
    }

    return count;
  },

  async clear() {
    lruCache.clear();
    if (redisReady && redisClient) {
      try {
        // Only clear cache: prefixed keys
        let cursor = 0;
        do {
          const reply = await redisClient.scan(cursor, { MATCH: 'cache:*', COUNT: 100 });
          cursor = reply.cursor;
          if (reply.keys.length > 0) await redisClient.del(reply.keys);
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
      // Invalidate after response
      patterns.forEach(pattern => {
        store.invalidatePattern(pattern).catch(() => {});
      });
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

  clearCache: (type = 'all') => {
    if (type === 'all') {
      store.clear().catch(() => {});
    } else {
      store.invalidatePattern(type).catch(() => {});
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
      backend: redisReady ? 'redis' : 'memory',
      totalEntries: lruCache.size,
      validEntries,
      expiredEntries,
      maxSize: lruCache.maxSize,
      redisConnected: redisReady
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
