'use strict';

/**
 * Migration : extrait d'un livre (quelques pages saisies par l'écrivain), lu avec « Lire un extrait ».
 * Avant, ce bouton montrait seulement le résumé. Rejouable.
 * Attention : la descente supprime la colonne, donc les extraits saisis depuis la montée.
 */
async function colonneExiste(queryInterface) {
  const [lignes] = await queryInterface.sequelize.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'livre' AND COLUMN_NAME = 'extrait'`);
  return lignes.length > 0;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (await colonneExiste(queryInterface)) return;
    await queryInterface.addColumn('livre', 'extrait', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Extrait du livre, saisi par son auteur (20 000 caractères au plus)'
    });
  },

  async down(queryInterface) {
    if (!(await colonneExiste(queryInterface))) return;
    await queryInterface.removeColumn('livre', 'extrait');
  }
};
