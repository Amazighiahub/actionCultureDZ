// Attention : la descente supprime la colonne id_programme, donc le jour choisi pour chaque photo (les photos restent dans la galerie de l'événement).
'use strict';

/**
 * Migration : photos du jour d'un événement (demande de la responsable, 2026-11-15).
 * Un événement sur plusieurs jours (exposition…) a déjà un programme par jour (date, description,
 * intervenants). Une photo peut maintenant être rattachée à un jour du programme : colonne
 * media.id_programme, vide par défaut (photo de tout l'événement). Si le jour est supprimé, la photo
 * reste dans la galerie (SET NULL). Aucune donnée existante n'est modifiée. Rejouable.
 */
async function aColonne(queryInterface) {
  const [lignes] = await queryInterface.sequelize.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'media' AND COLUMN_NAME = 'id_programme'`);
  return lignes.length > 0;
}

async function aContrainte(queryInterface) {
  const [lignes] = await queryInterface.sequelize.query(`SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'media' AND CONSTRAINT_NAME = 'fk_media_programme'`);
  return lignes.length > 0;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await aColonne(queryInterface))) {
      await queryInterface.addColumn('media', 'id_programme', { type: Sequelize.INTEGER, allowNull: true });
    }
    if (!(await aContrainte(queryInterface))) {
      // La clé étrangère crée aussi l'index sur id_programme
      await queryInterface.addConstraint('media', {
        fields: ['id_programme'],
        type: 'foreign key',
        name: 'fk_media_programme',
        references: { table: 'programme', field: 'id_programme' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
    }
  },

  async down(queryInterface) {
    if (await aContrainte(queryInterface)) await queryInterface.removeConstraint('media', 'fk_media_programme');
    if (await aColonne(queryInterface)) {
      const [index] = await queryInterface.sequelize.query(`SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'media' AND INDEX_NAME = 'fk_media_programme'`);
      if (index.length) await queryInterface.removeIndex('media', 'fk_media_programme');
      await queryInterface.removeColumn('media', 'id_programme');
    }
  }
};
