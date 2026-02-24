// models/Langue.js - ⚡ MODIFIÉ POUR I18N
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Langue = sequelize.define('Langue', {
    id_langue: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // ⚡ MODIFIÉ POUR I18N
    nom: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { fr: '' },
      comment: 'Nom de la langue en plusieurs langues { fr: "Arabe", ar: "العربية", en: "Arabic" }'
    },
    code: {
      type: DataTypes.STRING(10),
      comment: 'Code ISO de la langue (ar, fr, en, etc.)'
    }
  }, {
    tableName: 'langue',
    timestamps: false
  });

  // Associations
  Langue.associate = (models) => {
    Langue.hasMany(models.Oeuvre, { foreignKey: 'id_langue' });
  };

  // ⚡ NOUVELLE MÉTHODE I18N
  Langue.prototype.getNom = function(lang = 'fr') {
    return this.nom?.[lang] || this.nom?.fr || this.nom?.ar || '';
  };

  return Langue;
};
