// models/DetailLieu.js - ⚡ MODIFIÉ POUR I18N
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DetailLieu = sequelize.define('DetailLieu', {
    id_detailLieu: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_lieu: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'lieu',
        key: 'id_lieu'
      }
    },
    // ⚡ MODIFIÉ POUR I18N
    description: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Description en plusieurs langues { fr: "...", ar: "...", en: "..." }'
    },
    // ⚡ MODIFIÉ POUR I18N
    horaires: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Horaires en plusieurs langues { fr: "9h-17h", ar: "٩-١٧", en: "9am-5pm" }'
    },
    // ⚡ MODIFIÉ POUR I18N
    histoire: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Histoire du lieu en plusieurs langues'
    },
    // ⚡ MODIFIÉ POUR I18N
    referencesHistoriques: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Références historiques en plusieurs langues'
    },
    noteMoyenne: {
      type: DataTypes.FLOAT,
      validate: {
        min: 0,
        max: 5
      }
    }
  }, {
    tableName: 'detail_lieux',
    timestamps: true
  });

  // Associations
  DetailLieu.associate = (models) => {
    DetailLieu.belongsTo(models.Lieu, { foreignKey: 'id_lieu' });
    DetailLieu.hasMany(models.Monument, { foreignKey: 'id_detail_lieu', onDelete: 'CASCADE' });
    DetailLieu.hasMany(models.Vestige, { foreignKey: 'id_detail_lieu', onDelete: 'CASCADE' });
  };

  // ⚡ NOUVELLES MÉTHODES I18N
  DetailLieu.prototype.getDescription = function(lang = 'fr') {
    return this.description?.[lang] || this.description?.fr || this.description?.ar || '';
  };

  DetailLieu.prototype.getHoraires = function(lang = 'fr') {
    return this.horaires?.[lang] || this.horaires?.fr || this.horaires?.ar || '';
  };

  DetailLieu.prototype.getHistoire = function(lang = 'fr') {
    return this.histoire?.[lang] || this.histoire?.fr || this.histoire?.ar || '';
  };

  DetailLieu.prototype.getReferencesHistoriques = function(lang = 'fr') {
    return this.referencesHistoriques?.[lang] || this.referencesHistoriques?.fr || '';
  };

  return DetailLieu;
};
