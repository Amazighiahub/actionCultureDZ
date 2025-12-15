// models/TypeOeuvre.js - ⚡ MODIFIÉ POUR I18N
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TypeOeuvre = sequelize.define('TypeOeuvre', {
    id_type_oeuvre: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // ⚡ MODIFIÉ POUR I18N
    nom_type: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { fr: '' },
      comment: 'Nom du type en plusieurs langues { fr: "Livre", ar: "كتاب", en: "Book" }'
    },
    // ⚡ MODIFIÉ POUR I18N
    description: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Description en plusieurs langues'
    }
  }, {
    tableName: 'type_oeuvre',
    timestamps: false
  });

  // Associations
  TypeOeuvre.associate = (models) => {
    TypeOeuvre.hasMany(models.Oeuvre, { 
      foreignKey: 'id_type_oeuvre',
      as: 'oeuvres'
    });
    
    TypeOeuvre.belongsToMany(models.Genre, { 
      through: models.TypeOeuvreGenre,
      foreignKey: 'id_type_oeuvre',
      otherKey: 'id_genre',
      as: 'genres'
    });
    
    TypeOeuvre.hasMany(models.TypeOeuvreGenre, { 
      foreignKey: 'id_type_oeuvre',
      as: 'typeOeuvreGenres'
    });
  };

  // ⚡ NOUVELLES MÉTHODES I18N
  TypeOeuvre.prototype.getNomType = function(lang = 'fr') {
    return this.nom_type?.[lang] || this.nom_type?.fr || this.nom_type?.ar || '';
  };

  TypeOeuvre.prototype.getDescription = function(lang = 'fr') {
    return this.description?.[lang] || this.description?.fr || '';
  };

  return TypeOeuvre;
};
