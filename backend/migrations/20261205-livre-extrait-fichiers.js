'use strict';

/**
 * Migration : extrait d'un livre en PDF et en audio (l'écrivain lit un passage), en plus du texte.
 * Chaque colonne pointe vers un média de l'œuvre ; supprimer le média vide la colonne. Rejouable.
 * Attention : la descente supprime ces colonnes (les fichiers restent dans les médias de l'œuvre).
 */
const COLONNES = ['id_media_extrait_pdf', 'id_media_extrait_audio'];

async function colonneExiste(queryInterface, colonne) {
  const [lignes] = await queryInterface.sequelize.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'livre' AND COLUMN_NAME = ?`,
    { replacements: [colonne] }
  );
  return lignes.length > 0;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    for (const colonne of COLONNES) {
      if (await colonneExiste(queryInterface, colonne)) continue;
      await queryInterface.addColumn('livre', colonne, {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'media', key: 'id_media' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
    }
  },

  async down(queryInterface) {
    for (const colonne of COLONNES) {
      if (!(await colonneExiste(queryInterface, colonne))) continue;
      // La clé étrangère d'abord (son nom dépend de MySQL)
      const [cles] = await queryInterface.sequelize.query(
        `SELECT CONSTRAINT_NAME AS nom FROM information_schema.KEY_COLUMN_USAGE
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'livre' AND COLUMN_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
        { replacements: [colonne] }
      );
      for (const { nom } of cles) await queryInterface.removeConstraint('livre', nom);
      await queryInterface.removeColumn('livre', colonne);
    }
  }
};
