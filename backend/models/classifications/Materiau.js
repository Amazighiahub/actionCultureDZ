// models/Materiau.js - ⚡ MODIFIÉ POUR I18N
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Materiau = sequelize.define('Materiau', {
    id_materiau: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // ⚡ MODIFIÉ POUR I18N
    nom: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { fr: '' },
      comment: 'Nom en plusieurs langues { fr: "Bois", ar: "خشب", en: "Wood" }'
    },
    // ⚡ MODIFIÉ POUR I18N
    description: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Description en plusieurs langues'
    }
  }, {
    tableName: 'materiau',
    timestamps: false
  });

  // Associations
  Materiau.associate = (models) => {
    Materiau.hasMany(models.Artisanat, { foreignKey: 'id_materiau' });
  };

  // ⚡ NOUVELLES MÉTHODES I18N
  Materiau.prototype.getNom = function(lang = 'fr') {
    return this.nom?.[lang] || this.nom?.fr || this.nom?.ar || '';
  };

  Materiau.prototype.getDescription = function(lang = 'fr') {
    return this.description?.[lang] || this.description?.fr || '';
  };

  return Materiau;
};
