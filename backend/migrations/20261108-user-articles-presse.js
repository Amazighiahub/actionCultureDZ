'use strict';

/**
 * Migration : articles de presse d'un professionnel (titre, journal, lien, date), affichés sur
 * son portfolio public. Liste JSON sur la table user.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const colonnes = await queryInterface.describeTable('user');
    if (!colonnes.articles_presse) {
      await queryInterface.addColumn('user', 'articles_presse', {
        type: Sequelize.JSON, allowNull: true, comment: 'Articles de presse [{titre, media, url, date}]'
      });
    }
  },

  async down(queryInterface) {
    const colonnes = await queryInterface.describeTable('user');
    if (colonnes.articles_presse) await queryInterface.removeColumn('user', 'articles_presse');
  }
};
