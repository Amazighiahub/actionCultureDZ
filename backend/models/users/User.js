const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    // =============================================================================
    // IDENTIFIANTS DE BASE
    // =============================================================================
    id_user: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    prenom: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING(250),
      allowNull: false
    },

    // =============================================================================
    // INFORMATIONS PERSONNELLES
    // =============================================================================
    // MODIFICATION : Remplacer l'ENUM par une référence à la table type_user
    id_type_user: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1, // 1 = visiteur par défaut
      references: {
        model: 'type_user',
        key: 'id_type_user'
      },
      comment: 'Référence au type d\'utilisateur'
    },
    date_naissance: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    sexe: {
      type: DataTypes.ENUM('M', 'F'),
      allowNull: true,
      comment: 'Sexe de l\'utilisateur (M=Masculin, F=Féminin)'
    },
    telephone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    photo_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    biographie: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    // =============================================================================
    // LOCALISATION
    // =============================================================================
    wilaya_residence: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'wilayas',
        key: 'id_wilaya'
      },
      comment: 'Wilaya de résidence de l\'utilisateur'
    },
    adresse: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Adresse complète de l\'utilisateur'
    },

    // =============================================================================
    // STATUTS ET VALIDATION
    // =============================================================================
    statut: {
      type: DataTypes.ENUM('actif','en_attente_validation' , 'inactif', 'suspendu', 'banni'),
      defaultValue: 'actif',
      allowNull: false
    },
   
    statut_validation: {
      type: DataTypes.ENUM('en_attente', 'valide', 'rejete', 'suspendu'),
      allowNull: true,
      comment: 'Statut de validation pour les professionnels'
    },
    date_validation: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date de validation du statut professionnel'
    },
    // NOUVEAU CHAMP : Utilisateur qui a validé
    id_user_validate: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'user',
        key: 'id_user'
      },
      comment: 'ID de l\'utilisateur qui a validé ce compte'
    },

    // =============================================================================
    // PRÉFÉRENCES
    // =============================================================================
    accepte_newsletter: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indique si l\'utilisateur accepte de recevoir la newsletter'
    },
    accepte_conditions: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Acceptation des conditions d\'utilisation'
    },
    langue_preferee: {
      type: DataTypes.STRING(5),
      defaultValue: 'fr',
      comment: 'Code langue préférée (ex: fr, ar, en)'
    },
    theme_prefere: {
      type: DataTypes.ENUM('light', 'dark', 'auto'),
      defaultValue: 'auto',
      comment: 'Thème d\'interface préféré'
    },

    // =============================================================================
    // MÉTADONNÉES
    // =============================================================================
    derniere_connexion: {
      type: DataTypes.DATE,
      allowNull: true
    },
    ip_inscription: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'Adresse IP lors de l\'inscription'
    },

    // =============================================================================
    // STATISTIQUES UTILISATEUR
    // =============================================================================
    nombre_oeuvres: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    nombre_evenements: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    nombre_favoris: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    nombre_commentaires: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    score_reputation: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    // =============================================================================
    // INFORMATIONS DE SÉCURITÉ
    // =============================================================================
    email_verifie: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    telephone_verifie: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    double_authentification: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    // =============================================================================
    // PARAMÈTRES DE CONFIDENTIALITÉ
    // =============================================================================
    profil_public: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    email_public: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    telephone_public: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    // =============================================================================
    // INFORMATIONS PROFESSIONNELLES
    // =============================================================================
    entreprise: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    siret: {
      type: DataTypes.STRING(14),
      allowNull: true
    },
    specialites: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Liste des spécialités du professionnel'
    },
    site_web: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    reseaux_sociaux: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'URLs des réseaux sociaux {facebook, instagram, twitter, linkedin, youtube}'
    },

    // =============================================================================
    // VÉRIFICATIONS ET CERTIFICATIONS
    // =============================================================================
    certifications: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Liste des certifications obtenues'
    },
    documents_fournis: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'URLs des documents justificatifs fournis'
    },
    raison_rejet: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Raison du rejet de validation professionnel'
    },

    // =============================================================================
    // PARAMÈTRES DE NOTIFICATION
    // =============================================================================
    notifications_email: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    notifications_push: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    notifications_newsletter: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    notifications_commentaires: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    notifications_favoris: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    notifications_evenements: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'user',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification',
    
    // Indexes pour les performances
    indexes: [
      {
        fields: ['email'],
        unique: true
      },
      {
        fields: ['id_type_user'] // Modifié
      },
      {
        fields: ['statut']
      },
      {
        fields: ['wilaya_residence']
      },
      {
        fields: ['date_creation']
      },
      {
        fields: ['derniere_connexion']
      },
      {
        fields: ['id_user_validate'] // Nouveau
      }
    ],
    
    // Hooks
    hooks: {
      beforeCreate: async (user) => {
        // Valider automatiquement les visiteurs (id_type_user = 1)
        if (user.id_type_user === 1) {
          user.statut_validation = 'valide';
        } else {
          // Les autres types doivent être validés
          user.statut_validation = 'en_attente';
        }
        
        // Accepter les conditions est obligatoire
        if (!user.accepte_conditions) {
          throw new Error('Vous devez accepter les conditions d\'utilisation');
        }
      },
      
      beforeUpdate: (user) => {
        // Mettre à jour les statistiques si nécessaire
        if (user.changed('statut_validation') && user.statut_validation === "valide") {
          user.date_validation = new Date();
        }
      }
    }
  });

  // =============================================================================
  // ASSOCIATIONS
  // =============================================================================
  User.associate = (models) => {
    // NOUVELLE ASSOCIATION : Type d'utilisateur
    User.belongsTo(models.TypeUser, {
      foreignKey: 'id_type_user',
      as: 'TypeUser'
    });
    
    // NOUVELLE ASSOCIATION : Utilisateur validateur
    User.belongsTo(models.User, {
      foreignKey: 'id_user_validate',
      as: 'Validateur'
    });
    
    // NOUVELLE ASSOCIATION : Utilisateurs validés par cet utilisateur
    User.hasMany(models.User, {
      foreignKey: 'id_user_validate',
      as: 'UsersValides'
    });
    
    // Relations avec les rôles
    User.belongsToMany(models.Role, { 
      through: models.UserRole, 
      foreignKey: 'id_user',
      as: 'Roles'
    });
    
    // Relations avec les organisations
    User.belongsToMany(models.Organisation, { 
      through: models.UserOrganisation, 
      foreignKey: 'id_user',
      as: 'Organisations'
    });
    
    // Relations avec les œuvres
    User.belongsToMany(models.Oeuvre, { 
      through: models.OeuvreUser, 
      foreignKey: 'id_user',
      as: 'Oeuvres'
    });
    
    // Relations avec les événements
    User.belongsToMany(models.Evenement, { 
      through: models.EvenementUser, 
      foreignKey: 'id_user',
      as: 'Evenements'
    });
    
    // Relation avec Wilaya
    User.belongsTo(models.Wilaya, { 
      foreignKey: 'wilaya_residence',
      as: 'Wilaya',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    
    // Relations en tant que créateur/validateur
    User.hasMany(models.Oeuvre, { 
      as: 'OeuvresSaisies', 
      foreignKey: 'saisi_par' 
    });
    
    User.hasMany(models.Oeuvre, { 
      as: 'OeuvresValidees', 
      foreignKey: 'validateur_id' 
    });
    
    User.hasMany(models.Evenement, { 
      foreignKey: 'id_user',
      as: 'EvenementsOrganises'
    });
    
    User.hasMany(models.Commentaire, { 
      foreignKey: 'id_user',
      as: 'Commentaires'
    });
    
    User.hasMany(models.CritiqueEvaluation, { 
      foreignKey: 'id_user',
      as: 'Critiques'
    });
    
    // Favoris
    User.hasMany(models.Favori, { 
      foreignKey: 'id_user',
      as: 'Favoris'
    });
  };

  // =============================================================================
  // MÉTHODES D'INSTANCE
  // =============================================================================
  User.prototype.toPublicJSON = function() {
    const values = this.toJSON();
    delete values.password;
    delete values.ip_inscription;
    
    // Masquer certains champs si le profil n'est pas public
    if (!values.profil_public) {
      delete values.email;
      delete values.telephone;
      delete values.adresse;
      delete values.date_naissance;
    }
    
    // Masquer email/téléphone selon les préférences
    if (!values.email_public) delete values.email;
    if (!values.telephone_public) delete values.telephone;
    
    return values;
  };

  return User;
};