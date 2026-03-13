/**
 * CronLock - Verrou distribué pour empêcher l'exécution simultanée
 * de tâches cron sur plusieurs instances (PM2 cluster, Docker replicas).
 *
 * Utilise une table DB `cron_locks` avec un verrou advisory MySQL.
 * Si la table n'existe pas, les jobs s'exécutent sans verrou (mode dégradé).
 */

class CronLock {
  constructor(sequelize) {
    this.sequelize = sequelize;
    this.tableReady = null; // lazy init
  }

  /**
   * Crée la table cron_locks si elle n'existe pas
   */
  async _ensureTable() {
    if (this.tableReady) return this.tableReady;

    this.tableReady = this.sequelize.query(`
      CREATE TABLE IF NOT EXISTS cron_locks (
        job_name VARCHAR(100) PRIMARY KEY,
        locked_by VARCHAR(255) NOT NULL,
        locked_at DATETIME NOT NULL,
        expires_at DATETIME NOT NULL
      ) ENGINE=InnoDB
    `).then(() => true).catch((err) => {
      console.warn('⚠️ CronLock: impossible de créer la table cron_locks:', err.message);
      return false;
    });

    return this.tableReady;
  }

  /**
   * Tente d'acquérir un verrou pour un job donné.
   * @param {string} jobName - Nom unique du job
   * @param {number} ttlSeconds - Durée max du verrou (défaut: 300s / 5min)
   * @returns {boolean} true si le verrou a été acquis
   */
  async acquire(jobName, ttlSeconds = 300) {
    const ready = await this._ensureTable();
    if (!ready) return true; // mode dégradé: on laisse passer

    const instanceId = `${process.env.HOSTNAME || 'local'}-${process.pid}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    try {
      // Supprimer les verrous expirés
      await this.sequelize.query(
        'DELETE FROM cron_locks WHERE job_name = :jobName AND expires_at < :now',
        { replacements: { jobName, now }, type: this.sequelize.QueryTypes.DELETE }
      );

      // Tenter l'insertion (échoue si le verrou existe déjà = une autre instance l'a)
      await this.sequelize.query(
        'INSERT INTO cron_locks (job_name, locked_by, locked_at, expires_at) VALUES (:jobName, :lockedBy, :now, :expiresAt)',
        { replacements: { jobName, lockedBy: instanceId, now, expiresAt }, type: this.sequelize.QueryTypes.INSERT }
      );

      return true;
    } catch (err) {
      // ER_DUP_ENTRY = une autre instance a le verrou
      if (err.original?.code === 'ER_DUP_ENTRY') {
        return false;
      }
      console.warn(`⚠️ CronLock.acquire(${jobName}):`, err.message);
      return true; // mode dégradé
    }
  }

  /**
   * Libère le verrou après exécution
   */
  async release(jobName) {
    try {
      await this.sequelize.query(
        'DELETE FROM cron_locks WHERE job_name = :jobName AND locked_by = :lockedBy',
        {
          replacements: {
            jobName,
            lockedBy: `${process.env.HOSTNAME || 'local'}-${process.pid}`
          },
          type: this.sequelize.QueryTypes.DELETE
        }
      );
    } catch (err) {
      console.warn(`⚠️ CronLock.release(${jobName}):`, err.message);
    }
  }

  /**
   * Exécute une tâche avec verrou distribué
   * @param {string} jobName
   * @param {Function} taskFn - Async function à exécuter
   * @param {number} ttlSeconds
   */
  async withLock(jobName, taskFn, ttlSeconds = 300) {
    const acquired = await this.acquire(jobName, ttlSeconds);
    if (!acquired) {
      console.log(`🔒 CronLock: job "${jobName}" déjà en cours sur une autre instance, skip.`);
      return;
    }

    try {
      await taskFn();
    } finally {
      await this.release(jobName);
    }
  }
}

module.exports = CronLock;
