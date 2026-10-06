'use strict';

/**
 * Migration : commune de rattachement des comptes et des intervenants.
 *
 * - user.id_commune : commune de résidence (obligatoire à l'inscription d'un
 *   professionnel, facultative pour un visiteur) ; la daïra se déduit de la commune.
 * - intervenant.id_commune : commune d'ORIGINE (naissance) de la personne.
 *
 * Sert à proposer les professionnels proches (même commune, puis même daïra,
 * puis même wilaya) et à situer une œuvre par son auteur.
 */
const TABLES = ['user', 'intervenant'];

module.exports = {
  async up(queryInterface, Sequelize) {
    for (const table of TABLES) {
      const columns = await queryInterface.describeTable(table);
      if (columns.id_commune) {
        console.log(`ℹ️  ${table}.id_commune existe déjà — ignoré`);
        continue;
      }
      await queryInterface.addColumn(table, 'id_commune', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'communes', key: 'id_commune' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: table === 'user' ? 'Commune de résidence' : 'Commune d\'origine (naissance)'
      });
      await queryInterface.addIndex(table, ['id_commune'], { name: `idx_${table}_id_commune` });
      console.log(`✅ ${table}.id_commune ajoutée`);
    }
  },

  async down(queryInterface) {
    for (const table of TABLES) {
      const columns = await queryInterface.describeTable(table);
      if (!columns.id_commune) continue;
      await queryInterface.removeIndex(table, `idx_${table}_id_commune`).catch(() => {});
      await queryInterface.removeColumn(table, 'id_commune');
    }
  }
};
