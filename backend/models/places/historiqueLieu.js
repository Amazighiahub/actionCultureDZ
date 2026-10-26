// models/places/historiqueLieu.js
// Historique des textes d'un lieu (nom, description, histoire, sections…) : chaque modification
// garde l'ancienne valeur, pour que l'administration puisse revenir en arrière.
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const HistoriqueLieu = sequelize.define('HistoriqueLieu', {
    id_historique: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_lieu: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'lieu', key: 'id_lieu' }
    },
    champ: {
      type: DataTypes.STRING(40),
      allowNull: false,
      comment: 'Texte modifié : nom, adresse, description, histoire, referencesHistoriques, traditions…'
    },
    ancienne_valeur: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Valeur avant la modification (toutes les langues)'
    },
    nouvelle_valeur: {
      type: DataTypes.JSON,
      allowNull: true
    },
    id_user: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Auteur de la modification'
    },
    id_historique_restaure: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Retour à une version précédente : la ligne d’historique restaurée'
    }
  }, {
    tableName: 'historique_lieu',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: false,
    indexes: [{ fields: ['id_lieu', 'date_creation'] }]
  });

  HistoriqueLieu.associate = (models) => {
    HistoriqueLieu.belongsTo(models.Lieu, { foreignKey: 'id_lieu', onDelete: 'CASCADE' });
    HistoriqueLieu.belongsTo(models.User, { as: 'Auteur', foreignKey: 'id_user', onDelete: 'SET NULL' });
  };

  return HistoriqueLieu;
};
