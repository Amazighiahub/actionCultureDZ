const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OeuvreArt = sequelize.define('OeuvreArt', {
    id_oeuvre_art: {
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
    technique: {
      type: DataTypes.STRING(255)
    },
    dimensions: {
      type: DataTypes.STRING(255)
    },
    support: {
      type: DataTypes.STRING(255)
    }
  }, {
    tableName: 'oeuvre_art',
    timestamps: false
  });

  // Associations
  OeuvreArt.associate = (models) => {
    OeuvreArt.belongsTo(models.Oeuvre, { foreignKey: 'id_oeuvre' });
  };

  return OeuvreArt;
};