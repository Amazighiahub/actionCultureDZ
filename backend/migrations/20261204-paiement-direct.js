'use strict';

/**
 * Migration : paiement direct au professionnel. Tala DZ n'encaisse rien et ne prend aucune commission.
 * - user.moyens_paiement : comment le professionnel veut être payé (BaridiMob, CCP, espèces, lien)
 * - evenementusers.date_paiement : l'organisateur a confirmé avoir reçu le paiement
 * Rejouable. Attention : la descente supprime ces colonnes et ce qui y a été saisi depuis la montée.
 */
async function colonneExiste(queryInterface, table, colonne) {
  const [lignes] = await queryInterface.sequelize.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [table, colonne] }
  );
  return lignes.length > 0;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await colonneExiste(queryInterface, 'user', 'moyens_paiement'))) {
      await queryInterface.addColumn('user', 'moyens_paiement', {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Moyens de paiement du professionnel, montrés à ses participants et acheteurs'
      });
    }
    if (!(await colonneExiste(queryInterface, 'evenementusers', 'date_paiement'))) {
      await queryInterface.addColumn('evenementusers', 'date_paiement', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Paiement reçu, confirmé par l’organisateur (null : pas encore)'
      });
    }
  },

  async down(queryInterface) {
    if (await colonneExiste(queryInterface, 'evenementusers', 'date_paiement')) {
      await queryInterface.removeColumn('evenementusers', 'date_paiement');
    }
    if (await colonneExiste(queryInterface, 'user', 'moyens_paiement')) {
      await queryInterface.removeColumn('user', 'moyens_paiement');
    }
  }
};
