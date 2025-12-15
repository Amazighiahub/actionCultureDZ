// models/TagMotCle.js - ⚡ MODIFIÉ POUR I18N
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TagMotCle = sequelize.define('TagMotCle', {
    id_tag: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // ⚡ MODIFIÉ POUR I18N
    nom: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { fr: '' },
      comment: 'Nom du tag en plusieurs langues { fr: "Culture", ar: "ثقافة", en: "Culture" }'
    }
  }, {
    tableName: 'tagmotcle',
    timestamps: false
  });

  // Associations
  TagMotCle.associate = (models) => {
    TagMotCle.belongsToMany(models.Oeuvre, { 
      through: models.OeuvreTag, 
      foreignKey: 'id_tag' 
    });
  };

  // ⚡ NOUVELLE MÉTHODE I18N
  TagMotCle.prototype.getNom = function(lang = 'fr') {
    return this.nom?.[lang] || this.nom?.fr || this.nom?.ar || '';
  };

  return TagMotCle;
};
