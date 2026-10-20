'use strict';

/**
 * Migration : informations de vente d'un produit artisanal.
 *
 * Le formulaire « Ajouter un artisanat » et la fiche publique utilisaient déjà prix maximum,
 * délai de fabrication, stock et « sur commande », mais ces colonnes n'existaient pas :
 * les valeurs saisies étaient perdues sans avertissement. Le prix minimum reste la colonne `prix`.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('artisanat');
    if (!table.prix_max) {
      await queryInterface.addColumn('artisanat', 'prix_max', {
        type: Sequelize.DECIMAL(10, 2), allowNull: true, comment: 'Prix maximum (le minimum est `prix`)'
      });
    }
    if (!table.delai_fabrication) {
      await queryInterface.addColumn('artisanat', 'delai_fabrication', {
        type: Sequelize.INTEGER, allowNull: true, comment: 'Délai de fabrication, en jours'
      });
    }
    if (!table.en_stock) {
      await queryInterface.addColumn('artisanat', 'en_stock', {
        type: Sequelize.INTEGER, allowNull: true, comment: 'Quantité disponible en stock'
      });
    }
    if (!table.sur_commande) {
      await queryInterface.addColumn('artisanat', 'sur_commande', {
        type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false, comment: 'Fabriqué sur commande'
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('artisanat');
    for (const col of ['prix_max', 'delai_fabrication', 'en_stock', 'sur_commande']) {
      if (table[col]) await queryInterface.removeColumn('artisanat', col);
    }
  }
};
