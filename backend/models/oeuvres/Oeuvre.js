const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Oeuvre = sequelize.define('Oeuvre', {
    id_oeuvre: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    titre: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    id_type_oeuvre: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'type_oeuvre',
        key: 'id_type_oeuvre'
      }
    },
    id_langue: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'langue',
        key: 'id_langue'
      }
    },
    annee_creation: {
      type: DataTypes.INTEGER
    },
    description: {
      type: DataTypes.TEXT
    },
     prix: {
      type: DataTypes.FLOAT
    },
    saisi_par: {
      type: DataTypes.INTEGER,
      references: {
        model: 'user',
        key: 'id_user'
      }
    },
    id_oeuvre_originale: {
      type: DataTypes.INTEGER,
      references: {
        model: 'oeuvre',
        key: 'id_oeuvre'
      }
    },
    statut: {
      type: DataTypes.ENUM('brouillon', 'en_attente', 'publie', 'rejete', 'archive', 'supprime'),
      allowNull: false,
      defaultValue: 'brouillon'
    },
    date_validation: {
      type: DataTypes.DATE
    },
    validateur_id: {
      type: DataTypes.INTEGER,
      references: {
        model: 'user',
        key: 'id_user'
      }
    },
    raison_rejet: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'oeuvre',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification',
    indexes: [
      {
        unique: true,
        fields: ['titre', 'id_langue', 'id_oeuvre_originale']
      }
    ]
  });

  // Associations
  Oeuvre.associate = (models) => {
    // Relations directes
    Oeuvre.belongsTo(models.TypeOeuvre, { foreignKey: 'id_type_oeuvre' });
    Oeuvre.belongsTo(models.Langue, { foreignKey: 'id_langue' });
    Oeuvre.belongsTo(models.User, { as: 'Saiseur', foreignKey: 'saisi_par' });
    Oeuvre.belongsTo(models.User, { as: 'Validateur', foreignKey: 'validateur_id' });
    Oeuvre.belongsTo(models.Oeuvre, { as: 'OeuvreOriginale', foreignKey: 'id_oeuvre_originale' });
    
    // Relations many-to-many
    Oeuvre.belongsToMany(models.User, { 
      through: models.OeuvreUser, 
      foreignKey: 'id_oeuvre' 
    });
    Oeuvre.belongsToMany(models.Editeur, { 
      through: models.OeuvreEditeur, 
      foreignKey: 'id_oeuvre' 
    });
    Oeuvre.belongsToMany(models.Categorie, { 
      through: models.OeuvreCategorie, 
      foreignKey: 'id_oeuvre' 
    });
    Oeuvre.belongsToMany(models.TagMotCle, { 
      through: models.OeuvreTag, 
      foreignKey: 'id_oeuvre' 
    });
    Oeuvre.belongsToMany(models.Evenement, { 
      through: models.EvenementOeuvre, 
      foreignKey: 'id_oeuvre' 
    });
    
    // Relations spécialisées
    Oeuvre.hasOne(models.Livre, { foreignKey: 'id_oeuvre' });
    Oeuvre.hasOne(models.Film, { foreignKey: 'id_oeuvre' });
    Oeuvre.hasOne(models.AlbumMusical, { foreignKey: 'id_oeuvre' });
    Oeuvre.hasOne(models.Article, { foreignKey: 'id_oeuvre' });
    Oeuvre.hasOne(models.ArticleScientifique, { foreignKey: 'id_oeuvre' });
    Oeuvre.hasOne(models.Artisanat, { foreignKey: 'id_oeuvre' });
    Oeuvre.hasOne(models.OeuvreArt, { foreignKey: 'id_oeuvre' });
    
    // Autres relations
    Oeuvre.hasMany(models.Media, { foreignKey: 'id_oeuvre' });
    Oeuvre.hasMany(models.CritiqueEvaluation, { foreignKey: 'id_oeuvre' });
  };

  return Oeuvre;
};