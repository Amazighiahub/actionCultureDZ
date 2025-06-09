const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Parcours = sequelize.define('Parcours', {
    id_parcours: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom_parcours: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    duree_estimee: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Durée en minutes'
    },
    difficulte: {
      type: DataTypes.ENUM('facile', 'moyen', 'difficile'),
      defaultValue: 'facile'
    },
    theme: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    distance_km: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    },
    point_depart: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    point_arrivee: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    statut: {
      type: DataTypes.ENUM('actif', 'inactif', 'maintenance'),
      defaultValue: 'actif'
    },
    id_createur: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'user',
        key: 'id_user'
      }
    },
    date_creation: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'parcours',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification'
  });

  return Parcours;
};