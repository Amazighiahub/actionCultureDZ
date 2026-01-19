// models/ProgrammeIntervenant.js - Version pour Users inscrits
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProgrammeIntervenant = sequelize.define('ProgrammeIntervenant', {
    id_programme: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      references: {
        model: 'programme',
        key: 'id_programme'
      }
    },
    id_user: {  // Utiliser id_user pour les utilisateurs inscrits
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      references: {
        model: 'user',  // Référence à la table user
        key: 'id_user'
      }
    },
    role_intervenant: {
      type: DataTypes.ENUM('principal', 'co_intervenant', 'moderateur', 'invite', 'animateur'),
      defaultValue: 'principal'
    },
    ordre_intervention: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Ordre de passage des intervenants'
    },
    // ✅ AJOUT: Heures spécifiques par intervenant
    heure_debut_intervention: {
      type: DataTypes.TIME,
      allowNull: true,
      comment: 'Heure de début de l\'intervention'
    },
    heure_fin_intervention: {
      type: DataTypes.TIME,
      allowNull: true,
      comment: 'Heure de fin de l\'intervention'
    },
    duree_intervention: {
      type: DataTypes.INTEGER,
      comment: 'Durée d\'intervention en minutes'
    },
    sujet_intervention: {
      type: DataTypes.STRING(500),
      comment: 'Sujet/thème spécifique de l\'intervention'
    },
    biographie_courte: {
      type: DataTypes.TEXT,
      comment: 'Bio courte spécifique pour cet événement'
    },
    honoraires: {
      type: DataTypes.DECIMAL(10, 2),
      comment: 'Honoraires convenus'
    },
    frais_deplacement: {
      type: DataTypes.DECIMAL(10, 2),
      comment: 'Frais de déplacement'
    },
    logement_requis: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    materiel_technique: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Besoins techniques spécifiques'
    },
    statut_confirmation: {
      type: DataTypes.ENUM('en_attente', 'confirme', 'decline', 'annule'),
      defaultValue: 'en_attente'
    },
    date_confirmation: {
      type: DataTypes.DATE
    },
    notes_organisateur: {
      type: DataTypes.TEXT,
      comment: 'Notes internes sur cet intervenant'
    }
    
  }, {
    tableName: 'programme_intervenant',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification',
    
    indexes: [
      {
        unique: true,
        fields: ['id_programme', 'id_user']  // Index unique sur la combinaison
      },
      {
        fields: ['statut_confirmation']
      },
      {
        fields: ['ordre_intervention']
      }
    ]
  });

  // Associations
  ProgrammeIntervenant.associate = (models) => {
    ProgrammeIntervenant.belongsTo(models.Programme, {
      foreignKey: 'id_programme',
      as: 'Programme'
    });
    
    // Association avec User
    ProgrammeIntervenant.belongsTo(models.User, {
      foreignKey: 'id_user',
      as: 'User'
    });
  };
  
  // Méthodes d'instance
  ProgrammeIntervenant.prototype.confirmer = async function() {
    this.statut_confirmation = 'confirme';
    this.date_confirmation = new Date();
    return this.save();
  };
  
  ProgrammeIntervenant.prototype.decliner = async function(raison) {
    this.statut_confirmation = 'decline';
    this.date_confirmation = new Date();
    if (raison) {
      this.notes_organisateur = (this.notes_organisateur || '') + '\nDécliné: ' + raison;
    }
    return this.save();
  };

  return ProgrammeIntervenant;
};