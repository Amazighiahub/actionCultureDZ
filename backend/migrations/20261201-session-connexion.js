// Attention : la descente supprime la table. Les personnes connectées depuis la montée devront se reconnecter.
'use strict';

/**
 * Migration : table session_connexion, une connexion par appareil.
 * Nouvelle table : aucune donnée existante n'est modifiée (les colonnes refresh_token de user restent lues
 * pour que les personnes déjà connectées le restent). Rejouable.
 */
async function existe(queryInterface) {
  const [lignes] = await queryInterface.sequelize.query(`SELECT TABLE_NAME AS t FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'session_connexion'`);
  return lignes.length > 0;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (await existe(queryInterface)) return;
    await queryInterface.createTable('session_connexion', {
      id_session: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      id_user: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'user', key: 'id_user' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      jeton_hash: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      jeton_precedent_hash: { type: Sequelize.STRING(64), allowNull: true },
      precedent_jusqua: { type: Sequelize.DATE, allowNull: true },
      expire_le: { type: Sequelize.DATE, allowNull: false },
      date_creation: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('session_connexion', ['id_user'], { name: 'idx_session_connexion_user' });
    await queryInterface.addIndex('session_connexion', ['jeton_precedent_hash'], { name: 'idx_session_connexion_precedent' });
    await queryInterface.addIndex('session_connexion', ['expire_le'], { name: 'idx_session_connexion_expire' });
  },

  async down(queryInterface) {
    if (await existe(queryInterface)) await queryInterface.dropTable('session_connexion');
  },
};
