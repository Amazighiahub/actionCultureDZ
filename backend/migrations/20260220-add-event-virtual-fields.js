'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add 'brouillon' and 'publie' to statut ENUM
    await queryInterface.sequelize.query(`
      ALTER TABLE evenement 
      MODIFY COLUMN statut ENUM('brouillon', 'publie', 'planifie', 'en_cours', 'termine', 'annule', 'reporte') 
      DEFAULT 'brouillon'
    `);

    // 2. Make id_lieu nullable for virtual events
    await queryInterface.changeColumn('evenement', 'id_lieu', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'lieu',
        key: 'id_lieu'
      }
    });

    // 3. Add url_virtuel column (skip if already exists)
    const table = await queryInterface.describeTable('evenement');
    if (!table.url_virtuel) {
      await queryInterface.addColumn('evenement', 'url_virtuel', {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Lien pour les événements en ligne (Zoom, Meet, etc.)'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove url_virtuel column
    await queryInterface.removeColumn('evenement', 'url_virtuel');

    // Revert id_lieu to NOT NULL
    await queryInterface.changeColumn('evenement', 'id_lieu', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'lieu',
        key: 'id_lieu'
      }
    });

    // Revert statut ENUM
    await queryInterface.sequelize.query(`
      ALTER TABLE evenement 
      MODIFY COLUMN statut ENUM('planifie', 'en_cours', 'termine', 'annule', 'reporte') 
      DEFAULT 'planifie'
    `);
  }
};
