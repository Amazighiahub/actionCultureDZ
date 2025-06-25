const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ArticleScientifique = sequelize.define('ArticleScientifique', {
    id_article_scientifique: {
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
    // NOUVEAU CHAMP AJOUTÉ
    id_genre: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'genre',
        key: 'id_genre'
      }
    },
    journal: {
      type: DataTypes.STRING(255)
    },
    doi: {
      type: DataTypes.STRING(255),
     
    },
    pages: {
      type: DataTypes.STRING(50)
    },
    volume: {
      type: DataTypes.STRING(50)
    },
    numero: {
      type: DataTypes.STRING(50)
    },
    issn: {
      type: DataTypes.STRING(20)
    },
    impact_factor: {
      type: DataTypes.FLOAT
    },
    peer_reviewed: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    open_access: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    date_soumission: {
      type: DataTypes.DATE
    },
    date_acceptation: {
      type: DataTypes.DATE
    },
    date_publication: {
      type: DataTypes.DATE
    },
    resume: {
      type: DataTypes.TEXT
    },
    citation_apa: {
      type: DataTypes.TEXT
    },
    url_hal: {
      type: DataTypes.STRING(255)
    },
    url_arxiv: {
      type: DataTypes.STRING(255)
    }
  }, 
 
  
  {
    tableName: 'articlescientifique',
    timestamps: false,
    indexes: [
      {
        name: 'idx_doi_unique',  // Toujours nommer l'index
        fields: ['doi'],
        unique: true
      }
    ]
  });

  // Associations
  ArticleScientifique.associate = (models) => {
    ArticleScientifique.belongsTo(models.Oeuvre, { foreignKey: 'id_oeuvre' });
    // NOUVELLE ASSOCIATION AJOUTÉE
    ArticleScientifique.belongsTo(models.Genre, { foreignKey: 'id_genre' });
  };

  return ArticleScientifique;
};