// models/associations/EvenementUser.js - Modèle corrigé

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EvenementUser = sequelize.define('EvenementUser', {
    id_EventUser: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_evenement: {
      type: DataTypes.INTEGER,
      references: {
        model: 'evenement',
        key: 'id_evenement'
      }
    },
    id_user: {
      type: DataTypes.INTEGER,
      references: {
        model: 'user',
        key: 'id_user'
      }
    },
    
    // AJOUT DU CHAMP MANQUANT
    role_participation: {
      type: DataTypes.ENUM('participant', 'organisateur', 'intervenant', 'benevole', 'staff'),
      defaultValue: 'participant',
      comment: 'Rôle de l\'utilisateur dans l\'événement'
    },
   
    date_inscription: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    statut_participation: {
      type: DataTypes.ENUM('inscrit', 'confirme', 'present', 'absent', 'annule'),
      defaultValue: 'inscrit'
    },
    notes: {
      type: DataTypes.TEXT,
      comment: 'Notes internes ou besoins spécifiques'
    },
    date_validation: {
      type: DataTypes.DATE,
      comment: 'Date de validation de la participation'
    },
    valide_par: {
      type: DataTypes.INTEGER,
      references: {
        model: 'user',
        key: 'id_user'
      },
      comment: 'ID de l\'utilisateur qui a validé'
    },
    
    // ===== CHAMPS D'ÉVALUATION =====
    
    evaluation_evenement: {
      type: DataTypes.INTEGER,
      validate: {
        min: 1,
        max: 5
      },
      comment: 'Note d\'évaluation de 1 à 5 étoiles'
    },
    
    commentaire_evaluation: {
      type: DataTypes.TEXT,
      comment: 'Commentaire détaillé sur l\'événement'
    },
    
    recommande: {
      type: DataTypes.BOOLEAN,
      comment: 'Le participant recommande-t-il cet événement ?'
    },
    
    presence_confirmee: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Confirmation de présence physique'
    },
    
    certificat_genere: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Un certificat de participation a-t-il été généré ?'
    },
    
    date_certificat: {
      type: DataTypes.DATE,
      comment: 'Date de génération du certificat'
    }
    
  }, {
    tableName: 'evenementusers',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification',
    indexes: [
      {
        unique: true,
        fields: ['id_user', 'id_evenement']
      },
      {
        fields: ['statut_participation']
      },
      {
        fields: ['role_participation']  // Index valide maintenant
      }
    ]
  });

  // Associations
  EvenementUser.associate = (models) => {
    EvenementUser.belongsTo(models.Evenement, { 
      foreignKey: 'id_evenement',
      as: 'Evenement'
    });
    
    EvenementUser.belongsTo(models.User, { 
      foreignKey: 'id_user',
      as: 'User'
    });
    
    EvenementUser.belongsTo(models.User, { 
      foreignKey: 'valide_par',
      as: 'Validateur'
    });
  };
  
  // Hooks
  EvenementUser.addHook('beforeUpdate', async (instance) => {
    // Si le statut passe à 'present', confirmer la présence
    if (instance.changed('statut_participation') && instance.statut_participation === 'present') {
      instance.presence_confirmee = true;
    }
    
    // Si une évaluation est ajoutée, générer un certificat
    if (instance.changed('evaluation_evenement') && instance.evaluation_evenement) {
      instance.certificat_genere = true;
      instance.date_certificat = new Date();
    }
  });
  
  // Méthodes d'instance
  EvenementUser.prototype.confirmerPresence = async function() {
    this.statut_participation = 'confirme';
    this.presence_confirmee = true;
    return this.save();
  };
  
  EvenementUser.prototype.evaluer = async function(note, commentaire, recommande = true) {
    this.evaluation_evenement = note;
    this.commentaire_evaluation = commentaire;
    this.recommande = recommande;
    return this.save();
  };
  
  EvenementUser.prototype.genererCertificat = async function() {
    if (this.statut_participation === 'present' || this.presence_confirmee) {
      this.certificat_genere = true;
      this.date_certificat = new Date();
      return this.save();
    }
    throw new Error('La présence doit être confirmée pour générer un certificat');
  };

  return EvenementUser;
};