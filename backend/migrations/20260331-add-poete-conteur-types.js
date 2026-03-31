'use strict';

module.exports = {
  async up(queryInterface) {
    const [existing] = await queryInterface.sequelize.query(
      "SELECT id_type_user FROM type_user WHERE id_type_user IN (14, 15)"
    );

    if (!existing.find(e => e.id_type_user === 14)) {
      await queryInterface.sequelize.query(
        "INSERT INTO type_user (id_type_user, nom_type) VALUES (14, '{\"fr\": \"Poète\", \"ar\": \"شاعر\", \"en\": \"Poet\"}')"
      );
      console.log('  ✓ Type 14 Poète ajouté');
    }

    if (!existing.find(e => e.id_type_user === 15)) {
      await queryInterface.sequelize.query(
        "INSERT INTO type_user (id_type_user, nom_type) VALUES (15, '{\"fr\": \"Conteur\", \"ar\": \"حكواتي\", \"en\": \"Storyteller\"}')"
      );
      console.log('  ✓ Type 15 Conteur ajouté');
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "DELETE FROM type_user WHERE id_type_user IN (14, 15)"
    );
  }
};
