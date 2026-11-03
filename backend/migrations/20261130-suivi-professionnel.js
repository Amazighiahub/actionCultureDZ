// Attention : la descente supprime la table, donc les abonnements aux professionnels seraient perdus.
'use strict';

/**
 * Migration : table suivi_professionnel (bouton « Suivre » sur la page d'un professionnel).
 * Nouvelle table : aucune donnée existante n'est modifiée. Rejouable.
 */
async function existe(queryInterface) {
  const [lignes] = await queryInterface.sequelize.query(`SELECT TABLE_NAME AS t FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'suivi_professionnel'`);
  return lignes.length > 0;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (await existe(queryInterface)) return;
    const refUser = {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'user', key: 'id_user' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    };
    await queryInterface.createTable('suivi_professionnel', {
      id_suivi: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      id_user: refUser,
      id_professionnel: refUser,
      date_creation: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('suivi_professionnel', ['id_user', 'id_professionnel'], { unique: true, name: 'uk_suivi_professionnel' });
    await queryInterface.addIndex('suivi_professionnel', ['id_professionnel'], { name: 'idx_suivi_professionnel_pro' });
  },

  async down(queryInterface) {
    if (await existe(queryInterface)) await queryInterface.dropTable('suivi_professionnel');
  },
};
