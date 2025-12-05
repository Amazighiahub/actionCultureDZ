const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Monument = sequelize.define('Monument', {
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
      type: DataTypes.ENUM('Mosquée', 'Palais', 'Statue', 'Tour', 'Musée'),
      allowNull: false
    }
  }, {
    tableName: 'monuments',
    timestamps: true
  });

  // Associations
  Monument.associate = (models) => {
    Monument.belongsTo(models.DetailLieu, { foreignKey: 'id_detail_lieu' });
  };

  return Monument;
};