// Attention : la descente supprime la table commentaire_photo et les photos d'avis. Seule la sauvegarde d'avant déploiement les conserve.
'use strict';

/**
 * Migration : table commentaire_photo. Un visiteur joint jusqu'à 3 photos à son avis sur un service
 * (restaurant, gîte…), avec son accord sur les droits. Le texte de l'avis paraît tout de suite ; les
 * photos attendent la validation de l'équipe (statut en_attente → publie ou rejete). Rejouable.
 */
async function existe(queryInterface) {
  const [lignes] = await queryInterface.sequelize.query(`SELECT TABLE_NAME AS t FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commentaire_photo'`);
  return lignes.length > 0;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (await existe(queryInterface)) return;
    await queryInterface.createTable('commentaire_photo', {
      id_photo: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      id_commentaire: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'commentaire', key: 'id_commentaire' }, onDelete: 'CASCADE', onUpdate: 'CASCADE',
      },
      // Auteur de la photo (compte supprimé : la ligne reste sans auteur)
      id_user: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'user', key: 'id_user' }, onDelete: 'SET NULL', onUpdate: 'CASCADE',
      },
      url: { type: Sequelize.STRING(500), allowNull: false },
      statut: { type: Sequelize.ENUM('en_attente', 'publie', 'rejete'), allowNull: false, defaultValue: 'en_attente' },
      // Date à laquelle l'auteur a coché « J'ai le droit de publier ces photos »
      accord_droits_le: { type: Sequelize.DATE, allowNull: false },
      motif_refus: { type: Sequelize.STRING(1000), allowNull: true },
      id_moderateur: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'user', key: 'id_user' }, onDelete: 'SET NULL', onUpdate: 'CASCADE',
      },
      date_moderation: { type: Sequelize.DATE, allowNull: true },
      date_creation: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      date_modification: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('commentaire_photo', ['id_commentaire'], { name: 'idx_commentaire_photo_commentaire' });
    await queryInterface.addIndex('commentaire_photo', ['statut', 'date_creation'], { name: 'idx_commentaire_photo_statut_date' });
  },

  async down(queryInterface) {
    if (await existe(queryInterface)) await queryInterface.dropTable('commentaire_photo');
  },
};
