const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Service = sequelize.define('Service', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_lieu: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'lieu',
        key: 'id_lieu'
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
    Service.belongsTo(models.Lieu, { foreignKey: 'id_lieu' });
  };

  return Service;
};