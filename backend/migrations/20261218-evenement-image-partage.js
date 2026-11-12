'use strict';

/**
 * Migration : image de partage d'un événement (evenement.image_partage_url).
 *
 * Image facultative, carrée de préférence, montrée seulement dans l'aperçu d'un lien partagé (Facebook,
 * WhatsApp, Messenger…). L'affiche (image_url) reste celle de la page et des listes. Vide : l'aperçu
 * reprend l'affiche, comme avant.
 *
 * Aucune donnée n'est modifiée. Rejouable.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    if ((await queryInterface.describeTable('evenement')).image_partage_url) return;
    await queryInterface.addColumn('evenement', 'image_partage_url', {
      type: Sequelize.STRING(500),
      allowNull: true,
      after: 'image_url'
    });
  },

  async down(queryInterface) {
    if (!(await queryInterface.describeTable('evenement')).image_partage_url) return;
    await queryInterface.removeColumn('evenement', 'image_partage_url');
  }
};
