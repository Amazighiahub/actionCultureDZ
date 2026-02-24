const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Localite = sequelize.define('Localite', {
    id_localite: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    localite_name_ascii: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    id_commune: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'communes',
        key: 'id_commune'
      }
    }
  }, {
    tableName: 'localite',
    timestamps: false
  });

  // Associations
  Localite.associate = (models) => {
    Localite.belongsTo(models.Commune, { foreignKey: 'id_commune' });
    Localite.hasMany(models.Lieu, { foreignKey: 'localiteId' });
  };

  return Localite;
};