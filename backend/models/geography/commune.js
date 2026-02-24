const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Commune = sequelize.define('Commune', {
    id_commune: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    commune_name_ascii: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    dairaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'dairas',
        key: 'id_daira'
      }
    }
  }, {
    tableName: 'communes',
    timestamps: true
  });

  // Associations
  Commune.associate = (models) => {
    Commune.belongsTo(models.Daira, { foreignKey: 'dairaId' });
    Commune.hasMany(models.Localite, { foreignKey: 'id_commune' });
    Commune.hasMany(models.Lieu, { foreignKey: 'communeId', as: 'Lieux' });
  };

  return Commune;
};