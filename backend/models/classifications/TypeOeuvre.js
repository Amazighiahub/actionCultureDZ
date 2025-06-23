// models/TypeOeuvre.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TypeOeuvre = sequelize.define('TypeOeuvre', {
    id_type_oeuvre: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'type_oeuvre',
    timestamps: false
  });

  // Associations
  TypeOeuvre.associate = (models) => {
    // Relation avec les œuvres
    TypeOeuvre.hasMany(models.Oeuvre, { 
      foreignKey: 'id_type_oeuvre',
      as: 'oeuvres'
    });
    
    // Relation Many-to-Many avec Genre via TypeOeuvreGenre
    TypeOeuvre.belongsToMany(models.Genre, { 
      through: models.TypeOeuvreGenre,
      foreignKey: 'id_type_oeuvre',
      otherKey: 'id_genre',
      as: 'genres'
    });
    
    // Relation directe avec la table de liaison pour les requêtes complexes
    TypeOeuvre.hasMany(models.TypeOeuvreGenre, { 
      foreignKey: 'id_type_oeuvre',
      as: 'typeOeuvreGenres'
    });
  };

  return TypeOeuvre;
};