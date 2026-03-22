// utils/redisClient.js — Singleton Redis partagé
// Utilisé par: cacheMiddleware, authMiddleware (JWT blacklist), rateLimitMiddleware
const logger = require('./logger');

let client = null;
let ready = false;
let connecting = false;

/**
 * Retourne le client Redis connecté, ou null si indisponible.
 * Crée la connexion au premier appel, puis réutilise le même client.
 */
async function getRedisClient() {
  if (client && ready) return client;
  if (connecting) return null; // éviter les connexions parallèles

  try {
    connecting = true;
    const redis = require('redis');
    const url = process.env.REDIS_URL
      || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;

    client = redis.createClient({
      url,
      password: process.env.REDIS_PASSWORD || undefined,
      socket: { connectTimeout: 3000 }
    });

    client.on('error', (err) => {
      if (ready) {
        logger.warn('Redis connection error', { error: err.message });
        ready = false;
      }
    });

    client.on('ready', () => {
      ready = true;
    });

    await client.connect();
    ready = true;
    connecting = false;
    logger.info('Redis client connected (shared singleton)');
    return client;
  } catch (e) {
    connecting = false;
    logger.debug('Redis unavailable — features requiring Redis will be degraded');
    ready = false;
    return null;
  }
}

/**
 * Vérifie si Redis est prêt (sans tenter de connexion)
 */
function isReady() {
  return ready && client !== null;
}

/**
 * Retourne le client existant ou null (synchrone, pas de connexion)
 */
function getClient() {
  return (ready && client) ? client : null;
}

// Tenter la connexion au démarrage (non-bloquant)
getRedisClient().catch(() => {});

module.exports = { getRedisClient, isReady, getClient };
