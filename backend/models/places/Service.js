const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Service = sequelize.define('Service', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_detailLieu: {
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
    }
  }, {
    tableName: 'services',
    timestamps: true
  });

  // Associations
  Service.associate = (models) => {
    Service.belongsTo(models.DetailLieu, { foreignKey: 'id_detailLieu' });
  };

  return Service;
};