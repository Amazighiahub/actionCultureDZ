// models/Media.js - ⚡ MODIFIÉ POUR I18N
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Media = sequelize.define('Media', {
    id_media: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_oeuvre: {
      type: DataTypes.INTEGER,
      references: {
        model: 'oeuvre',
        key: 'id_oeuvre'
      }
    },
    id_evenement: {
      type: DataTypes.INTEGER,
      references: {
        model: 'evenement',
        key: 'id_evenement'
      }
    },
    type_media: {
      type: DataTypes.ENUM('image', 'video', 'document', 'diaporama', 'audio'),
      allowNull: false
    },
    url: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    // ⚡ MODIFIÉ POUR I18N
    titre: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Titre en plusieurs langues { fr: "...", ar: "...", en: "..." }'
    },
    // ⚡ MODIFIÉ POUR I18N
    description: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Description en plusieurs langues'
    },
    tags: {
      type: DataTypes.JSON,
      defaultValue: [],
      get() {
        const tags = this.getDataValue('tags');
        return Array.isArray(tags) ? tags : [];
      },
      set(value) {
        this.setDataValue('tags', Array.isArray(value) ? value : []);
      }
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Métadonnées du fichier (EXIF, dimensions, etc.)'
    },
    qualite: {
      type: DataTypes.ENUM('basse', 'moyenne', 'haute', 'originale'),
      defaultValue: 'haute',
      comment: 'Qualité/résolution du média'
    },
    droits_usage: {
      type: DataTypes.ENUM(
        'libre',
        'commercial',
        'presse',
        'personnel',
        'educatif',
        'restriction'
      ),
      defaultValue: 'libre',
      comment: 'Droits d\'utilisation du média'
    },
    // ⚡ MODIFIÉ POUR I18N
    alt_text: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Texte alternatif en plusieurs langues pour l\'accessibilité'
    },
    credit: {
      type: DataTypes.STRING(255),
      comment: 'Crédit photo/vidéo (photographe, source, etc.)'
    },
    visible_public: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    ordre: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    thumbnail_url: {
      type: DataTypes.STRING(500)
    },
    is_Principale: {
      type: DataTypes.BOOLEAN
    },
    duree: {
      type: DataTypes.INTEGER,
      comment: 'Durée en secondes pour vidéo/audio'
    },
    taille_fichier: {
      type: DataTypes.INTEGER,
      comment: 'Taille du fichier en bytes'
    },
    mime_type: {
      type: DataTypes.STRING(100)
    }
  }, {
    tableName: 'media',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification',
    
    indexes: [
      { fields: ['id_oeuvre'] },
      { fields: ['id_evenement'] },
      { fields: ['type_media'] },
      { fields: ['visible_public'] },
      { fields: ['qualite'] },
      { fields: ['droits_usage'] }
    ],
    
    hooks: {
      beforeValidate: (media) => {
        if (media.tags && !Array.isArray(media.tags)) {
          media.tags = [];
        }
        if (media.metadata && typeof media.metadata !== 'object') {
          media.metadata = {};
        }
      },
      beforeCreate: (media) => {
        // Générer un alt_text par défaut si non fourni
        if ((!media.alt_text || Object.keys(media.alt_text).length === 0) && media.titre) {
          media.alt_text = media.titre;
        }
      }
    }
  });

  // Associations
  Media.associate = (models) => {
    Media.belongsTo(models.Oeuvre, { foreignKey: 'id_oeuvre' });
    Media.belongsTo(models.Evenement, { foreignKey: 'id_evenement' });
  };
  
  // ⚡ NOUVELLES MÉTHODES I18N
  Media.prototype.getTitre = function(lang = 'fr') {
    return this.titre?.[lang] || this.titre?.fr || this.titre?.ar || '';
  };

  Media.prototype.getDescription = function(lang = 'fr') {
    return this.description?.[lang] || this.description?.fr || '';
  };

  Media.prototype.getAltText = function(lang = 'fr') {
    return this.alt_text?.[lang] || this.alt_text?.fr || this.getTitre(lang) || '';
  };

  // Méthodes existantes
  Media.prototype.addTag = function(tag) {
    const tags = this.tags || [];
    if (!tags.includes(tag)) {
      tags.push(tag);
      this.tags = tags;
    }
  };
  
  Media.prototype.removeTag = function(tag) {
    const tags = this.tags || [];
    const index = tags.indexOf(tag);
    if (index > -1) {
      tags.splice(index, 1);
      this.tags = tags;
    }
  };
  
  Media.prototype.hasTag = function(tag) {
    const tags = this.tags || [];
    return tags.includes(tag);
  };
  
  Media.prototype.setMetadata = function(key, value) {
    const metadata = this.metadata || {};
    metadata[key] = value;
    this.metadata = metadata;
  };
  
  Media.prototype.getMetadata = function(key) {
    const metadata = this.metadata || {};
    return metadata[key];
  };

  return Media;
};
