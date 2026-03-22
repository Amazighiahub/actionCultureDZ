/**
 * ViewCounter - Buffer les incréments de vues dans Redis puis flush en batch
 *
 * Problème résolu : 100 requêtes simultanées sur la même page = 100 UPDATEs
 * séquentiels sur la même ligne = lock contention.
 *
 * Solution : INCR atomique dans Redis, puis flush périodique (30s) avec un
 * seul UPDATE CASE WHEN par table.
 *
 * Fallback : buffer en mémoire si Redis est indisponible.
 */
const { getClient: getRedisClient } = require('./redisClient');
const logger = require('./logger');

const FLUSH_INTERVAL_MS = 30000; // 30 secondes
const REDIS_KEY_PREFIX = 'views:';

class ViewCounter {
  constructor() {
    this.localBuffer = new Map();
    this._models = null;
    this._flushing = false;

    this._flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
    if (this._flushTimer.unref) this._flushTimer.unref();
  }

  /**
   * Injecter les modèles Sequelize (appelé une fois au démarrage)
   */
  setModels(models) {
    this._models = models;
  }

  /**
   * Incrémente le compteur de vues (non-bloquant, ~0ms)
   * @param {string} entityType - 'oeuvre', 'evenement', 'lieu', 'patrimoine'
   * @param {number|string} entityId
   */
  async increment(entityType, entityId) {
    const key = `${REDIS_KEY_PREFIX}${entityType}:${entityId}`;
    const redis = getRedisClient();

    if (redis) {
      try {
        await redis.incr(key);
        return;
      } catch (_) { /* fallback mémoire */ }
    }

    const count = this.localBuffer.get(key) || 0;
    this.localBuffer.set(key, count + 1);
  }

  /**
   * Flush les compteurs vers la DB (appelé toutes les 30s)
   */
  async flush() {
    if (this._flushing || !this._models) return;
    this._flushing = true;

    try {
      const entries = await this._collectEntries();
      if (entries.length === 0) return;

      // Grouper par type d'entité
      const byType = new Map();
      for (const [key, count] of entries) {
        const parts = key.replace(REDIS_KEY_PREFIX, '').split(':');
        const type = parts[0];
        const id = parseInt(parts[1]);
        if (!type || isNaN(id) || count <= 0) continue;

        if (!byType.has(type)) byType.set(type, []);
        byType.get(type).push({ id, count: parseInt(count) });
      }

      // 1 UPDATE CASE WHEN par type d'entité
      for (const [type, items] of byType) {
        await this._flushType(type, items);
      }
    } catch (error) {
      logger.error('ViewCounter flush error:', error.message);
    } finally {
      this._flushing = false;
    }
  }

  /**
   * Collecte les entrées depuis Redis ou le buffer local
   * @private
   */
  async _collectEntries() {
    const redis = getRedisClient();

    if (redis) {
      try {
        const keys = await redis.keys(`${REDIS_KEY_PREFIX}*`);
        if (keys.length === 0) return [];

        const pipeline = redis.multi();
        for (const key of keys) {
          pipeline.getDel(key); // GET + DELETE atomique (Redis 6.2+)
        }
        const values = await pipeline.exec();

        return keys.map((key, i) => [key, values[i]]).filter(([, v]) => v && parseInt(v) > 0);
      } catch (_) { /* fallback */ }
    }

    // Fallback : buffer mémoire
    const entries = Array.from(this.localBuffer.entries());
    this.localBuffer.clear();
    return entries;
  }

  /**
   * Flush un type d'entité vers la DB avec un seul UPDATE
   * @private
   */
  async _flushType(type, items) {
    const config = this._getTypeConfig(type);
    if (!config) {
      logger.debug(`ViewCounter: type inconnu "${type}", skip`);
      return;
    }

    const { model, pkColumn, viewColumn } = config;
    if (!model) return;

    try {
      const cases = items.map(i => `WHEN ${i.id} THEN \`${viewColumn}\` + ${i.count}`).join(' ');
      const ids = items.map(i => i.id).join(',');

      await model.sequelize.query(
        `UPDATE \`${model.tableName}\` SET \`${viewColumn}\` = CASE \`${pkColumn}\` ${cases} END WHERE \`${pkColumn}\` IN (${ids})`,
        { type: 'UPDATE' }
      );

      const totalViews = items.reduce((sum, i) => sum + i.count, 0);
      logger.debug(`ViewCounter: flushed ${totalViews} vues for ${items.length} ${type}(s)`);
    } catch (error) {
      logger.error(`ViewCounter flush ${type} error:`, error.message);
    }
  }

  /**
   * Configuration par type d'entité
   * @private
   */
  _getTypeConfig(type) {
    if (!this._models) return null;

    const configs = {
      oeuvre: {
        model: this._models.Oeuvre,
        pkColumn: 'id_oeuvre',
        viewColumn: 'nb_vues'
      },
      evenement: {
        model: this._models.Evenement,
        pkColumn: 'id_evenement',
        viewColumn: 'nb_vues'
      },
      lieu: {
        model: this._models.Lieu,
        pkColumn: 'id_lieu',
        viewColumn: 'nb_vues'
      }
    };

    return configs[type] || null;
  }

  /**
   * Arrêt propre (flush final + stop timer)
   */
  async shutdown() {
    clearInterval(this._flushTimer);
    await this.flush();
  }
}

module.exports = new ViewCounter();
