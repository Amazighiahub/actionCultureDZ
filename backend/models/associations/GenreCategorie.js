// models/GenreCategorie.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GenreCategorie = sequelize.define('GenreCategorie', {
    id_genre: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'genre',
        key: 'id_genre'
      }
    },
    id_categorie: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'categorie',
        key: 'id_categorie'
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
    tableName: 'genre_categorie',
    timestamps: false
  });

  // Associations
  GenreCategorie.associate = (models) => {
    // Relations belongsTo pour les jointures
    GenreCategorie.belongsTo(models.Genre, { 
      foreignKey: 'id_genre',
      as: 'genre'
    });
    
    GenreCategorie.belongsTo(models.Categorie, { 
      foreignKey: 'id_categorie',
      as: 'categorie'
    });
  };

  return GenreCategorie;
};