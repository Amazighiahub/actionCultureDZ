// models/TypeUser.js - ⚡ MODIFIÉ POUR I18N
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TypeUser = sequelize.define('TypeUser', {
    id_type_user: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // ⚡ MODIFIÉ POUR I18N
    nom_type: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { fr: '' },
      comment: 'Nom du type en plusieurs langues { fr: "Visiteur", ar: "زائر", en: "Visitor" }'
    },
    // ⚡ MODIFIÉ POUR I18N
    description: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Description en plusieurs langues'
    }
  }, {
    tableName: 'type_user',
    timestamps: false
  });

  // Associations
  TypeUser.associate = (models) => {
    TypeUser.hasMany(models.User, { 
      foreignKey: 'id_type_user',
      as: 'Users'
    });
    TypeUser.hasMany(models.OeuvreUser, { 
      foreignKey: 'id_type_user',
      as: 'OeuvreUsers'
    });
  };

  // ⚡ NOUVELLES MÉTHODES I18N
  TypeUser.prototype.getNomType = function(lang = 'fr') {
    return this.nom_type?.[lang] || this.nom_type?.fr || this.nom_type?.ar || '';
  };

  TypeUser.prototype.getDescription = function(lang = 'fr') {
    return this.description?.[lang] || this.description?.fr || '';
  };

  return TypeUser;
};
