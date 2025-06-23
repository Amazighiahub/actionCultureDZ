// models/TypeOeuvreGenre.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TypeOeuvreGenre = sequelize.define('TypeOeuvreGenre', {
    id_type_oeuvre: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'type_oeuvre',
        key: 'id_type_oeuvre'
      }
    },
    id_genre: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'genre',
        key: 'id_genre'
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
    tableName: 'type_oeuvre_genre',
    timestamps: false
  });

  // Associations
  TypeOeuvreGenre.associate = (models) => {
    // Relations belongsTo pour les jointures
    TypeOeuvreGenre.belongsTo(models.TypeOeuvre, { 
      foreignKey: 'id_type_oeuvre',
      as: 'typeOeuvre'
    });
    
    TypeOeuvreGenre.belongsTo(models.Genre, { 
      foreignKey: 'id_genre',
      as: 'genre'
    });
  };

  return TypeOeuvreGenre;
};