/**
 * CronLock - Verrou distribué pour empêcher l'exécution simultanée
 * de tâches cron sur plusieurs instances (PM2 cluster, Docker replicas).
 *
 * Verrou nommé de MySQL (GET_LOCK / RELEASE_LOCK) pris sur UNE connexion réservée pendant toute
 * la tâche (audit V11 BDD-19). Avant : table `cron_locks` créée à l'exécution, verrou de 5 min
 * pour toutes les tâches (la newsletter pouvait repartir sur une autre instance en plein envoi)
 * et, sur une erreur SQL, la tâche passait quand même sans verrou.
 * Maintenant :
 * - le verrou dure exactement le temps de la tâche, quelle qu'elle soit (plus de durée à deviner) ;
 * - si la connexion tombe, MySQL libère le verrou tout seul (plus de verrou orphelin) ;
 * - plus de CREATE TABLE au démarrage d'une tâche ;
 * - si le verrou ne peut pas être demandé (base injoignable, erreur SQL), la tâche est sautée et
 *   l'erreur journalisée : elle repassera à sa prochaine heure.
 */
const logger = require('./logger');

// Longueur maximale d'un nom de verrou MySQL
const LONGUEUR_NOM_MAX = 64;

class CronLock {
  constructor(sequelize) {
    this.sequelize = sequelize;
  }

  /** Nom du verrou : propre à la base (deux bases sur le même serveur ne se bloquent pas) */
  _nomVerrou(jobName) {
    const base = this.sequelize.config?.database || 'app';
    return `${base}:cron:${jobName}`.slice(0, LONGUEUR_NOM_MAX);
  }

  /** Requête sur la connexion réservée (connexion mysql2 du pool de Sequelize) */
  _requete(connexion, sql, valeurs) {
    return new Promise((resolve, reject) => {
      connexion.query({ sql, values: valeurs }, (err, lignes) => (err ? reject(err) : resolve(lignes)));
    });
  }

  /**
   * Tente de prendre le verrou, sans attendre.
   * @param {string} jobName - Nom unique du job
   * @returns {Promise<object|null>} la connexion qui tient le verrou, ou null (déjà pris ou erreur)
   */
  async acquire(jobName) {
    const cm = this.sequelize.connectionManager;
    let connexion;
    try {
      connexion = await cm.getConnection({ type: 'write' });
      const [ligne] = await this._requete(connexion, 'SELECT GET_LOCK(?, 0) AS ok', [this._nomVerrou(jobName)]);
      if (Number(ligne?.ok) === 1) return connexion;
      cm.releaseConnection(connexion);
      return null;
    } catch (err) {
      // Pas de « mode dégradé » : sans verrou certain, la tâche ne tourne pas
      logger.error(`CronLock.acquire(${jobName}) : verrou impossible, tâche sautée :`, err.message);
      if (connexion) await this._abandonner(connexion);
      return null;
    }
  }

  /**
   * Libère le verrou et rend la connexion au pool. Si la libération échoue, la connexion est
   * détruite : MySQL libère alors le verrou de lui-même.
   */
  async release(jobName, connexion) {
    if (!connexion) return;
    try {
      await this._requete(connexion, 'SELECT RELEASE_LOCK(?) AS ok', [this._nomVerrou(jobName)]);
      this.sequelize.connectionManager.releaseConnection(connexion);
    } catch (err) {
      logger.warn(`CronLock.release(${jobName}) :`, err.message);
      await this._abandonner(connexion);
    }
  }

  async _abandonner(connexion) {
    try {
      await this.sequelize.connectionManager.destroyConnection(connexion);
    } catch (_) { /* connexion déjà fermée */ }
  }

  /**
   * Exécute une tâche avec verrou distribué
   * @param {string} jobName
   * @param {Function} taskFn - Async function à exécuter
   * @returns {Promise<boolean>} true si la tâche a tourné, false si elle a été sautée
   */
  async withLock(jobName, taskFn) {
    const connexion = await this.acquire(jobName);
    if (!connexion) {
      logger.info(`CronLock : tâche "${jobName}" déjà en cours ailleurs ou verrou indisponible, sautée`);
      return false;
    }

    try {
      await taskFn();
      return true;
    } finally {
      await this.release(jobName, connexion);
    }
  }
}

module.exports = CronLock;
