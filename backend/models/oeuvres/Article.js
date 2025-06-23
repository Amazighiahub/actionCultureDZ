const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Article = sequelize.define('Article', {
    id_article: {
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
    auteur: {
      type: DataTypes.STRING(255)
    },
    source: {
      type: DataTypes.STRING(255)
    },
   
    // CHAMP SUPPRIMÉ : categorie
    sous_titre: {
      type: DataTypes.STRING(500)
    },
    date_publication: {
      type: DataTypes.DATE
    },
    date_derniere_modification: {
      type: DataTypes.DATE
    },
    resume: {
      type: DataTypes.TEXT
    },
    contenu_complet: {
      type: DataTypes.TEXT('long')
    },
    url_source: {
      type: DataTypes.STRING(500)
    },
    url_archive: {
      type: DataTypes.STRING(500)
    },
    statut: {
      type: DataTypes.ENUM('brouillon', 'publie', 'archive', 'supprime'),
      defaultValue: 'publie'
    },
    langue_contenu: {
      type: DataTypes.STRING(10)
    },
    nb_mots: {
      type: DataTypes.INTEGER
    },
    temps_lecture: {
      type: DataTypes.INTEGER
    },
    niveau_credibilite: {
      type: DataTypes.ENUM('tres_fiable', 'fiable', 'moyen', 'peu_fiable', 'non_verifie'),
      defaultValue: 'non_verifie'
    },
    fact_checked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    paywall: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    nb_vues: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    nb_partages: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    note_qualite: {
      type: DataTypes.DECIMAL(3, 2)
    },
    commentaires_moderation: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'article',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification'
  });

  // Associations
  Article.associate = (models) => {
    Article.belongsTo(models.Oeuvre, { foreignKey: 'id_oeuvre' });
    // NOUVELLE ASSOCIATION AJOUTÉE
    Article.belongsTo(models.Genre, { foreignKey: 'id_genre' });
  };

  return Article;
};