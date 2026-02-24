// models/Oeuvre.js - ⚡ MODIFIÉ POUR I18N
const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
  const Oeuvre = sequelize.define('Oeuvre', {
    id_oeuvre: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // ⚡ MODIFIÉ POUR I18N
    titre: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { fr: '' },
      comment: 'Titre en plusieurs langues { fr: "Le Petit Prince", ar: "الأمير الصغير", en: "The Little Prince" }'
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
      },
      comment: 'Langue originale de l\'oeuvre'
    },
    annee_creation: {
      type: DataTypes.INTEGER
    },
    // ⚡ MODIFIÉ POUR I18N
    description: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Description en plusieurs langues'
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
        fields: ['id_langue', 'id_oeuvre_originale']
      }
    ]
  });

  // Associations
  Oeuvre.associate = (models) => {
    Oeuvre.belongsTo(models.TypeOeuvre, { foreignKey: 'id_type_oeuvre' });
    Oeuvre.belongsTo(models.Langue, { foreignKey: 'id_langue' });
    Oeuvre.belongsTo(models.User, { as: 'Saiseur', foreignKey: 'saisi_par' });
    Oeuvre.belongsTo(models.User, { as: 'Validateur', foreignKey: 'validateur_id' });
    Oeuvre.belongsTo(models.Oeuvre, { as: 'OeuvreOriginale', foreignKey: 'id_oeuvre_originale' });
    Oeuvre.hasMany(models.OeuvreIntervenant, { foreignKey: 'id_oeuvre' });
    
    Oeuvre.hasMany(models.Oeuvre, { 
      as: 'Traductions', 
      foreignKey: 'id_oeuvre_originale' 
    });
    
    Oeuvre.belongsToMany(models.User, { 
      through: models.OeuvreUser, 
      foreignKey: 'id_oeuvre',
      as: 'Users'
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
      foreignKey: 'id_oeuvre',
      as: 'Tags'
    });
    
    Oeuvre.belongsToMany(models.Evenement, { 
      through: models.EvenementOeuvre, 
      foreignKey: 'id_oeuvre' 
    });
    
    Oeuvre.hasOne(models.Livre, { foreignKey: 'id_oeuvre' });
    Oeuvre.hasOne(models.Film, { foreignKey: 'id_oeuvre' });
    Oeuvre.hasOne(models.AlbumMusical, { foreignKey: 'id_oeuvre' });
    Oeuvre.hasOne(models.Article, { foreignKey: 'id_oeuvre' });
    Oeuvre.hasOne(models.ArticleScientifique, { foreignKey: 'id_oeuvre' });
    Oeuvre.hasOne(models.Artisanat, { foreignKey: 'id_oeuvre' });
    Oeuvre.hasOne(models.OeuvreArt, { foreignKey: 'id_oeuvre' });
    
    Oeuvre.hasMany(models.Media, { foreignKey: 'id_oeuvre' });
    Oeuvre.hasMany(models.CritiqueEvaluation, { foreignKey: 'id_oeuvre' });
  };

  // ⚡ NOUVELLES MÉTHODES I18N
  Oeuvre.prototype.getTitre = function(lang = 'fr') {
    return this.titre?.[lang] || this.titre?.fr || this.titre?.ar || '';
  };

  Oeuvre.prototype.getDescription = function(lang = 'fr') {
    return this.description?.[lang] || this.description?.fr || '';
  };

  Oeuvre.prototype.estUneTraduction = function() {
    return this.id_oeuvre_originale !== null;
  };

  Oeuvre.prototype.getTraductions = async function() {
    if (this.estUneTraduction()) {
      return await Oeuvre.findAll({
        where: {
          id_oeuvre_originale: this.id_oeuvre_originale,
          id_oeuvre: { [Op.ne]: this.id_oeuvre }
        },
        include: [{ model: sequelize.models.Langue }]
      });
    } else {
      return await Oeuvre.findAll({
        where: { id_oeuvre_originale: this.id_oeuvre },
        include: [{ model: sequelize.models.Langue }]
      });
    }
  };

  // Hooks
  Oeuvre.beforeUpdate(async (oeuvre, options) => {
    if (oeuvre.id_oeuvre_originale === oeuvre.id_oeuvre) {
      throw new Error("Une œuvre ne peut pas être sa propre traduction");
    }
  });

  return Oeuvre;
};
