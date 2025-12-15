// models/Editeur.js - ⚡ MODIFIÉ POUR I18N
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Editeur = sequelize.define('Editeur', {
    id_editeur: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // ⚡ MODIFIÉ POUR I18N
    nom: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { fr: '' },
      comment: 'Nom en plusieurs langues { fr: "Éditions Adlis", ar: "أدليس للنشر", en: "Adlis Publishing" }'
    },
    type_editeur: {
      type: DataTypes.ENUM('maison_edition', 'label_musique', 'studio_cinema', 'galerie_art', 'editeur_scientifique', 'presse', 'editeur_numerique', 'autre'),
      allowNull: false
    },
    pays: {
      type: DataTypes.STRING(100)
    },
    ville: {
      type: DataTypes.STRING(100)
    },
    adresse: {
      type: DataTypes.TEXT
    },
    site_web: {
      type: DataTypes.STRING(255)
    },
    email: {
      type: DataTypes.STRING(255)
    },
    telephone: {
      type: DataTypes.STRING(20)
    },
    // ⚡ MODIFIÉ POUR I18N
    description: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Description en plusieurs langues'
    },
    annee_creation: {
      type: DataTypes.INTEGER
    },
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'editeur',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification'
  });

  // Associations
  Editeur.associate = (models) => {
    Editeur.belongsToMany(models.Oeuvre, { 
      through: models.OeuvreEditeur, 
      foreignKey: 'id_editeur' 
    });
  };

  // ⚡ NOUVELLES MÉTHODES I18N
  Editeur.prototype.getNom = function(lang = 'fr') {
    return this.nom?.[lang] || this.nom?.fr || this.nom?.ar || '';
  };

  Editeur.prototype.getDescription = function(lang = 'fr') {
    return this.description?.[lang] || this.description?.fr || '';
  };

  return Editeur;
};
