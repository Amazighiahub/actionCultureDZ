// Personne abonnée à la newsletter sans compte : son adresse e-mail seulement
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('NewsletterAbonne', {
  id_abonne: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  email: { type: DataTypes.STRING(254), allowNull: false, unique: true },
  statut: { type: DataTypes.ENUM('en_attente', 'actif'), allowNull: false, defaultValue: 'en_attente' },
  date_demande: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  date_confirmation: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'newsletter_abonne',
  timestamps: false,
  indexes: [{ fields: ['statut'] }],
});
