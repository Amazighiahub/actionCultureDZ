// models/Vestige.js - ⚡ MODIFIÉ POUR I18N
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Vestige = sequelize.define('Vestige', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_detail_lieu: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'detail_lieux',
        key: 'id_detailLieu'
      }
    },
    // ⚡ MODIFIÉ POUR I18N
    nom: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { fr: '' },
      comment: 'Nom du vestige en plusieurs langues { fr: "Ruines romaines", ar: "الآثار الرومانية", en: "Roman ruins" }'
    },
    // ⚡ MODIFIÉ POUR I18N
    description: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { fr: '' },
      comment: 'Description en plusieurs langues'
    },
    type: {
      type: DataTypes.ENUM('Ruines', 'Murailles', 'Site archéologique'),
      allowNull: false
    }
  }, {
    tableName: 'vestiges',
    timestamps: true
  });

  // Associations
  Vestige.associate = (models) => {
    Vestige.belongsTo(models.DetailLieu, { foreignKey: 'id_detail_lieu' });
  };

  // ⚡ NOUVELLES MÉTHODES I18N
  Vestige.prototype.getNom = function(lang = 'fr') {
    return this.nom?.[lang] || this.nom?.fr || this.nom?.ar || '';
  };

  Vestige.prototype.getDescription = function(lang = 'fr') {
    return this.description?.[lang] || this.description?.fr || this.description?.ar || '';
  };

  return Vestige;
};
