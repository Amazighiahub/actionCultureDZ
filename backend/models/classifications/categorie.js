// models/Categorie.js - ⚡ MODIFIÉ POUR I18N
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Categorie = sequelize.define('Categorie', {
    id_categorie: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // ⚡ MODIFIÉ POUR I18N
    nom: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { fr: '' },
      comment: 'Nom en plusieurs langues { fr: "Roman", ar: "رواية", en: "Novel", "tz-ltn": "...", "tz-tfng": "..." }'
    },
    // ⚡ MODIFIÉ POUR I18N
    description: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Description en plusieurs langues'
    },
    icone: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    couleur: {
      type: DataTypes.STRING(7),
      allowNull: true,
      validate: {
        is: /^#[0-9A-F]{6}$/i
      }
    },
    ordre_affichage: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'categorie',
    timestamps: false
  });

  // Associations
  Categorie.associate = (models) => {
    Categorie.belongsToMany(models.Genre, {
      through: models.GenreCategorie,
      foreignKey: 'id_categorie',
      otherKey: 'id_genre',
      as: 'genres'
    });
    
    Categorie.hasMany(models.GenreCategorie, { 
      foreignKey: 'id_categorie',
      as: 'genreCategories'
    });
    
    Categorie.belongsToMany(models.Oeuvre, { 
      through: models.OeuvreCategorie,
      foreignKey: 'id_categorie',
      otherKey: 'id_oeuvre',
      as: 'oeuvres'
    });

    Categorie.hasMany(models.OeuvreCategorie, {
      foreignKey: 'id_categorie',
      as: 'categorieOeuvres'
    });
  };

  // ⚡ NOUVELLES MÉTHODES I18N
  Categorie.prototype.getNom = function(lang = 'fr') {
    return this.nom?.[lang] || this.nom?.fr || this.nom?.ar || '';
  };

  Categorie.prototype.getDescription = function(lang = 'fr') {
    return this.description?.[lang] || this.description?.fr || '';
  };

  return Categorie;
};
