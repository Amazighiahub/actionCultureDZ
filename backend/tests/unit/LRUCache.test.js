/**
 * Tests unitaires pour LRUCache
 */

const LRUCache = require('../../utils/LRUCache');

describe('LRUCache', () => {
  let cache;

  beforeEach(() => {
    cache = new LRUCache(3);
  });

  describe('get / set', () => {
    it('should return undefined for missing key', () => {
      expect(cache.get('nope')).toBeUndefined();
    });

    it('should store and retrieve a value', () => {
      cache.set('a', 42);
      expect(cache.get('a')).toBe(42);
    });

    it('should overwrite existing key', () => {
      cache.set('a', 1);
      cache.set('a', 2);
      expect(cache.get('a')).toBe(2);
      expect(cache.size).toBe(1);
    });

    it('should handle falsy values correctly', () => {
      cache.set('zero', 0);
      cache.set('false', false);
      cache.set('null', null);
      expect(cache.get('zero')).toBe(0);
      expect(cache.get('false')).toBe(false);
      expect(cache.get('null')).toBe(null);
    });
  });

  describe('TTL expiration', () => {
    it('should return value before TTL expires', () => {
      cache.set('a', 'fresh', 10000);
      expect(cache.get('a')).toBe('fresh');
    });

    it('should return undefined after TTL expires', () => {
      jest.useFakeTimers();
      cache.set('a', 'stale', 500);
      jest.advanceTimersByTime(600);
      expect(cache.get('a')).toBeUndefined();
      jest.useRealTimers();
    });

    it('should store without TTL (no expiration)', () => {
      jest.useFakeTimers();
      cache.set('a', 'forever');
      jest.advanceTimersByTime(999999);
      expect(cache.get('a')).toBe('forever');
      jest.useRealTimers();
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entry when maxSize is reached', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      // cache full (maxSize=3), adding 'd' should evict 'a'
      cache.set('d', 4);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('d')).toBe(4);
      expect(cache.size).toBe(3);
    });

    it('should promote recently accessed entry', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      // Access 'a' to promote it
      cache.get('a');
      // Add 'd' — should evict 'b' (oldest not accessed)
      cache.set('d', 4);
      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBeUndefined();
    });
  });

  describe('delete / clear', () => {
    it('should delete a specific key', () => {
      cache.set('a', 1);
      cache.delete('a');
      expect(cache.get('a')).toBeUndefined();
      expect(cache.size).toBe(0);
    });

    it('should clear all entries', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.clear();
      expect(cache.size).toBe(0);
    });
  });

  describe('keys', () => {
    it('should iterate over all keys', () => {
      cache.set('x', 1);
      cache.set('y', 2);
      const keys = [...cache.keys()];
      expect(keys).toEqual(expect.arrayContaining(['x', 'y']));
    });
  });
});
