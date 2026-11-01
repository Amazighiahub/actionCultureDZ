const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Livre = sequelize.define('Livre', {
    id_livre: {
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
    isbn: {
      type: DataTypes.STRING(20),
      // ISBN-10 (dernier caractère : chiffre ou X) ou ISBN-13, avec ou sans tirets
      validate: { is: /^[0-9-]{9,16}[0-9X]$/ }
    },
    nb_pages: {
      type: DataTypes.INTEGER
    },
    id_genre: {
      type: DataTypes.INTEGER,
      references: {
        model: 'genre',
        key: 'id_genre'
      }
    }
  }, {
    tableName: 'livre',
    timestamps: false
  });

  // Associations
  Livre.associate = (models) => {
    Livre.belongsTo(models.Oeuvre, { foreignKey: 'id_oeuvre', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
    Livre.belongsTo(models.Genre, { foreignKey: 'id_genre', onDelete: 'SET NULL' });
  };

  return Livre;
};
