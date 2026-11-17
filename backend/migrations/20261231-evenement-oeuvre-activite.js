// Attention : la descente supprime la colonne id_programme, donc l'activité choisie pour chaque œuvre ou article (le rattachement à l'événement reste).
'use strict';

/**
 * Migration : article ou œuvre rattaché à une activité du programme (demande de la responsable,
 * 2026-11-17 : le compte rendu d'une activité doit apparaître sous cette activité). Colonne
 * evenement_oeuvre.id_programme, vide par défaut (rattaché à tout l'événement). Si l'activité est
 * supprimée, le rattachement à l'événement reste (SET NULL). Aucune donnée existante n'est modifiée. Rejouable.
 */
const TABLE = 'evenement_oeuvre';
const CONTRAINTE = 'fk_evenement_oeuvre_programme';

async function aColonne(queryInterface) {
  const [lignes] = await queryInterface.sequelize.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${TABLE}' AND COLUMN_NAME = 'id_programme'`);
  return lignes.length > 0;
}

async function aContrainte(queryInterface) {
  const [lignes] = await queryInterface.sequelize.query(`SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${TABLE}' AND CONSTRAINT_NAME = '${CONTRAINTE}'`);
  return lignes.length > 0;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await aColonne(queryInterface))) {
      await queryInterface.addColumn(TABLE, 'id_programme', { type: Sequelize.INTEGER, allowNull: true });
    }
    if (!(await aContrainte(queryInterface))) {
      // La clé étrangère crée aussi l'index sur id_programme
      await queryInterface.addConstraint(TABLE, {
        fields: ['id_programme'],
        type: 'foreign key',
        name: CONTRAINTE,
        references: { table: 'programme', field: 'id_programme' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
    }
  },

  async down(queryInterface) {
    if (await aContrainte(queryInterface)) await queryInterface.removeConstraint(TABLE, CONTRAINTE);
    if (await aColonne(queryInterface)) {
      const [index] = await queryInterface.sequelize.query(`SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${TABLE}' AND INDEX_NAME = '${CONTRAINTE}'`);
      if (index.length) await queryInterface.removeIndex(TABLE, CONTRAINTE);
      await queryInterface.removeColumn(TABLE, 'id_programme');
    }
  }
};
