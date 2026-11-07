/**
 * Commande d'un livre, d'une œuvre d'art ou d'un objet d'artisanat. L'acheteur paie directement le
 * professionnel ; Tala DZ garde seulement la trace (montant, livraison, paiement reçu, envoi).
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Commande = sequelize.define('Commande', {
    id_commande: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_oeuvre: { type: DataTypes.INTEGER, allowNull: true },
    titre: { type: DataTypes.STRING(255), allowNull: false },
    id_vendeur: { type: DataTypes.INTEGER, allowNull: false },
    id_acheteur: { type: DataTypes.INTEGER, allowNull: false },
    quantite: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, validate: { min: 1, max: 20 } },
    prix_unitaire: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    // Haut de la fourchette annoncée (artisanat) : borne du montant que le vendeur peut fixer
    prix_max_unitaire: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    modifs_montant: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    // Copie des coordonnées de paiement au moment de la commande
    moyens_paiement: { type: DataTypes.JSON, allowNull: true },
    prix_a_confirmer: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    frais_envoi: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    montant_total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    livraison: { type: DataTypes.ENUM('algerie', 'etranger', 'main_propre', 'a_convenir'), allowNull: false },
    adresse: { type: DataTypes.TEXT, allowNull: true },
    telephone: { type: DataTypes.STRING(30), allowNull: true },
    message: { type: DataTypes.TEXT, allowNull: true },
    statut: { type: DataTypes.ENUM('en_attente', 'payee', 'envoyee', 'annulee'), allowNull: false, defaultValue: 'en_attente' },
    date_paiement: { type: DataTypes.DATE, allowNull: true },
    date_envoi: { type: DataTypes.DATE, allowNull: true },
    date_annulation: { type: DataTypes.DATE, allowNull: true },
    annulee_par: { type: DataTypes.ENUM('acheteur', 'vendeur'), allowNull: true },
  }, {
    tableName: 'commande',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification',
  });

  Commande.associate = (models) => {
    if (models.Oeuvre) Commande.belongsTo(models.Oeuvre, { foreignKey: 'id_oeuvre', as: 'Oeuvre', constraints: false });
    if (models.User) {
      Commande.belongsTo(models.User, { foreignKey: 'id_vendeur', as: 'Vendeur', constraints: false });
      Commande.belongsTo(models.User, { foreignKey: 'id_acheteur', as: 'Acheteur', constraints: false });
    }
  };

  return Commande;
};
