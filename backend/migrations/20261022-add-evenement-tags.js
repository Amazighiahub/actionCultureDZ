'use strict';

/**
 * Migration : mots-clés des événements.
 *
 * Les œuvres ont des mots-clés (table tagmotcle + oeuvretags) ; les événements n'en avaient pas.
 * Même table de mots-clés, pour qu'un mot-clé (« Poterie ») relie œuvres et événements.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = (await queryInterface.showAllTables()).map(t => (typeof t === 'string' ? t : t.tableName));
    if (tables.includes('evenementtags')) return;
    await queryInterface.createTable('evenementtags', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      id_evenement: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'evenement', key: 'id_evenement' }, onDelete: 'CASCADE'
      },
      id_tag: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'tagmotcle', key: 'id_tag' }, onDelete: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addIndex('evenementtags', ['id_tag', 'id_evenement'], { unique: true, name: 'evenementtags_tag_evenement_unique' });
    await queryInterface.addIndex('evenementtags', ['id_evenement'], { name: 'evenementtags_evenement' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('evenementtags');
  }
};
