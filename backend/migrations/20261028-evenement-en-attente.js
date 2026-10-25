'use strict';

/**
 * Migration : statut « en_attente » des événements.
 *
 * Un professionnel qui touche « Publier l'événement » l'envoie à la validation (en_attente) ;
 * l'administration le publie ou le refuse (retour en brouillon, avec un motif).
 */
const AVANT = ['brouillon', 'publie', 'planifie', 'en_cours', 'termine', 'annule', 'reporte'];
const APRES = ['brouillon', 'en_attente', 'publie', 'planifie', 'en_cours', 'termine', 'annule', 'reporte'];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('evenement', 'statut', {
      type: Sequelize.ENUM(...APRES), allowNull: true, defaultValue: 'brouillon'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query("UPDATE evenement SET statut = 'brouillon' WHERE statut = 'en_attente'");
    await queryInterface.changeColumn('evenement', 'statut', {
      type: Sequelize.ENUM(...AVANT), allowNull: true, defaultValue: 'brouillon'
    });
  }
};
