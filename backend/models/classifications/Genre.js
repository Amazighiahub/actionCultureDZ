// models/Genre.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Genre = sequelize.define('Genre', {
    id_genre: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
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
    tableName: 'genre',
    timestamps: false
  });

  // Associations
  Genre.associate = (models) => {
    // Relations avec les œuvres spécifiques
    if (models.Livre) Genre.hasMany(models.Livre, { foreignKey: 'id_genre', as: 'livres' });
    if (models.Film) Genre.hasMany(models.Film, { foreignKey: 'id_genre', as: 'films' });
    if (models.AlbumMusical) Genre.hasMany(models.AlbumMusical, { foreignKey: 'id_genre', as: 'albums' });
    if (models.Article) Genre.hasMany(models.Article, { foreignKey: 'id_genre', as: 'articles' });
    if (models.ArticleScientifique) Genre.hasMany(models.ArticleScientifique, { foreignKey: 'id_genre', as: 'articlesScientifiques' });
    
    // Relation Many-to-Many avec TypeOeuvre via TypeOeuvreGenre
    Genre.belongsToMany(models.TypeOeuvre, { 
      through: models.TypeOeuvreGenre,
      foreignKey: 'id_genre',
      otherKey: 'id_type_oeuvre',
      as: 'typesOeuvre'
    });
    
    // Relation Many-to-Many avec Categorie via GenreCategorie
    Genre.belongsToMany(models.Categorie, { 
      through: models.GenreCategorie,
      foreignKey: 'id_genre',
      otherKey: 'id_categorie',
      as: 'categories'
    });
    
    // Relations directes avec les tables de liaison pour les requêtes complexes
    Genre.hasMany(models.TypeOeuvreGenre, { 
      foreignKey: 'id_genre',
      as: 'typeOeuvreGenres'
    });
    
    Genre.hasMany(models.GenreCategorie, { 
      foreignKey: 'id_genre',
      as: 'genreCategories'
    });
    
    // Relation avec les œuvres via la table de liaison
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

  return Genre;
};