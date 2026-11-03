'use strict';

/**
 * Migration : types d'activité « presentation » et « pause », proposés par le formulaire mais refusés
 * par le serveur et la base. Aucune donnée existante ne change. Rejouable.
 * Descente : les activités de ces deux types passent en « autre ».
 */
const AVANT = ['conference', 'atelier', 'spectacle', 'exposition', 'visite', 'degustation', 'projection', 'concert', 'lecture', 'debat', 'formation', 'ceremonie', 'autre'];
const AJOUTS = ['presentation', 'pause'];
const enumSql = (valeurs) => `ENUM(${valeurs.map(v => `'${v}'`).join(', ')})`;

async function typeColonne(queryInterface) {
  const [lignes] = await queryInterface.sequelize.query(`SELECT COLUMN_TYPE AS t FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'programme' AND COLUMN_NAME = 'type_activite'`);
  return lignes[0]?.t || null;
}

module.exports = {
  async up(queryInterface) {
    const type = await typeColonne(queryInterface);
    if (!type || type.includes('presentation')) return;
    await queryInterface.sequelize.query(
      `ALTER TABLE programme MODIFY type_activite ${enumSql([...AVANT, ...AJOUTS])} DEFAULT 'autre'`
    );
  },

  async down(queryInterface) {
    const type = await typeColonne(queryInterface);
    if (!type || !type.includes('presentation')) return;
    await queryInterface.sequelize.query(
      `UPDATE programme SET type_activite = 'autre' WHERE type_activite IN ('presentation', 'pause')`
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE programme MODIFY type_activite ${enumSql(AVANT)} DEFAULT 'autre'`
    );
  }
};
