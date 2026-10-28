'use strict';

/**
 * Migration : demandes « C'est mon organisation » (organisation sans responsable, par exemple
 * une maison d'édition reprise de la liste des éditeurs). Un professionnel demande à en devenir
 * responsable ; la modération accepte ou refuse. Rejouable.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [tables] = await queryInterface.sequelize.query(`SELECT TABLE_NAME AS t FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('organisation', 'user', 'organisation_revendication')`);
    const existe = new Set(tables.map(t => t.t));
    if (!existe.has('organisation') || !existe.has('user') || existe.has('organisation_revendication')) return;

    await queryInterface.createTable('organisation_revendication', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      id_organisation: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'organisation', key: 'id_organisation' }, onDelete: 'CASCADE', onUpdate: 'CASCADE'
      },
      id_user: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'user', key: 'id_user' }, onDelete: 'CASCADE', onUpdate: 'CASCADE'
      },
      message: { type: Sequelize.TEXT, allowNull: true },
      statut: { type: Sequelize.ENUM('en_attente', 'acceptee', 'refusee'), allowNull: false, defaultValue: 'en_attente' },
      motif: { type: Sequelize.TEXT, allowNull: true },
      date_creation: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      date_decision: { type: Sequelize.DATE, allowNull: true }
    });
    await queryInterface.addIndex('organisation_revendication', ['statut'], { name: 'idx_revendication_statut' });
    await queryInterface.addIndex('organisation_revendication', ['id_organisation', 'id_user'], { name: 'idx_revendication_org_user' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('organisation_revendication').catch(() => {});
  }
};
