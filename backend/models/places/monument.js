// models/Monument.js - ⚡ MODIFIÉ POUR I18N
const { DataTypes } = require('sequelize');
const { MONUMENT_TYPES } = require('../../constants/patrimoineTypes');

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
      type: DataTypes.ENUM(...MONUMENT_TYPES),
      allowNull: false,
      index: true
    }
  }, {
    tableName: 'monuments',
    timestamps: true
  });

  // Associations
  Monument.associate = (models) => {
    Monument.belongsTo(models.DetailLieu, { foreignKey: 'id_detail_lieu' });
  };

  return Monument;
};
