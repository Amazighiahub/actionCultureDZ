'use strict';

/**
 * Migration : liaison Lieu patrimoine ↔ Intervenant (personnalités)
 *
 * Permet d'associer une fiche intervenant (personne, avec ou sans compte User
 * via intervenant.id_user) à un site patrimoine, indépendamment du texte libre
 * detail_lieux.personnalites et des blocs article_block.
 *
 * Contrainte : une même personne (intervenant) ne peut être liée qu'une fois
 * par lieu (UNIQUE id_lieu + id_intervenant).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.describeTable('lieu_intervenant');
      console.log('ℹ️  Table lieu_intervenant existe déjà — migration ignorée');
      return;
    } catch {
      // Table absente : on la crée
    }

    await queryInterface.createTable('lieu_intervenant', {
      id_lieu_intervenant: {
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
        onDelete: 'CASCADE',
        comment: 'Site patrimoine'
      },
      id_intervenant: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'intervenant', key: 'id_intervenant' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Fiche personne (id_user optionnel sur intervenant)'
      },
      role_sur_site: {
        type: Sequelize.STRING(80),
        allowNull: true,
        comment: 'Rôle sur ce site : figure_historique, artisan_local, artiste, ecrivain, fondateur, etc.'
      },
      periode: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Période ou siècle (texte libre)'
      },
      contexte: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Contexte / bio courte spécifique à ce lieu'
      },
      ordre: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Ordre d\'affichage sur la fiche patrimoine'
      },
      id_contributeur: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'user', key: 'id_user' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Utilisateur ayant créé cette association'
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

    await queryInterface.addIndex('lieu_intervenant', ['id_lieu', 'id_intervenant'], {
      name: 'uk_lieu_intervenant',
      unique: true
    });

    await queryInterface.addIndex('lieu_intervenant', ['id_lieu', 'ordre'], {
      name: 'idx_lieu_intervenant_lieu_ordre'
    });

    await queryInterface.addIndex('lieu_intervenant', ['id_intervenant'], {
      name: 'idx_lieu_intervenant_intervenant'
    });

    console.log('✅ Table lieu_intervenant créée (FK lieu, intervenant, contributeur)');
  },

  async down(queryInterface) {
    try {
      await queryInterface.describeTable('lieu_intervenant');
      await queryInterface.dropTable('lieu_intervenant');
      console.log('✅ Table lieu_intervenant supprimée');
    } catch {
      console.log('ℹ️  Table lieu_intervenant absente — rien à supprimer');
    }
  }
};
