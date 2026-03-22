'use strict';

/**
 * Migration: Nettoyer programme_intervenant + evenementusers
 *
 * - Supprimer colonne id_intervenant (orpheline) + sa FK vers table intervenant
 * - Restaurer FK manquantes sur id_programme et id_user
 * - evenementusers.role_participation: retirer 'organisateur' et 'intervenant'
 */

module.exports = {
  async up(queryInterface) {
    // ================================================================
    // ÉTAPE 1: Supprimer id_intervenant (colonne + FK orphelines)
    // ================================================================
    const [fks] = await queryInterface.sequelize.query(
      "SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE " +
      "WHERE TABLE_NAME='programme_intervenant' AND TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL"
    );

    // Supprimer la FK vers intervenant si elle existe
    const fkIntervenant = fks.find(f => f.REFERENCED_TABLE_NAME === 'intervenant');
    if (fkIntervenant) {
      await queryInterface.sequelize.query(
        `ALTER TABLE programme_intervenant DROP FOREIGN KEY ${fkIntervenant.CONSTRAINT_NAME}`
      );
      console.log(`  ✓ FK ${fkIntervenant.CONSTRAINT_NAME} supprimée`);
    }

    // Supprimer la colonne id_intervenant si elle existe
    const [cols] = await queryInterface.sequelize.query(
      "SHOW COLUMNS FROM programme_intervenant LIKE 'id_intervenant'"
    );
    if (cols.length > 0) {
      await queryInterface.sequelize.query(
        'ALTER TABLE programme_intervenant DROP COLUMN id_intervenant'
      );
      console.log('  ✓ Colonne id_intervenant supprimée');
    }

    // ================================================================
    // ÉTAPE 2: Restaurer les FK manquantes
    // ================================================================
    const fkColumns = fks.map(f => f.COLUMN_NAME);

    if (!fkColumns.includes('id_programme')) {
      await queryInterface.sequelize.query(
        'ALTER TABLE programme_intervenant ADD CONSTRAINT fk_pi_programme FOREIGN KEY (id_programme) REFERENCES programme(id_programme) ON DELETE CASCADE'
      );
      console.log('  ✓ FK id_programme restaurée');
    }

    if (!fkColumns.includes('id_user')) {
      await queryInterface.sequelize.query(
        'ALTER TABLE programme_intervenant ADD CONSTRAINT fk_pi_user FOREIGN KEY (id_user) REFERENCES `user`(id_user) ON DELETE CASCADE'
      );
      console.log('  ✓ FK id_user restaurée');
    }

    // ================================================================
    // ÉTAPE 3: Nettoyer evenementusers.role_participation
    // ================================================================
    await queryInterface.sequelize.query(
      "UPDATE evenementusers SET role_participation = 'participant' WHERE role_participation IN ('organisateur', 'intervenant')"
    );
    await queryInterface.sequelize.query(
      "ALTER TABLE evenementusers MODIFY role_participation ENUM('participant', 'benevole', 'staff') DEFAULT 'participant'"
    );
    console.log('  ✓ evenementusers.role_participation nettoyé');

    console.log('✅ Migration terminée');
  },

  async down(queryInterface) {
    // Restaurer la colonne id_intervenant
    await queryInterface.sequelize.query(
      'ALTER TABLE programme_intervenant ADD COLUMN id_intervenant INT NULL AFTER id_user'
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE programme_intervenant ADD CONSTRAINT programme_intervenant_ibfk_1 FOREIGN KEY (id_intervenant) REFERENCES intervenant(id_intervenant) ON DELETE CASCADE'
    );
    // Restaurer l'ENUM complet
    await queryInterface.sequelize.query(
      "ALTER TABLE evenementusers MODIFY role_participation ENUM('participant', 'organisateur', 'intervenant', 'benevole', 'staff') DEFAULT 'participant'"
    );
    console.log('✅ Rollback terminé');
  }
};
