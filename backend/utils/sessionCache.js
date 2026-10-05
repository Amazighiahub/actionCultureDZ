/**
 * Cache Redis de la session utilisateur (lu par authMiddleware, TTL 15 min).
 * À invalider après tout changement de statut, de rôle ou de mot de passe,
 * sinon l'ancien état reste appliqué jusqu'à expiration du cache.
 */
const { getClient: getRedisClient } = require('./redisClient');
const logger = require('./logger');

const USER_SESSION_PREFIX = 'user:session:';

async function invalidateUserSession(userIds) {
  const ids = (Array.isArray(userIds) ? userIds : [userIds]).filter(id => id != null);
  const redis = getRedisClient();
  if (!redis || ids.length === 0) return;
  try {
    await redis.del(ids.map(id => `${USER_SESSION_PREFIX}${id}`));
  } catch (e) {
    logger.debug('Session cache invalidate skip:', e.message);
  }
}

module.exports = { USER_SESSION_PREFIX, invalidateUserSession };
