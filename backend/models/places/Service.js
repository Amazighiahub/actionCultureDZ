// models/Service.js - ⚡ MODIFIÉ POUR I18N
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Service = sequelize.define('Service', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_lieu: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'lieu',
        key: 'id_lieu'
      }
    },
    // ⚡ MODIFIÉ POUR I18N
    nom: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { fr: '' },
      comment: 'Nom du service en plusieurs langues { fr: "Parking", ar: "موقف سيارات", en: "Parking" }'
    },
    disponible: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    // ⚡ MODIFIÉ POUR I18N
    description: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Description en plusieurs langues'
    }
  }, {
    tableName: 'services',
    timestamps: true
  });

  // Associations
  Service.associate = (models) => {
    Service.belongsTo(models.Lieu, { foreignKey: 'id_lieu' });
  };

  // ⚡ NOUVELLES MÉTHODES I18N
  Service.prototype.getNom = function(lang = 'fr') {
    return this.nom?.[lang] || this.nom?.fr || this.nom?.ar || '';
  };

  Service.prototype.getDescription = function(lang = 'fr') {
    return this.description?.[lang] || this.description?.fr || '';
  };

  return Service;
};
