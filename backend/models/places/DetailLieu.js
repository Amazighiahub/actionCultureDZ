const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DetailLieu = sequelize.define('DetailLieu', {
    id_detailLieu: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    description: {
      type: DataTypes.TEXT
    },
    horaires: {
      type: DataTypes.STRING(255)
    },
    histoire: {
      type: DataTypes.TEXT
    },
    id_lieu: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'lieu',
        key: 'id_lieu'
      }
    },
   
    referencesHistoriques: {
      type: DataTypes.TEXT
    },
    noteMoyenne: {
      type: DataTypes.FLOAT
    }
  }, {
    tableName: 'detail_lieux',
    timestamps: true
  });

  // Associations
  DetailLieu.associate = (models) => {
    DetailLieu.belongsTo(models.Lieu, { foreignKey: 'id_lieu' });
    DetailLieu.hasMany(models.Monument, { foreignKey: 'detailLieuId' });
    DetailLieu.hasMany(models.Vestige, { foreignKey: 'detailLieuId' });
  };

  return DetailLieu;
};