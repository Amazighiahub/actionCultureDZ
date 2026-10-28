'use strict';

/**
 * Migration : adresses des organisations fusionnées.
 * Quand une organisation en double est fusionnée dans une autre, sa ligne est supprimée ;
 * organisation_redirection garde « ancien numéro → organisation gardée » pour que les liens
 * déjà partagés (/organisations/7-…) mènent toujours à la bonne page. Rejouable.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [tables] = await queryInterface.sequelize.query(`SELECT TABLE_NAME AS t FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('organisation', 'organisation_redirection')`);
    const existe = new Set(tables.map(t => t.t));
    if (!existe.has('organisation') || existe.has('organisation_redirection')) return;

    await queryInterface.createTable('organisation_redirection', {
      ancien_id: { type: Sequelize.INTEGER, primaryKey: true, allowNull: false },
      id_organisation: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'organisation', key: 'id_organisation' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      date_creation: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('organisation_redirection').catch(() => {});
  }
};
