const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Programme = sequelize.define('Programme', {
    // ... [TOUS LES CHAMPS RESTENT IDENTIQUES] ...
    id_programme: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    titre: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.TEXT
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
      references: {
        model: 'lieu',
        key: 'id_lieu'
      }
    },
    date_programme: {
      type: DataTypes.DATEONLY,  // Format YYYY-MM-DD
      allowNull: false,
      validate: {
        isDate: true
      }
    },
    heure_debut: {
      type: DataTypes.TIME
    },
    heure_fin: {
      type: DataTypes.TIME
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
      {
        fields: ['id_evenement']
      },
      {
        fields: ['date_programme']  // Nouvel index pour les requêtes par date
      },
      {
        fields: ['ordre']
      },
      {
        fields: ['statut']
      },
      {
        fields: ['type_activite']
      }
    ]
  });

  // Associations CORRIGÉES
  Programme.associate = (models) => {
    Programme.belongsTo(models.Evenement, { 
      foreignKey: 'id_evenement',
      as: 'Evenement'
    });
    
    Programme.belongsTo(models.Lieu, { 
      foreignKey: 'id_lieu',
      as: 'Lieu'
    });
    
    // Relation avec Intervenant (pas User)
    Programme.belongsToMany(models.User, {
    through: models.ProgrammeIntervenant,
    foreignKey: 'id_programme',
    otherKey: 'id_user',  // Maintenant c'est id_user
    as: 'Intervenants'    // On garde l'alias 'Intervenants' pour la clarté
  });
    
    Programme.hasMany(models.ProgrammeIntervenant, {
      foreignKey: 'id_programme',
      as: 'ProgrammeIntervenants'
    });
  };
  
  // Méthodes de classe CORRIGÉES
  
  // Autres méthodes restent identiques...

  return Programme;
}