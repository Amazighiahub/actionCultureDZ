'use strict';

/**
 * Migration : historique des textes d'un lieu (table historique_lieu).
 * Chaque modification du nom, de la description, de l'histoire ou d'une section garde
 * l'ancienne valeur : l'administration peut revenir à une version précédente.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('historique_lieu')) return;
    await queryInterface.createTable('historique_lieu', {
      id_historique: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      id_lieu: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'lieu', key: 'id_lieu' }, onDelete: 'CASCADE', onUpdate: 'CASCADE'
      },
      champ: { type: Sequelize.STRING(40), allowNull: false },
      ancienne_valeur: { type: Sequelize.JSON, allowNull: true },
      nouvelle_valeur: { type: Sequelize.JSON, allowNull: true },
      id_user: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'user', key: 'id_user' }, onDelete: 'SET NULL', onUpdate: 'CASCADE'
      },
      id_historique_restaure: { type: Sequelize.INTEGER, allowNull: true },
      date_creation: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addIndex('historique_lieu', ['id_lieu', 'date_creation']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('historique_lieu');
  }
};
