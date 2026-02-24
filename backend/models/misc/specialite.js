// models/Specialite.js - ⚡ MODIFIÉ POUR I18N
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Specialite = sequelize.define('Specialite', {
    id_specialite: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // ⚡ MODIFIÉ POUR I18N
    nom_specialite: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { fr: '' },
      comment: 'Nom en plusieurs langues { fr: "Peinture", ar: "رسم", en: "Painting" }'
    },
    // ⚡ MODIFIÉ POUR I18N
    description: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Description en plusieurs langues'
    },
    categorie: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'specialites',
    timestamps: false
  });

  // ⚡ NOUVELLES MÉTHODES I18N
  Specialite.prototype.getNomSpecialite = function(lang = 'fr') {
    return this.nom_specialite?.[lang] || this.nom_specialite?.fr || this.nom_specialite?.ar || '';
  };

  Specialite.prototype.getDescription = function(lang = 'fr') {
    return this.description?.[lang] || this.description?.fr || '';
  };

  return Specialite;
};
