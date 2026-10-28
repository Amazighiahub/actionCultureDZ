'use strict';

/**
 * Migration : avis (commentaire + note de 1 à 5) sur les services.
 * Ajoute commentaire.id_service → services.id (suppression du service = suppression de ses avis),
 * avec un index. Rejouable : ne fait rien si la colonne existe déjà.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const q = (sql) => queryInterface.sequelize.query(sql);
    const [tables] = await q(`SELECT TABLE_NAME AS t FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('commentaire', 'services')`);
    if (tables.length < 2) return;

    const colonnes = await queryInterface.describeTable('commentaire');
    if (!colonnes.id_service) {
      await queryInterface.addColumn('commentaire', 'id_service', {
        type: Sequelize.INTEGER,
        allowNull: true,
        after: 'id_evenement'
      });
    }

    const [fk] = await q(`SELECT 1 FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commentaire'
        AND COLUMN_NAME = 'id_service' AND REFERENCED_TABLE_NAME = 'services'`);
    if (!fk.length) {
      await queryInterface.addConstraint('commentaire', {
        fields: ['id_service'],
        type: 'foreign key',
        name: 'fk_commentaire_service',
        references: { table: 'services', field: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
    }

    // L'index de la clé étrangère suffit pour « les avis d'un service » ;
    // on le nomme explicitement s'il n'existe pas encore.
    const [index] = await q(`SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commentaire' AND COLUMN_NAME = 'id_service' AND SEQ_IN_INDEX = 1`);
    if (!index.length) {
      await queryInterface.addIndex('commentaire', ['id_service'], { name: 'idx_commentaire_service' });
    }
  },

  async down(queryInterface) {
    const colonnes = await queryInterface.describeTable('commentaire');
    if (!colonnes.id_service) return;
    const [fk] = await queryInterface.sequelize.query(`SELECT CONSTRAINT_NAME AS nom FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commentaire'
        AND COLUMN_NAME = 'id_service' AND REFERENCED_TABLE_NAME IS NOT NULL`);
    for (const { nom } of fk) await queryInterface.removeConstraint('commentaire', nom);
    await queryInterface.removeColumn('commentaire', 'id_service');
  }
};
