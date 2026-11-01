'use strict';

/**
 * Migration : propositions de modification des sites patrimoine (audit V7 sécurité M5).
 * Les textes d'un site (histoire, traditions, infos pratiques…), ses monuments, vestiges et
 * personnalités étaient modifiables par n'importe quel compte, en ligne tout de suite.
 * Désormais, hors équipe et créateur du site, une modification est une proposition :
 * l'équipe l'accepte (elle est alors appliquée, avec l'historique habituel) ou la refuse avec un motif.
 * Nouvelle table seulement : aucune donnée existante n'est modifiée. Rejouable.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [tables] = await queryInterface.sequelize.query(`SELECT TABLE_NAME AS t FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('lieu', 'user', 'proposition_lieu')`);
    const existe = new Set(tables.map(t => t.t));
    if (!existe.has('lieu') || !existe.has('user') || existe.has('proposition_lieu')) return;

    await queryInterface.createTable('proposition_lieu', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      id_lieu: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'lieu', key: 'id_lieu' }, onDelete: 'CASCADE', onUpdate: 'CASCADE'
      },
      id_user: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'user', key: 'id_user' }, onDelete: 'CASCADE', onUpdate: 'CASCADE'
      },
      // detail (textes), personnalite (rattachement), element_ajout, element_modif (monument ou vestige)
      action: { type: Sequelize.STRING(30), allowNull: false },
      donnees: { type: Sequelize.JSON, allowNull: false },
      statut: { type: Sequelize.ENUM('en_attente', 'acceptee', 'refusee'), allowNull: false, defaultValue: 'en_attente' },
      motif: { type: Sequelize.TEXT, allowNull: true },
      id_moderateur: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'user', key: 'id_user' }, onDelete: 'SET NULL', onUpdate: 'CASCADE'
      },
      date_creation: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      date_decision: { type: Sequelize.DATE, allowNull: true }
    });
    await queryInterface.addIndex('proposition_lieu', ['statut', 'id'], { name: 'idx_proposition_lieu_statut' });
    await queryInterface.addIndex('proposition_lieu', ['id_lieu'], { name: 'idx_proposition_lieu_lieu' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('proposition_lieu').catch(() => {});
  }
};
