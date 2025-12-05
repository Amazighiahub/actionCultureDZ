const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Vestige = sequelize.define('Vestige', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_detail_lieu: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'detail_lieux',
        key: 'id_detailLieu'
      }
    },
    nom: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('Ruines', 'Murailles', 'Site archéologique'),
      allowNull: false
    }
  }, {
    tableName: 'vestiges',
    timestamps: true
  });

  // Associations
  Vestige.associate = (models) => {
    Vestige.belongsTo(models.DetailLieu, { foreignKey: 'id_detail_lieu' });
  };

  return Vestige;
};