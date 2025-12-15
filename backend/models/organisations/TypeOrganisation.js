// models/TypeOrganisation.js - ⚡ MODIFIÉ POUR I18N
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TypeOrganisation = sequelize.define('TypeOrganisation', {
    id_type_organisation: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // ⚡ MODIFIÉ POUR I18N
    nom: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { fr: '' },
      comment: 'Nom en plusieurs langues { fr: "Association", ar: "جمعية", en: "Association" }'
    }
  }, {
    tableName: 'typeorganisation',
    timestamps: false
  });

  // Associations
  TypeOrganisation.associate = (models) => {
    TypeOrganisation.hasMany(models.Organisation, { foreignKey: 'id_type_organisation' });
  };

  // ⚡ NOUVELLE MÉTHODE I18N
  TypeOrganisation.prototype.getNom = function(lang = 'fr') {
    return this.nom?.[lang] || this.nom?.fr || this.nom?.ar || '';
  };

  return TypeOrganisation;
};
