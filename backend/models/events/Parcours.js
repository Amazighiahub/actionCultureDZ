// models/Parcours.js - ⚡ MODIFIÉ POUR I18N
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Parcours = sequelize.define('Parcours', {
    id_parcours: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // ⚡ MODIFIÉ POUR I18N
    nom_parcours: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { fr: '' },
      comment: 'Nom en plusieurs langues { fr: "Parcours historique", ar: "المسار التاريخي", en: "Historical Tour" }'
    },
    // ⚡ MODIFIÉ POUR I18N
    description: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Description en plusieurs langues'
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

  // ⚡ NOUVELLES MÉTHODES I18N
  Parcours.prototype.getNomParcours = function(lang = 'fr') {
    return this.nom_parcours?.[lang] || this.nom_parcours?.fr || this.nom_parcours?.ar || '';
  };

  Parcours.prototype.getDescription = function(lang = 'fr') {
    return this.description?.[lang] || this.description?.fr || '';
  };

  return Parcours;
};
