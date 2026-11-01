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
      allowNull: true, // un genre supprimé ne doit pas effacer la fiche (migration 20261117)
      references: {
        model: 'genre',
        key: 'id_genre'
      }
    },
    label: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    // album, ep, single, live, compilation
    format: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    nb_pistes: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    // [{ titre, duree: "3:45", compositeur }]
    pistes: {
      type: DataTypes.JSON,
      allowNull: true
    },
    // [{ url: "https://..." }]
    liens_ecoute: {
      type: DataTypes.JSON,
      allowNull: true
    },
    // codes connus (« mandole », « imzad »…) ou texte libre
    instruments: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'albummusical',
    timestamps: false
  });

  // Associations
  AlbumMusical.associate = (models) => {
    AlbumMusical.belongsTo(models.Oeuvre, { foreignKey: 'id_oeuvre', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
    AlbumMusical.belongsTo(models.Genre, { foreignKey: 'id_genre', onDelete: 'SET NULL' });
  };

  return AlbumMusical;
};