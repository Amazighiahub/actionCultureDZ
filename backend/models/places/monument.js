// models/Monument.js - ⚡ MODIFIÉ POUR I18N
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Monument = sequelize.define('Monument', {
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
      comment: 'Nom du monument en plusieurs langues { fr: "Grande Mosquée", ar: "الجامع الكبير", en: "Grand Mosque" }'
    },
    // ⚡ MODIFIÉ POUR I18N
    description: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { fr: '' },
      comment: 'Description en plusieurs langues'
    },
    type: {
      type: DataTypes.ENUM('Mosquée', 'Palais', 'Statue', 'Tour', 'Musée'),
      allowNull: false
    }
  }, {
    tableName: 'monuments',
    timestamps: true
  });

  // Associations
  Monument.associate = (models) => {
    Monument.belongsTo(models.DetailLieu, { foreignKey: 'id_detail_lieu' });
  };

  // ⚡ NOUVELLES MÉTHODES I18N
  Monument.prototype.getNom = function(lang = 'fr') {
    return this.nom?.[lang] || this.nom?.fr || this.nom?.ar || '';
  };

  Monument.prototype.getDescription = function(lang = 'fr') {
    return this.description?.[lang] || this.description?.fr || this.description?.ar || '';
  };

  return Monument;
};
