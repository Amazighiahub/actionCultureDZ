// Attention : la descente supprime la table, donc les appareils abonnés devront réactiver les notifications.
'use strict';

/**
 * Migration : table push_abonnement, un appareil par ligne pour les notifications sur le téléphone.
 * Nouvelle table : aucune donnée existante n'est modifiée. Rejouable.
 */
async function existe(queryInterface) {
  const [lignes] = await queryInterface.sequelize.query(`SELECT TABLE_NAME AS t FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'push_abonnement'`);
  return lignes.length > 0;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (await existe(queryInterface)) return;
    await queryInterface.createTable('push_abonnement', {
      id_abonnement: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      id_user: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'user', key: 'id_user' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      endpoint: { type: Sequelize.STRING(512), allowNull: false, unique: true },
      p256dh: { type: Sequelize.STRING(255), allowNull: false },
      auth: { type: Sequelize.STRING(255), allowNull: false },
      date_creation: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('push_abonnement', ['id_user'], { name: 'idx_push_abonnement_user' });
  },

  async down(queryInterface) {
    if (await existe(queryInterface)) await queryInterface.dropTable('push_abonnement');
  },
};
