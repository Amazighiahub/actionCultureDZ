// models/LieuMedia.js - ⚡ MODIFIÉ POUR I18N
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LieuMedia = sequelize.define('LieuMedia', {
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
    type: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    url: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    // ⚡ MODIFIÉ POUR I18N
    description: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Description en plusieurs langues { fr: "Vue panoramique", ar: "منظر بانورامي", en: "Panoramic view" }'
    }
  }, {
    tableName: 'lieu_medias',
    timestamps: true
  });

  // Associations
  LieuMedia.associate = (models) => {
    LieuMedia.belongsTo(models.Lieu, { foreignKey: 'id_lieu' });
  };

  // ⚡ NOUVELLE MÉTHODE I18N
  LieuMedia.prototype.getDescription = function(lang = 'fr') {
    return this.description?.[lang] || this.description?.fr || '';
  };

  return LieuMedia;
};
