// Attention : la descente supprime la table service_stat, donc les statistiques des services (vues, clics).
'use strict';

/**
 * Migration : statistiques d'un service pour son professionnel (accord de la responsable, 2026-11-16).
 * Une ligne par service et par jour : vues de la fiche, clics sur WhatsApp, sur « Réserver en ligne »
 * et sur « Appeler ». Rien sur la personne (ni compte, ni adresse IP). Supprimées avec le service.
 * Rejouable.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [lignes] = await queryInterface.sequelize.query(`SELECT TABLE_NAME FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_stat'`);
    if (lignes.length) return;
    await queryInterface.createTable('service_stat', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      id_service: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'services', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE'
      },
      jour: { type: Sequelize.DATEONLY, allowNull: false },
      vues: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      whatsapp: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      reservation: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      appel: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 }
    });
    await queryInterface.addIndex('service_stat', ['id_service', 'jour'], { unique: true, name: 'uq_service_stat_jour' });
  },

  async down(queryInterface) {
    const [lignes] = await queryInterface.sequelize.query(`SELECT TABLE_NAME FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_stat'`);
    if (lignes.length) await queryInterface.dropTable('service_stat');
  }
};
