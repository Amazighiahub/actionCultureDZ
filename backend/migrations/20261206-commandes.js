'use strict';

/**
 * Migration : commandes de livres, d'œuvres d'art et d'objets d'artisanat.
 * L'acheteur paie directement le professionnel (Tala DZ n'encaisse rien, aucune commission) ;
 * la commande garde la trace : quoi, combien, livraison, paiement reçu, envoi.
 * Rejouable. Attention : la descente supprime la table et toutes les commandes passées depuis la montée.
 */
async function tableExiste(queryInterface, table) {
  const [lignes] = await queryInterface.sequelize.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    { replacements: [table] }
  );
  return lignes.length > 0;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (await tableExiste(queryInterface, 'commande')) return;
    await queryInterface.createTable('commande', {
      id_commande: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      // L'œuvre peut disparaître : la commande reste, avec son titre
      id_oeuvre: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'oeuvre', key: 'id_oeuvre' }, onDelete: 'SET NULL', onUpdate: 'CASCADE'
      },
      titre: { type: Sequelize.STRING(255), allowNull: false },
      id_vendeur: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'user', key: 'id_user' }, onDelete: 'CASCADE', onUpdate: 'CASCADE'
      },
      id_acheteur: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'user', key: 'id_user' }, onDelete: 'CASCADE', onUpdate: 'CASCADE'
      },
      quantite: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      prix_unitaire: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      // Artisanat avec une fourchette de prix : le professionnel confirme le montant
      prix_a_confirmer: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      frais_envoi: { type: Sequelize.DECIMAL(10, 2), allowNull: true, comment: 'null : à convenir avec le vendeur' },
      montant_total: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      livraison: { type: Sequelize.ENUM('algerie', 'etranger', 'main_propre', 'a_convenir'), allowNull: false },
      adresse: { type: Sequelize.TEXT, allowNull: true },
      telephone: { type: Sequelize.STRING(30), allowNull: true },
      message: { type: Sequelize.TEXT, allowNull: true },
      statut: {
        type: Sequelize.ENUM('en_attente', 'payee', 'envoyee', 'annulee'),
        allowNull: false, defaultValue: 'en_attente'
      },
      date_paiement: { type: Sequelize.DATE, allowNull: true },
      date_envoi: { type: Sequelize.DATE, allowNull: true },
      date_annulation: { type: Sequelize.DATE, allowNull: true },
      annulee_par: { type: Sequelize.ENUM('acheteur', 'vendeur'), allowNull: true },
      date_creation: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      date_modification: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('commande', ['id_vendeur', 'date_creation'], { name: 'commande_vendeur_date' });
    await queryInterface.addIndex('commande', ['id_acheteur', 'date_creation'], { name: 'commande_acheteur_date' });
    await queryInterface.addIndex('commande', ['id_oeuvre'], { name: 'commande_oeuvre' });
  },

  async down(queryInterface) {
    if (await tableExiste(queryInterface, 'commande')) await queryInterface.dropTable('commande');
  }
};
