const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Film = sequelize.define('Film', {
    id_film: {
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
    duree_minutes: {
      type: DataTypes.INTEGER
    },
    realisateur: {
      type: DataTypes.STRING(255)
    },
    id_genre: {
      type: DataTypes.INTEGER,
      references: {
        model: 'genre',
        key: 'id_genre'
      }
    }
  }, {
    tableName: 'film',
    timestamps: false
  });

  // Associations
  Film.associate = (models) => {
    Film.belongsTo(models.Oeuvre, { foreignKey: 'id_oeuvre' });
    Film.belongsTo(models.Genre, { foreignKey: 'id_genre' });
  };

  return Film;
};
