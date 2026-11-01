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
      allowNull: false,
      index: true
    },
    url: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    // Langue d'un enregistrement audio (fr, ar, en, tz-ltn, tz-tfng) ; null pour une image
    langue: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    // ⚡ MODIFIÉ POUR I18N
    description: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Description en plusieurs langues { fr: "Vue panoramique", ar: "منظر بانورامي", en: "Panoramic view" }'
    },
    // Photographe ou source, affiché « © … » (migration 20261125)
    credit: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    // tous_droits_reserves | cc_by | cc_by_sa | domaine_public ; null = non précisée
    licence: {
      type: DataTypes.STRING(30),
      allowNull: true
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
