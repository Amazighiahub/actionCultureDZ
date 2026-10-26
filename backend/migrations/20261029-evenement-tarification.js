'use strict';

/**
 * Migration : tarif selon le profil du participant.
 *
 * - evenement.tarification : { mode: gratuit | payant | profil, profils?, partiel_pourcent? }
 *   (vide pour les anciens événements : leur tarif reste lu depuis la colonne tarif)
 * - evenementusers.montant_du : montant calculé à l'inscription (profil, présence, nombre de personnes)
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const evenement = await queryInterface.describeTable('evenement');
    if (!evenement.tarification) {
      await queryInterface.addColumn('evenement', 'tarification', { type: Sequelize.JSON, allowNull: true, defaultValue: null });
    }
    const inscriptions = await queryInterface.describeTable('evenementusers');
    if (!inscriptions.montant_du) {
      await queryInterface.addColumn('evenementusers', 'montant_du', { type: Sequelize.DECIMAL(10, 2), allowNull: true, defaultValue: null });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('evenementusers', 'montant_du');
    await queryInterface.removeColumn('evenement', 'tarification');
  }
};
