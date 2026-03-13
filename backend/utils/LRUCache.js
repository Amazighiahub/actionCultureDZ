/**
 * LRU Cache en mémoire avec TTL
 * Utilisé par DashboardController et DashboardStatsService
 */
class LRUCache {
  constructor(maxSize = 200) {
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
}

module.exports = LRUCache;
