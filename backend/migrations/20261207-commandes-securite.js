'use strict';

/**
 * Migration : sécurité des commandes.
 * - commande.moyens_paiement : copie des coordonnées de paiement au moment de la commande (un
 *   changement ultérieur, par exemple après un vol de session, ne détourne pas les paiements en cours)
 * - commande.prix_max_unitaire : haut de la fourchette annoncée, borne du montant fixé par le vendeur
 * - commande.modifs_montant : nombre de changements de montant (deux au plus)
 * Rejouable. La descente retire ces colonnes (les commandes restent).
 */
async function colonneExiste(queryInterface, colonne) {
  const [lignes] = await queryInterface.sequelize.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commande' AND COLUMN_NAME = ?`,
    { replacements: [colonne] }
  );
  return lignes.length > 0;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await colonneExiste(queryInterface, 'moyens_paiement'))) {
      await queryInterface.addColumn('commande', 'moyens_paiement', { type: Sequelize.JSON, allowNull: true });
    }
    if (!(await colonneExiste(queryInterface, 'prix_max_unitaire'))) {
      await queryInterface.addColumn('commande', 'prix_max_unitaire', { type: Sequelize.DECIMAL(10, 2), allowNull: true });
    }
    if (!(await colonneExiste(queryInterface, 'modifs_montant'))) {
      await queryInterface.addColumn('commande', 'modifs_montant', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 });
    }
  },

  async down(queryInterface) {
    for (const c of ['modifs_montant', 'prix_max_unitaire', 'moyens_paiement']) {
      if (await colonneExiste(queryInterface, c)) await queryInterface.removeColumn('commande', c);
    }
  }
};
