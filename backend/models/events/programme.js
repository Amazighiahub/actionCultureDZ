// models/Programme.js - ⚡ MODIFIÉ POUR I18N
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Programme = sequelize.define('Programme', {
    id_programme: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // ⚡ MODIFIÉ POUR I18N — Titre optionnel
    titre: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Titre en plusieurs langues (optionnel)'
    },
    // ⚡ MODIFIÉ POUR I18N — Description requise
    description: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { fr: '' },
      comment: 'Description en plusieurs langues (requis)',
      validate: {
        notEmpty(value) {
          if (!value || (!value.fr && !value.ar)) {
            throw new Error('La description est requise (au moins en français ou arabe)');
          }
        }
      }
    },
    id_evenement: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'evenement',
        key: 'id_evenement'
      }
    },
    id_lieu: {
      type: DataTypes.INTEGER,
      allowNull: true,
      index: true,
      references: {
        model: 'lieu',
        key: 'id_lieu'
      }
    },
    date_programme: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      validate: {
        isDate: true
      }
    },
    heure_debut: {
      type: DataTypes.TIME,
      allowNull: true
    },
    heure_fin: {
      type: DataTypes.TIME,
      allowNull: true
    },
    lieu_specifique: {
      type: DataTypes.STRING(255)
    },
    ordre: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    statut: {
      type: DataTypes.ENUM('planifie', 'en_cours', 'termine', 'annule', 'reporte'),
      defaultValue: 'planifie'
    },
    type_activite: {
      type: DataTypes.ENUM(
        'conference',
        'atelier',
        'spectacle',
        'exposition',
        'visite',
        'degustation',
        'projection',
        'concert',
        'lecture',
        'debat',
        'formation',
        'ceremonie',
        'autre'
      ),
      defaultValue: 'autre'
    },
    duree_estimee: {
      type: DataTypes.INTEGER
    },
    nb_participants_max: {
      type: DataTypes.INTEGER
    },
    materiel_requis: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    niveau_requis: {
      type: DataTypes.ENUM('debutant', 'intermediaire', 'avance', 'expert')
    },
    langue_principale: {
      type: DataTypes.STRING(10),
      defaultValue: 'ar'
    },
    traduction_disponible: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    enregistrement_autorise: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    diffusion_live: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    support_numerique: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    notes_organisateur: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'programme',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification',
    
    indexes: [
      { fields: ['id_evenement'] },
      { fields: ['date_programme'] },
      { fields: ['ordre'] },
      { fields: ['statut'] },
      { fields: ['type_activite'] }
    ]
  });

  // Associations
  Programme.associate = (models) => {
    Programme.belongsTo(models.Evenement, {
      foreignKey: 'id_evenement',
      as: 'Evenement',
      onDelete: 'CASCADE'
    });

    Programme.belongsTo(models.Lieu, {
      foreignKey: 'id_lieu',
      as: 'Lieu',
      onDelete: 'SET NULL'
    });
    
    Programme.belongsToMany(models.User, {
      through: models.ProgrammeIntervenant,
      foreignKey: 'id_programme',
      otherKey: 'id_user',
      as: 'Intervenants'
    });

    Programme.hasMany(models.ProgrammeIntervenant, {
      foreignKey: 'id_programme',
      as: 'ProgrammeIntervenants',
      onDelete: 'CASCADE'
    });
  };

  // ⚡ NOUVELLES MÉTHODES I18N
  Programme.prototype.getTitre = function(lang = 'fr') {
    return this.titre?.[lang] || this.titre?.fr || this.titre?.ar || '';
  };

  Programme.prototype.getDescription = function(lang = 'fr') {
    return this.description?.[lang] || this.description?.fr || '';
  };

  return Programme;
};
