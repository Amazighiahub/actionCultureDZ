'use strict';

/**
 * Migration : Ajouter des colonnes d'audit de suspension sur user
 *
 * Pourquoi :
 * - userRepository.suspend(userId, adminId, duree, motif) ignorait totalement
 *   adminId, duree et motif — seul le statut était persisté.
 * - Aucune traçabilité : impossible de savoir qui a suspendu, quand, pourquoi,
 *   ni de réactiver automatiquement à la fin de la période prévue.
 *
 * Colonnes ajoutées :
 * - suspension_motif    : raison textuelle de la suspension (audit)
 * - suspension_jusqu_au : date de fin de suspension (NULL = indéfinie)
 * - suspendu_par        : ID de l'administrateur responsable
 * - suspendu_le         : date de la dernière action de modération
 */
const { DataTypes } = require('sequelize');

const COLUMNS = [
  {
    name: 'suspension_motif',
    definition: { type: DataTypes.TEXT, allowNull: true }
  },
  {
    name: 'suspension_jusqu_au',
    definition: { type: DataTypes.DATE, allowNull: true }
  },
  {
    name: 'suspendu_par',
    definition: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'user', key: 'id_user' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    }
  },
  {
    name: 'suspendu_le',
    definition: { type: DataTypes.DATE, allowNull: true }
  }
];

module.exports = {
  async up(queryInterface) {
    const table = await queryInterface.describeTable('user');

    for (const col of COLUMNS) {
      if (!table[col.name]) {
        await queryInterface.addColumn('user', col.name, col.definition);
        console.log(`✅ Colonne user.${col.name} ajoutée`);
      } else {
        console.log(`ℹ️ Colonne user.${col.name} existe déjà`);
      }
    }

    // Index pour le cron de ré-activation automatique (WHERE statut='suspendu' AND suspension_jusqu_au <= NOW())
    const [indexes] = await queryInterface.sequelize.query(
      "SHOW INDEX FROM `user` WHERE Key_name = 'idx_user_suspension_jusqu_au'"
    );
    if (indexes.length === 0) {
      await queryInterface.addIndex('user', ['suspension_jusqu_au'], {
        name: 'idx_user_suspension_jusqu_au'
      });
      console.log('✅ Index idx_user_suspension_jusqu_au créé');
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeIndex('user', 'idx_user_suspension_jusqu_au');
    } catch (_) { /* absent */ }

    for (const col of COLUMNS.slice().reverse()) {
      try {
        await queryInterface.removeColumn('user', col.name);
      } catch (_) { /* absent */ }
    }
  }
};
