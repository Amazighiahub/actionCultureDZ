'use strict';

/**
 * Migration : pages détaillées d'un lieu patrimoine.
 *
 * Un article écrit avec l'éditeur avancé (œuvre de type Article) est relié à une section
 * du lieu (« La rechta » dans Gastronomie, « La bataille d'Alger » dans Histoire…).
 * Le texte de la section (detail_lieux) reste le résumé affiché sur la page du lieu.
 */
const SECTIONS = [
  'histoire', 'architecture', 'traditions', 'gastronomie', 'artisanat_local',
  'personnalites', 'infos_pratiques', 'referencesHistoriques'
];

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.describeTable('lieu_oeuvre');
      console.log('ℹ️  Table lieu_oeuvre existe déjà — migration ignorée');
      return;
    } catch {
      // Table absente : on la crée
    }

    await queryInterface.createTable('lieu_oeuvre', {
      id_lieu_oeuvre: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      id_lieu: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'lieu', key: 'id_lieu' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      id_oeuvre: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'oeuvre', key: 'id_oeuvre' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      section_patrimoine: {
        type: Sequelize.ENUM(...SECTIONS),
        allowNull: false
      },
      ordre: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      id_contributeur: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'user', key: 'id_user' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Compte qui a relié la page au lieu'
      },
      date_creation: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      date_modification: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('lieu_oeuvre', ['id_lieu', 'id_oeuvre', 'section_patrimoine'], {
      name: 'uk_lieu_oeuvre_section',
      unique: true
    });
    await queryInterface.addIndex('lieu_oeuvre', ['id_oeuvre'], { name: 'idx_lieu_oeuvre_oeuvre' });

    console.log('✅ Table lieu_oeuvre créée');
  },

  async down(queryInterface) {
    try {
      await queryInterface.describeTable('lieu_oeuvre');
      await queryInterface.dropTable('lieu_oeuvre');
      console.log('✅ Table lieu_oeuvre supprimée');
    } catch {
      console.log('ℹ️  Table lieu_oeuvre absente — rien à supprimer');
    }
  }
};
