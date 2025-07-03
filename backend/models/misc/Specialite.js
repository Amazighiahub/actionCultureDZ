const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Specialite = sequelize.define('Specialite', {
    id_specialite: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom_specialite: {
      type: DataTypes.STRING(100),
      allowNull: false,
     
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    categorie: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'specialites',
    timestamps: false,
    indexes: [
     
      {
        name: 'id_index_specialite',  // Toujours nommer l'index
        fields: ['nom_specialite'],
        unique: true
      }]
  });

  return Specialite;
};