'use strict';

/**
 * Migration : propositions de modification d'un article (éditeur avancé).
 *
 * Une personne connectée propose une version complétée ou corrigée d'un article publié, avec
 * un motif ; la proposition reste un brouillon jusqu'à la décision de l'auteur de l'article ou
 * de l'administration (acceptée : elle remplace l'article ; refusée : avec un motif de refus).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.describeTable('article_revision');
      console.log('ℹ️  Table article_revision existe déjà — migration ignorée');
      return;
    } catch {
      // Table absente : on la crée
    }

    await queryInterface.createTable('article_revision', {
      id_revision: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      id_oeuvre: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'oeuvre', key: 'id_oeuvre' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      id_auteur: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'user', key: 'id_user' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Personne qui propose la modification'
      },
      motif: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      contenu: {
        type: Sequelize.JSON,
        allowNull: false
      },
      statut: {
        type: Sequelize.ENUM('en_attente', 'acceptee', 'refusee'),
        allowNull: false,
        defaultValue: 'en_attente'
      },
      id_decideur: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'user', key: 'id_user' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      motif_refus: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      date_decision: {
        type: Sequelize.DATE,
        allowNull: true
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

    await queryInterface.addIndex('article_revision', ['id_oeuvre', 'statut'], { name: 'idx_article_revision_oeuvre_statut' });
    await queryInterface.addIndex('article_revision', ['id_auteur'], { name: 'idx_article_revision_auteur' });

    console.log('✅ Table article_revision créée');
  },

  async down(queryInterface) {
    try {
      await queryInterface.describeTable('article_revision');
      await queryInterface.dropTable('article_revision');
      console.log('✅ Table article_revision supprimée');
    } catch {
      console.log('ℹ️  Table article_revision absente — rien à supprimer');
    }
  }
};
