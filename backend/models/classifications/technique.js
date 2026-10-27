// models/Technique.js - ⚡ MODIFIÉ POUR I18N
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Technique = sequelize.define('Technique', {
    id_technique: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // ⚡ MODIFIÉ POUR I18N
    nom: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { fr: '' },
      comment: 'Nom en plusieurs langues { fr: "Tissage", ar: "نسيج", en: "Weaving" }'
    },
    // ⚡ MODIFIÉ POUR I18N
    description: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Description en plusieurs langues'
    }
  }, {
    tableName: 'technique',
    timestamps: false
  });

  // Associations
  Technique.associate = (models) => {
    // Valeur de référence : interdit de la supprimer tant qu'elle est utilisée (sans cela,
    // la suppression effaçait en cascade tout ce qui l'utilisait)
    Technique.hasMany(models.Artisanat, { foreignKey: 'id_technique', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
  };

  // ⚡ NOUVELLES MÉTHODES I18N
  Technique.prototype.getNom = function(lang = 'fr') {
    return this.nom?.[lang] || this.nom?.fr || this.nom?.ar || '';
  };

  Technique.prototype.getDescription = function(lang = 'fr') {
    return this.description?.[lang] || this.description?.fr || '';
  };

  return Technique;
};
