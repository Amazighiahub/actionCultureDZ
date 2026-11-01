// utils/redisClient.js — Singleton Redis partagé
// Utilisé par: cacheMiddleware, authMiddleware (JWT blacklist), rateLimitMiddleware
const logger = require('./logger');

let client = null;
let ready = false;
let connecting = false;
let connectPromise = null;

/**
 * Retourne le client Redis connecté, ou null si indisponible.
 * Crée la connexion au premier appel, puis réutilise le même client.
 *
 * Note: node-redis v5 gère l'auto-reconnexion via reconnectStrategy.
 * On NE recrée PAS le client si la connexion est perdue — on laisse
 * node-redis se reconnecter automatiquement.
 */
async function getRedisClient() {
  // Cas 1: client prêt → retourne immédiatement
  if (client && ready) return client;

  // Cas 2: client existe mais déconnecté → attend la reconnexion auto
  // (node-redis v5 reconnecte automatiquement via reconnectStrategy)
  if (client && !ready) return null;

  // Cas 3: connexion en cours → attend la même promise (évite les races)
  if (connecting && connectPromise) {
    try {
      return await connectPromise;
    } catch {
      return null;
    }
  }

  // Cas 4: première connexion ou client mort → créer
  connecting = true;
  connectPromise = (async () => {
    try {
      const redis = require('redis');
      const url = process.env.REDIS_URL
        || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;

      // Sécurité : rejeter le démarrage en production si Redis n'est pas authentifié
      if (process.env.NODE_ENV === 'production' &&
          !process.env.REDIS_PASSWORD &&
          !url.includes('@')) {
        throw new Error('[SECURITY] Redis en production sans authentification — configurer REDIS_PASSWORD ou inclure les credentials dans REDIS_URL');
      }

      const newClient = redis.createClient({
        url,
        password: process.env.REDIS_PASSWORD || undefined,
        // Redis coupé : les commandes échouent tout de suite (chaque appelant a sa solution de repli)
        // au lieu d'attendre la reconnexion en bloquant la requête.
        disableOfflineQueue: true,
        socket: {
          connectTimeout: 3000,
          // Reconnexion sans fin (au plus toutes les 5 s) : abandonner laissait le serveur sans Redis
          // jusqu'au prochain redémarrage — en production, sessions refusées (liste de révocation illisible).
          // Vaut aussi pour le premier démarrage si Redis n'est pas encore prêt.
          reconnectStrategy: (retries) => {
            if (retries % 60 === 1) {
              logger.warn('Redis indisponible, nouvelle tentative de connexion', { tentative: retries });
            }
            return Math.min(retries * 200, 5000);
          }
        }
      });

      newClient.on('error', (err) => {
        if (ready) {
          logger.warn('Redis connection error', { error: err.message });
          ready = false;
        }
      });

      newClient.on('ready', () => {
        if (!ready) {
          logger.info('Redis client ready (reconnected or first connect)');
        }
        ready = true;
      });

      newClient.on('end', () => {
        ready = false;
      });

      await newClient.connect();
      client = newClient;
      ready = true;
      logger.info('Redis client connected (shared singleton)');
      return client;
    } catch (e) {
      logger.debug('Redis unavailable — features requiring Redis will be degraded', { error: e.message });
      ready = false;
      // Important: ne pas garder un client mort en mémoire
      if (client) {
        try { await client.quit(); } catch {}
        client = null;
      }
      return null;
    } finally {
      connecting = false;
      connectPromise = null;
    }
  })();

  return connectPromise;
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

/**
 * État pour /health : 'pret', 'reconnexion' (client créé ou connexion en cours, Redis injoignable)
 * ou 'absent' (aucune connexion tentée ou configuration refusée).
 */
function etat() {
  if (ready && client) return 'pret';
  return (client || connecting) ? 'reconnexion' : 'absent';
}

// Tenter la connexion au démarrage (non-bloquant)
getRedisClient().catch(() => {});

module.exports = { getRedisClient, isReady, getClient, etat };
