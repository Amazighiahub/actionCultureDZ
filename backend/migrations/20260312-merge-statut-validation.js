'use strict';

/**
 * Migration : Merge statut et statut_validation en un seul champ statut
 * - statut_validation 'valide' -> statut 'actif'
 * - statut_validation 'en_attente' -> statut 'en_attente_validation'
 * - statut_validation 'rejete' -> statut 'rejete'
 * - statut_validation 'suspendu' -> statut 'suspendu'
 * Puis suppression de la colonne statut_validation
 */
module.exports = {
  async up(queryInterface) {
    // 1. Étendre l'ENUM statut pour inclure 'rejete'
    await queryInterface.sequelize.query(`
      ALTER TABLE user 
      MODIFY COLUMN statut ENUM('actif', 'en_attente_validation', 'rejete', 'inactif', 'suspendu', 'banni')
      DEFAULT 'actif'
    `);

    // 2. Mettre à jour statut selon statut_validation (si la colonne existe)
    try {
      await queryInterface.sequelize.query(`
        UPDATE user 
        SET statut = CASE 
          WHEN statut_validation = 'valide' THEN 'actif'
          WHEN statut_validation = 'en_attente' THEN 'en_attente_validation'
          WHEN statut_validation = 'rejete' THEN 'rejete'
          WHEN statut_validation = 'suspendu' THEN 'suspendu'
          ELSE statut
        END
        WHERE statut_validation IS NOT NULL
      `);
    } catch (e) {
      console.warn('Migration: statut_validation may not exist or already migrated:', e.message);
    }

    // 3. Supprimer statut_validation (skip si déjà supprimée)
    const userTable = await queryInterface.describeTable('user');
    if (userTable.statut_validation) {
      await queryInterface.removeColumn('user', 'statut_validation');
    } else {
      console.log('  ⏭ statut_validation déjà supprimée');
    }
  },

  async down(queryInterface) {
    // 1. Recréer la colonne statut_validation
    await queryInterface.addColumn('user', 'statut_validation', {
      type: 'ENUM("en_attente", "valide", "rejete", "suspendu")',
      allowNull: true,
      comment: 'Statut de validation pour les professionnels (déprécié, migré vers statut)'
    });

    // 2. Migrer statut vers statut_validation
    await queryInterface.sequelize.query(`
      UPDATE user 
      SET statut_validation = CASE 
        WHEN statut = 'actif' THEN 'valide'
        WHEN statut = 'en_attente_validation' THEN 'en_attente'
        WHEN statut = 'rejete' THEN 'rejete'
        WHEN statut = 'suspendu' THEN 'suspendu'
        ELSE NULL
      END
    `);

    // 3. Rétablir l'ENUM statut sans 'rejete'
    await queryInterface.sequelize.query(`
      ALTER TABLE user 
      MODIFY COLUMN statut ENUM('actif', 'en_attente_validation', 'inactif', 'suspendu', 'banni')
      DEFAULT 'actif'
    `);
  }
};
