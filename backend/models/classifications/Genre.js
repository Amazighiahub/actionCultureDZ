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
      allowNull: false
    },
    description: {
      type: DataTypes.STRING(100),
      allowNull: false
    }
  }, {
    tableName: 'genre',
    timestamps: false
  });

  // Associations
  Genre.associate = (models) => {
    Genre.hasMany(models.Livre, { foreignKey: 'id_genre' });
    Genre.hasMany(models.Film, { foreignKey: 'id_genre' });
    Genre.hasMany(models.AlbumMusical, { foreignKey: 'id_genre' });
    
    // NOUVELLES ASSOCIATIONS POUR ARTICLES
    Genre.hasMany(models.Article, { foreignKey: 'id_genre' });
    Genre.hasMany(models.ArticleScientifique, { foreignKey: 'id_genre' });
    
    // NOUVELLES ASSOCIATIONS POUR LA HIÉRARCHIE
    Genre.belongsToMany(models.TypeOeuvre, { 
      through: models.TypeOeuvreGenre,
      foreignKey: 'id_genre',
      otherKey: 'id_type_oeuvre',
      as: 'TypesAssocies'
    });
    
    Genre.belongsToMany(models.Categorie, { 
      through: models.GenreCategorie,
      foreignKey: 'id_genre',
      otherKey: 'id_categorie',
      as: 'CategoriesDisponibles'
    });
  };

  return Genre;
};