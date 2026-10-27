'use strict';

/**
 * Migration : index de la base.
 * 1. Notifications d'un membre, les plus récentes d'abord : index (id_user, date_creation)
 *    (sans lui, la liste était triée en mémoire).
 * 2. Index en double EXACT (mêmes colonnes, dans le même ordre) : on garde le plus fort
 *    (clé primaire, puis unique) et on retire les autres. Restes d'anciennes synchronisations :
 *    ils ralentissaient chaque écriture sans rien apporter. Les index « préfixes » ne sont pas
 *    touchés. Un index qu'une clé étrangère exige encore est laissé (erreur 1553 ignorée).
 */
module.exports = {
  async up(queryInterface) {
    const q = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements });

    // 1. Index des notifications
    const [notif] = await q(`
      SELECT INDEX_NAME FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification'
      GROUP BY INDEX_NAME HAVING GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) LIKE 'id_user,date_creation%'`);
    const [table] = await q("SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification'");
    if (table.length && !notif.length) {
      await q('CREATE INDEX idx_notification_user_date ON notification (id_user, date_creation)');
    }

    // 2. Doublons exacts
    const [index] = await q(`
      SELECT TABLE_NAME AS t, INDEX_NAME AS nom, MIN(NON_UNIQUE) AS non_unique,
             GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS colonnes
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND INDEX_TYPE = 'BTREE'
      GROUP BY TABLE_NAME, INDEX_NAME`);
    const groupes = new Map();
    for (const i of index) {
      const cle = `${i.t}|${i.colonnes}`;
      if (!groupes.has(cle)) groupes.set(cle, []);
      groupes.get(cle).push(i);
    }
    let retires = 0;
    for (const liste of groupes.values()) {
      if (liste.length < 2) continue;
      // Le plus fort d'abord : clé primaire, puis unique, puis le nom le plus court
      liste.sort((a, b) => (b.nom === 'PRIMARY') - (a.nom === 'PRIMARY')
        || Number(a.non_unique) - Number(b.non_unique) || a.nom.length - b.nom.length);
      for (const doublon of liste.slice(1)) {
        try {
          await q(`ALTER TABLE \`${doublon.t}\` DROP INDEX \`${doublon.nom}\``);
          retires++;
        } catch (e) {
          // 1553 : nécessaire à une clé étrangère ; on le garde
          if (!/1553|needed in a foreign key/i.test(`${e.original?.errno} ${e.message}`)) throw e;
        }
      }
    }
    if (retires) console.log(`${retires} index en double retirés`);
  },

  async down(queryInterface) {
    const [notif] = await queryInterface.sequelize.query(
      "SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification' AND INDEX_NAME = 'idx_notification_user_date'"
    );
    if (notif.length) await queryInterface.sequelize.query('DROP INDEX idx_notification_user_date ON notification');
  }
};
