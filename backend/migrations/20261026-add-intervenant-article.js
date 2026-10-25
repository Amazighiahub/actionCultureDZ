'use strict';

/**
 * Migration : articles complets consacrés à une personnalité.
 *
 * Un article écrit avec l'éditeur avancé (œuvre de type Article) est relié à la fiche d'une
 * personnalité (intervenant) et affiché sur sa page. Ce n'est pas oeuvre_intervenant, qui relie
 * une œuvre à ses auteurs.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.describeTable('intervenant_article');
      console.log('ℹ️  Table intervenant_article existe déjà — migration ignorée');
      return;
    } catch {
      // Table absente : on la crée
    }

    await queryInterface.createTable('intervenant_article', {
      id_intervenant_article: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      id_intervenant: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'intervenant', key: 'id_intervenant' },
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
        comment: 'Compte qui a relié l’article à la personnalité'
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

    await queryInterface.addIndex('intervenant_article', ['id_intervenant', 'id_oeuvre'], {
      name: 'uk_intervenant_article',
      unique: true
    });
    await queryInterface.addIndex('intervenant_article', ['id_oeuvre'], { name: 'idx_intervenant_article_oeuvre' });

    console.log('✅ Table intervenant_article créée');
  },

  async down(queryInterface) {
    try {
      await queryInterface.describeTable('intervenant_article');
      await queryInterface.dropTable('intervenant_article');
      console.log('✅ Table intervenant_article supprimée');
    } catch {
      console.log('ℹ️  Table intervenant_article absente — rien à supprimer');
    }
  }
};
