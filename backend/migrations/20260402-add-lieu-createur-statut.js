'use strict';

/**
 * Migration : Enrichir lieu + detail_lieux pour le patrimoine collaboratif
 *
 * Table lieu :
 * - id_createur (FK → user) : qui a créé le site
 * - statut (ENUM) : brouillon/publie/archive
 *
 * Table detail_lieux :
 * - id_dernier_contributeur (FK → user) : qui a enrichi en dernier
 * - date_derniere_contribution (DATE)
 * - nb_contributions (INTEGER) : compteur total
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // === TABLE lieu ===
    const lieuInfo = await queryInterface.describeTable('lieu');

    if (!lieuInfo.id_createur) {
      await queryInterface.addColumn('lieu', 'id_createur', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'user', key: 'id_user' },
        onDelete: 'SET NULL'
      });
      await queryInterface.addIndex('lieu', ['id_createur'], { name: 'idx_lieu_createur' });
    }

    if (!lieuInfo.statut) {
      await queryInterface.addColumn('lieu', 'statut', {
        type: Sequelize.ENUM('brouillon', 'publie', 'archive'),
        allowNull: false,
        defaultValue: 'publie'
      });
      await queryInterface.addIndex('lieu', ['statut'], { name: 'idx_lieu_statut' });
    }

    // === TABLE detail_lieux ===
    const detailInfo = await queryInterface.describeTable('detail_lieux');

    if (!detailInfo.id_dernier_contributeur) {
      await queryInterface.addColumn('detail_lieux', 'id_dernier_contributeur', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'user', key: 'id_user' },
        onDelete: 'SET NULL'
      });
    }

    if (!detailInfo.date_derniere_contribution) {
      await queryInterface.addColumn('detail_lieux', 'date_derniere_contribution', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }

    if (!detailInfo.nb_contributions) {
      await queryInterface.addColumn('detail_lieux', 'nb_contributions', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      });
    }

    console.log('✅ Migration 20260402: lieu (id_createur, statut) + detail_lieux (contributions)');
  },

  async down(queryInterface) {
    const lieuInfo = await queryInterface.describeTable('lieu');
    if (lieuInfo.id_createur) await queryInterface.removeColumn('lieu', 'id_createur');
    if (lieuInfo.statut) await queryInterface.removeColumn('lieu', 'statut');

    const detailInfo = await queryInterface.describeTable('detail_lieux');
    if (detailInfo.id_dernier_contributeur) await queryInterface.removeColumn('detail_lieux', 'id_dernier_contributeur');
    if (detailInfo.date_derniere_contribution) await queryInterface.removeColumn('detail_lieux', 'date_derniere_contribution');
    if (detailInfo.nb_contributions) await queryInterface.removeColumn('detail_lieux', 'nb_contributions');
  }
};
