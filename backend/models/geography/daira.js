const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Daira = sequelize.define('Daira', {
    id_daira: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    daira_name_ascii: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    wilayaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'wilayas',
        key: 'id_wilaya'
      }
    }
  }, {
    tableName: 'dairas',
    timestamps: true
  });

  // Associations
  Daira.associate = (models) => {
    Daira.belongsTo(models.Wilaya, { foreignKey: 'wilayaId' });
    Daira.hasMany(models.Commune, { foreignKey: 'dairaId', as: 'Communes' });
    // Note: Lieu n'a pas de dairaId direct, la relation passe par Commune
  };

  return Daira;
};