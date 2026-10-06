'use strict';

/**
 * Migration : notes des sites patrimoine, une par utilisateur.
 *
 * Auparavant POST /patrimoine/:id/noter incrémentait la moyenne sans mémoriser
 * le votant : un même compte pouvait voter à l'infini. La moyenne affichée
 * (detail_lieux.noteMoyenne / nb_notations) est désormais recalculée depuis cette table.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.describeTable('lieu_notation');
      console.log('ℹ️  Table lieu_notation existe déjà — migration ignorée');
      return;
    } catch {
      // Table absente : on la crée
    }

    await queryInterface.createTable('lieu_notation', {
      id_lieu_notation: {
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
      id_user: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'user', key: 'id_user' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Votant (suppression du compte = suppression de sa note)'
      },
      note: {
        type: Sequelize.TINYINT,
        allowNull: false
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

    await queryInterface.addIndex('lieu_notation', ['id_lieu', 'id_user'], {
      name: 'uk_lieu_notation_lieu_user',
      unique: true
    });

    console.log('✅ Table lieu_notation créée');
  },

  async down(queryInterface) {
    try {
      await queryInterface.describeTable('lieu_notation');
      await queryInterface.dropTable('lieu_notation');
      console.log('✅ Table lieu_notation supprimée');
    } catch {
      console.log('ℹ️  Table lieu_notation absente — rien à supprimer');
    }
  }
};
