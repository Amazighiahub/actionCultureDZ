'use strict';

/**
 * Migration: Remove duplicate "Art" type (ID 8)
 * Keep "Œuvre d'Art" (ID 6) as the single art type.
 */
module.exports = {
  async up(queryInterface) {
    // Migrate oeuvres from type 8 to type 6
    await queryInterface.sequelize.query(
      "UPDATE oeuvre SET id_type_oeuvre = 6 WHERE id_type_oeuvre = 8"
    );

    // Delete type 8
    const [rows] = await queryInterface.sequelize.query(
      "SELECT id_type_oeuvre FROM type_oeuvre WHERE id_type_oeuvre = 8"
    );
    if (rows.length > 0) {
      await queryInterface.sequelize.query(
        "DELETE FROM type_oeuvre WHERE id_type_oeuvre = 8"
      );
      console.log('  ✓ Type 8 "Art" supprimé, oeuvres migrées vers type 6');
    } else {
      console.log('  ⏭ Type 8 déjà supprimé');
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "INSERT IGNORE INTO type_oeuvre (id_type_oeuvre, nom_type) VALUES (8, '{\"fr\": \"Art\"}')"
    );
  }
};
