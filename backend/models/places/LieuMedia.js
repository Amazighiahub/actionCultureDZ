const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LieuMedia = sequelize.define('LieuMedia', {
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
   
    type: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    url: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.STRING(255)
    }
  }, {
    tableName: 'lieu_medias',
    timestamps: true
  });

  // Associations
  LieuMedia.associate = (models) => {
    LieuMedia.belongsTo(models.Lieu, { foreignKey: 'id_lieu' });
  };

  return LieuMedia;
};