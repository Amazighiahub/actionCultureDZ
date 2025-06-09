// models/Media.js - Modèle Media mis à jour avec tous les champs

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
    titre: {
      type: DataTypes.STRING(255)
    },
    description: {
      type: DataTypes.TEXT
    },
    
    // ===== NOUVEAUX CHAMPS AJOUTÉS =====
    
    // Tags pour catégoriser le média
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
    
    // Métadonnées supplémentaires (dimensions, EXIF, etc.)
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Métadonnées du fichier (EXIF, dimensions, etc.)'
    },
    
    // Qualité du média
    qualite: {
      type: DataTypes.ENUM('basse', 'moyenne', 'haute', 'originale'),
      defaultValue: 'haute',
      comment: 'Qualité/résolution du média'
    },
    
    // Droits d'usage
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
    
    // Texte alternatif pour l'accessibilité
    alt_text: {
      type: DataTypes.STRING(500),
      comment: 'Texte alternatif pour l\'accessibilité'
    },
    
    // Crédit / Attribution
    credit: {
      type: DataTypes.STRING(255),
      comment: 'Crédit photo/vidéo (photographe, source, etc.)'
    },
    
    // ===== CHAMPS EXISTANTS =====
    
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
    
    // Index pour améliorer les performances
    indexes: [
      {
        fields: ['id_oeuvre']
      },
      {
        fields: ['id_evenement']
      },
      {
        fields: ['type_media']
      },
      {
        fields: ['visible_public']
      },
      {
        fields: ['qualite']
      },
      {
        fields: ['droits_usage']
      }
    ],
    
    // Hooks pour validation
    hooks: {
      beforeValidate: (media) => {
        // S'assurer que tags est toujours un array
        if (media.tags && !Array.isArray(media.tags)) {
          media.tags = [];
        }
        
        // S'assurer que metadata est toujours un objet
        if (media.metadata && typeof media.metadata !== 'object') {
          media.metadata = {};
        }
      },
      
      beforeCreate: (media) => {
        // Générer un alt_text par défaut si non fourni
        if (!media.alt_text && media.titre) {
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
  
  // Méthodes d'instance
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