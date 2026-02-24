// models/Genre.js - ⚡ MODIFIÉ POUR I18N
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Genre = sequelize.define('Genre', {
    id_genre: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // ⚡ MODIFIÉ POUR I18N
    nom: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { fr: '' },
      comment: 'Nom en plusieurs langues { fr: "...", ar: "...", en: "...", "tz-ltn": "...", "tz-tfng": "..." }'
    },
    // ⚡ MODIFIÉ POUR I18N
    description: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Description en plusieurs langues'
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
    tableName: 'genre',
    timestamps: false
  });

  // Associations
  Genre.associate = (models) => {
    if (models.Livre) Genre.hasMany(models.Livre, { foreignKey: 'id_genre', as: 'livres' });
    if (models.Film) Genre.hasMany(models.Film, { foreignKey: 'id_genre', as: 'films' });
    if (models.AlbumMusical) Genre.hasMany(models.AlbumMusical, { foreignKey: 'id_genre', as: 'albums' });
    if (models.Article) Genre.hasMany(models.Article, { foreignKey: 'id_genre', as: 'articles' });
    if (models.ArticleScientifique) Genre.hasMany(models.ArticleScientifique, { foreignKey: 'id_genre', as: 'articlesScientifiques' });
    
    Genre.belongsToMany(models.TypeOeuvre, { 
      through: models.TypeOeuvreGenre,
      foreignKey: 'id_genre',
      otherKey: 'id_type_oeuvre',
      as: 'typesOeuvre'
    });
    
    Genre.belongsToMany(models.Categorie, { 
      through: models.GenreCategorie,
      foreignKey: 'id_genre',
      otherKey: 'id_categorie',
      as: 'categories'
    });
    
    Genre.hasMany(models.TypeOeuvreGenre, { 
      foreignKey: 'id_genre',
      as: 'typeOeuvreGenres'
    });
    
    Genre.hasMany(models.GenreCategorie, { 
      foreignKey: 'id_genre',
      as: 'genreCategories'
    });
    
    if (models.GenreOeuvre) {
      Genre.belongsToMany(models.Oeuvre, {
        through: models.GenreOeuvre,
        foreignKey: 'id_genre',
        otherKey: 'id_oeuvre',
        as: 'oeuvres'
      });
      
      Genre.hasMany(models.GenreOeuvre, {
        foreignKey: 'id_genre',
        as: 'genreOeuvres'
      });
    }
  };

  // ⚡ NOUVELLES MÉTHODES I18N
  Genre.prototype.getNom = function(lang = 'fr') {
    return this.nom?.[lang] || this.nom?.fr || this.nom?.ar || '';
  };

  Genre.prototype.getDescription = function(lang = 'fr') {
    return this.description?.[lang] || this.description?.fr || '';
  };

  return Genre;
};
