// Attention : la descente supprime la table, donc les abonnés sans compte seraient perdus.
'use strict';

/**
 * Migration : table newsletter_abonne, pour s'abonner à la newsletter avec son e-mail seul.
 * Nouvelle table : aucune donnée existante n'est modifiée. Rejouable.
 */
async function existe(queryInterface) {
  const [lignes] = await queryInterface.sequelize.query(`SELECT TABLE_NAME AS t FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'newsletter_abonne'`);
  return lignes.length > 0;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (await existe(queryInterface)) return;
    await queryInterface.createTable('newsletter_abonne', {
      id_abonne: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      email: { type: Sequelize.STRING(254), allowNull: false, unique: true },
      statut: { type: Sequelize.ENUM('en_attente', 'actif'), allowNull: false, defaultValue: 'en_attente' },
      date_demande: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      date_confirmation: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('newsletter_abonne', ['statut'], { name: 'idx_newsletter_abonne_statut' });
  },

  async down(queryInterface) {
    if (await existe(queryInterface)) await queryInterface.dropTable('newsletter_abonne');
  },
};
