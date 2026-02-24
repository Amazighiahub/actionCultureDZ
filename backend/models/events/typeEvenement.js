// models/TypeEvenement.js - ⚡ MODIFIÉ POUR I18N
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TypeEvenement = sequelize.define('TypeEvenement', {
    id_type_evenement: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // ⚡ MODIFIÉ POUR I18N
    nom_type: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { fr: '' },
      comment: 'Nom du type en plusieurs langues { fr: "Festival", ar: "مهرجان", en: "Festival" }'
    },
    // ⚡ MODIFIÉ POUR I18N
    description: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Description en plusieurs langues'
    },
    // Configuration de soumission pour l'inscription
    config_soumission: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      comment: 'Configuration du formulaire de soumission { type_oeuvre: "livre|poeme|oeuvre_art|film|musique", requis: true/false, max_soumissions: 5, champs_supplementaires: [...] }'
    },
    // Indique si ce type d'événement accepte des soumissions d'œuvres
    accepte_soumissions: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Indique si les participants peuvent soumettre des œuvres'
    }
  }, {
    tableName: 'type_evenement',
    timestamps: false
  });

  // Associations
  TypeEvenement.associate = (models) => {
    TypeEvenement.hasMany(models.Evenement, { foreignKey: 'id_type_evenement' });
  };

  // ⚡ NOUVELLES MÉTHODES I18N
  TypeEvenement.prototype.getNomType = function(lang = 'fr') {
    return this.nom_type?.[lang] || this.nom_type?.fr || this.nom_type?.ar || '';
  };

  TypeEvenement.prototype.getDescription = function(lang = 'fr') {
    return this.description?.[lang] || this.description?.fr || '';
  };

  return TypeEvenement;
};
