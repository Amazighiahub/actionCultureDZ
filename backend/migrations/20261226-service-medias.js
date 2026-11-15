// Attention : la descente supprime la table service_media, donc les galeries et menus des services. Seule la sauvegarde d'avant déploiement les conserve.
'use strict';

/**
 * Migration : galerie de photos et menus d'un service (restaurant, hôtel…), accord de la responsable
 * du 2026-11-15. Jusqu'à 10 photos et 3 menus (PDF ou image) par service. La photo actuelle du
 * service (services.photo_url) reste sa première photo : aucune donnée n'est copiée ni modifiée.
 * Rejouable.
 */
async function existe(queryInterface) {
  const [lignes] = await queryInterface.sequelize.query(`SELECT TABLE_NAME AS t FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_media'`);
  return lignes.length > 0;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (await existe(queryInterface)) return;
    await queryInterface.createTable('service_media', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      id_service: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'services', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE',
      },
      // photo : galerie ; menu : carte du restaurant, tarifs d'un hôtel… (PDF ou image)
      type: { type: Sequelize.ENUM('photo', 'menu'), allowNull: false },
      url: { type: Sequelize.STRING(500), allowNull: false },
      // Titre d'un menu (« Carte d'été », « Menu du jour »…)
      nom: { type: Sequelize.STRING(100), allowNull: true },
      ordre: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      id_user: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'user', key: 'id_user' }, onDelete: 'SET NULL', onUpdate: 'CASCADE',
      },
      date_creation: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      date_modification: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('service_media', ['id_service', 'type', 'ordre'], { name: 'idx_service_media_service_type' });
  },

  async down(queryInterface) {
    if (await existe(queryInterface)) await queryInterface.dropTable('service_media');
  },
};
