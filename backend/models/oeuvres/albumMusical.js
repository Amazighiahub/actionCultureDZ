const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AlbumMusical = sequelize.define('AlbumMusical', {
    id_album: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_oeuvre: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'oeuvre',
        key: 'id_oeuvre'
      }
    },
    duree: {
      type: DataTypes.INTEGER
    },
    id_genre: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'genre',
        key: 'id_genre'
      }
    },
    label: {
      type: DataTypes.STRING(100),
      allowNull: false
    }
  }, {
    tableName: 'albummusical',
    timestamps: false
  });

  // Associations
  AlbumMusical.associate = (models) => {
    AlbumMusical.belongsTo(models.Oeuvre, { foreignKey: 'id_oeuvre' });
    AlbumMusical.belongsTo(models.Genre, { foreignKey: 'id_genre' });
  };

  return AlbumMusical;
};