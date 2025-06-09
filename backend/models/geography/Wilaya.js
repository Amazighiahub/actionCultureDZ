const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Wilaya = sequelize.define('Wilaya', {
    id_wilaya: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    codeW: {
      type: DataTypes.INTEGER,
      unique: true
    },
    nom: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    wilaya_name_ascii: {
      type: DataTypes.STRING(255),
      allowNull: false
    }
  }, {
    tableName: 'wilayas',
    timestamps: true
  });

  // Associations
  Wilaya.associate = (models) => {
    Wilaya.hasMany(models.Daira, { foreignKey: 'wilayaId' });
    Wilaya.hasMany(models.Lieu, { foreignKey: 'wilayaId' });
     Wilaya.hasMany(models.User, { foreignKey: 'wilaya_residence' });
  };


  return Wilaya;
};
