// models/Categorie.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Categorie = sequelize.define('Categorie', {
    id_categorie: {
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
    // Relation Many-to-Many avec Genre via GenreCategorie
    Categorie.belongsToMany(models.Genre, {
      through: models.GenreCategorie,
      foreignKey: 'id_categorie',
      otherKey: 'id_genre',
      as: 'genres'
    });
    
    // Relation directe avec la table de liaison pour les requêtes complexes
    Categorie.hasMany(models.GenreCategorie, { 
      foreignKey: 'id_categorie',
      as: 'genreCategories'
    });
    
    // Relation avec les œuvres via la table de liaison
    Categorie.belongsToMany(models.Oeuvre, { 
  through: models.OeuvreCategorie,  // Changé de CategorieOeuvre à OeuvreCategorie
  foreignKey: 'id_categorie',
  otherKey: 'id_oeuvre',
  as: 'oeuvres'
});

Categorie.hasMany(models.OeuvreCategorie, {  // Changé aussi ici
  foreignKey: 'id_categorie',
  as: 'categorieOeuvres'
});
    
  };

  return Categorie;
};