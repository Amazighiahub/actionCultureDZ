const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DetailLieu = sequelize.define('DetailLieu', {
    id_detailLieu: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_lieu: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,  // Un lieu = un seul detail_lieu
      references: {
        model: 'lieu',
        key: 'id_lieu'
      }
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
    referencesHistoriques: {
      type: DataTypes.TEXT
    },
    noteMoyenne: {
      type: DataTypes.FLOAT,
      validate: {
        min: 0,
        max: 5
      }
    }
  }, {
    tableName: 'detail_lieux',
    timestamps: true
  });

  // Associations
  DetailLieu.associate = (models) => {
    DetailLieu.belongsTo(models.Lieu, { foreignKey: 'id_lieu' });
    DetailLieu.hasMany(models.Monument, { foreignKey: 'id_detail_lieu', onDelete: 'CASCADE' });
    DetailLieu.hasMany(models.Vestige, { foreignKey: 'id_detail_lieu', onDelete: 'CASCADE' });
    // Service n'est plus lié à DetailLieu mais directement à Lieu
  };

  return DetailLieu;
};