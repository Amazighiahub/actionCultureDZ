'use strict';

/**
 * Migration : Ajouter le suivi du consentement RGPD (Art. 7)
 *
 * Pourquoi :
 * - Art. 7 RGPD exige que le responsable de traitement puisse PROUVER
 *   que l'utilisateur a donné son consentement (date + IP)
 * - Les colonnes `accepte_conditions` et `accepte_newsletter` existent déjà
 *   mais on ne sait pas QUAND ni de QUELLE IP elles ont été acceptées
 *
 * Colonnes ajoutées :
 * - date_acceptation_conditions : moment exact du consentement
 * - ip_acceptation_conditions : adresse IP lors du consentement
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Vérifier si les colonnes existent déjà
    const [columns] = await queryInterface.sequelize.query(
      "SHOW COLUMNS FROM `user` WHERE Field IN ('date_acceptation_conditions', 'ip_acceptation_conditions')"
    );

    if (columns.length === 0) {
      await queryInterface.addColumn('user', 'date_acceptation_conditions', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date et heure de l\'acceptation des conditions (preuve RGPD Art. 7)'
      });

      await queryInterface.addColumn('user', 'ip_acceptation_conditions', {
        type: Sequelize.STRING(45),
        allowNull: true,
        comment: 'Adresse IP lors de l\'acceptation des conditions (preuve RGPD Art. 7)'
      });

      // Remplir les colonnes pour les utilisateurs existants
      // On utilise date_creation comme approximation (mieux que NULL)
      await queryInterface.sequelize.query(
        "UPDATE `user` SET date_acceptation_conditions = date_creation WHERE accepte_conditions = true AND date_acceptation_conditions IS NULL"
      );

      console.log('✅ Colonnes date_acceptation_conditions et ip_acceptation_conditions ajoutées à user');
    } else {
      console.log('ℹ️ Colonnes de suivi consentement déjà présentes');
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeColumn('user', 'date_acceptation_conditions');
      await queryInterface.removeColumn('user', 'ip_acceptation_conditions');
      console.log('✅ Colonnes de suivi consentement supprimées');
    } catch (e) {
      console.log('ℹ️ Colonnes déjà supprimées');
    }
  }
};
