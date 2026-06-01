'use strict';

/**
 * Migration : Ajouter id_evenement à parcours_lieux
 *
 * Le modèle ParcoursLieu définit id_evenement (FK → evenement) depuis le début,
 * mais cette colonne n'a jamais été ajoutée en base via migration.
 * Le repository l'utilise lors de la création/mise à jour des étapes et
 * lors de l'inclusion de l'Evenement dans les requêtes détail parcours.
 *
 * Impact sans cette migration : erreur "Unknown column 'id_evenement'"
 * sur toutes les requêtes parcours qui chargent les étapes.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('parcours_lieux');

    if (!table.id_evenement) {
      await queryInterface.addColumn('parcours_lieux', 'id_evenement', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null,
        references: {
          model: 'evenement',
          key: 'id_evenement'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Événement optionnel lié à cette étape du parcours (si un événement se tient à ce lieu)'
      });

      await queryInterface.addIndex('parcours_lieux', ['id_evenement'], {
        name: 'idx_parcours_lieux_evenement'
      });

      console.log('✅ Migration 20260526: parcours_lieux.id_evenement ajouté');
    } else {
      console.log('ℹ️  parcours_lieux.id_evenement existe déjà — migration ignorée');
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('parcours_lieux');

    if (table.id_evenement) {
      try {
        await queryInterface.removeIndex('parcours_lieux', 'idx_parcours_lieux_evenement');
      } catch {
        // Index peut déjà être absent
      }
      await queryInterface.removeColumn('parcours_lieux', 'id_evenement');
      console.log('✅ Rollback 20260526: parcours_lieux.id_evenement supprimé');
    }
  }
};
