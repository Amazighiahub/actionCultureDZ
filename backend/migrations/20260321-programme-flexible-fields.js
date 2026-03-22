'use strict';

/**
 * Migration: Rendre le programme flexible
 *
 * - titre : NOT NULL → NULL (optionnel)
 * - description : NULL → NOT NULL (requis, c'est le champ principal)
 * - Les deux sont des colonnes JSON multilingues { fr: "...", ar: "...", en: "..." }
 */

module.exports = {
  async up(queryInterface) {
    // Remplir les descriptions NULL existantes avant de passer en NOT NULL
    await queryInterface.sequelize.query(
      `UPDATE programme SET description = JSON_OBJECT('fr', '') WHERE description IS NULL`
    );
    console.log('  ✓ Descriptions NULL remplies');

    // titre : NOT NULL → NULL
    await queryInterface.sequelize.query(
      'ALTER TABLE programme MODIFY COLUMN titre JSON NULL'
    );
    console.log('  ✓ titre → NULL (optionnel)');

    // description : NULL → NOT NULL
    await queryInterface.sequelize.query(
      'ALTER TABLE programme MODIFY COLUMN description JSON NOT NULL'
    );
    console.log('  ✓ description → NOT NULL (requis)');

    console.log('✅ Migration terminée');
  },

  async down(queryInterface) {
    // Restaurer : titre NOT NULL, description NULL
    await queryInterface.sequelize.query(
      `UPDATE programme SET titre = JSON_OBJECT('fr', '') WHERE titre IS NULL`
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE programme MODIFY COLUMN titre JSON NOT NULL'
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE programme MODIFY COLUMN description JSON NULL'
    );
    console.log('✅ Rollback terminé');
  }
};
