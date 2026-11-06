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
    // Quelques pages saisies par l'écrivain, affichées par « Lire un extrait »
    extrait: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Extrait en PDF et lecture audio par l'écrivain : médias de l'œuvre (vidés si le média est supprimé)
    id_media_extrait_pdf: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    id_media_extrait_audio: {
      type: DataTypes.INTEGER,
      allowNull: true
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
