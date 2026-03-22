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
    
    // ⚡ MODIFIÉ POUR I18N - Noms en JSON
    nom: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { fr: '', ar: '' },
      comment: 'Nom en plusieurs langues { fr: "...", ar: "...", en: "...", "tz-ltn": "...", "tz-tfng": "..." }'
    },
    prenom: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { fr: '', ar: '' },
      comment: 'Prénom en plusieurs langues'
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
    id_type_user: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      index: true,
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
    
    // ⚡ MODIFIÉ POUR I18N - Biographie en JSON
    biographie: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Biographie en plusieurs langues'
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
    // STATUTS ET VALIDATION (fusionné: statut_validation supprimé - voir migration 20260312)
    // =============================================================================
    statut: {
      type: DataTypes.ENUM('actif', 'en_attente_validation', 'inactif', 'suspendu', 'banni', 'rejete'),
      defaultValue: 'actif',
      allowNull: false,
      comment: 'État global du compte. Pro validé = actif, en attente = en_attente_validation, rejeté = rejete'
    },
    date_validation: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date de validation du statut professionnel'
    },
    id_user_validate: {
      type: DataTypes.INTEGER,
      allowNull: true,
      index: true,
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
      type: DataTypes.STRING(10),
      defaultValue: 'fr',
      comment: 'Code langue préférée (ex: fr, ar, en, tz-ltn, tz-tfng)'
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
    rappel_verification_envoye: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Rappel de vérification email envoyé (cron)'
    },
    notifications_evenements: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Accepte les notifications liées aux événements'
    },
    notifications_favoris: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Accepte les notifications liées aux favoris'
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
    },

    // =============================================================================
    // REFRESH TOKEN
    // =============================================================================
    refresh_token: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    refresh_token_expires: {
      type: DataTypes.DATE,
      allowNull: true
    },

    // =============================================================================
    // SÉCURITÉ MOT DE PASSE
    // =============================================================================
    password_changed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date du dernier changement de mot de passe (invalidation JWT)'
    }
  }, {
    tableName: 'user',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification',
    
    indexes: [
      {
        name: 'id_index_email',
        fields: ['email'],
        unique: true
      },
      {
        fields: ['id_type_user']
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
        fields: ['id_user_validate']
      }
    ],
    
    hooks: {
      beforeCreate: async (user) => {
        if (user.id_type_user === 1) {
          user.statut = 'actif';
        } else {
          user.statut = 'en_attente_validation';
        }
        
        if (!user.accepte_conditions) {
          throw new Error('Vous devez accepter les conditions d\'utilisation');
        }

        // Le hachage du mot de passe est géré exclusivement par userService
        // (register, changePassword). Ne PAS hacher ici pour éviter un double hash.
      },
      
      beforeUpdate: async (user) => {
        if (user.changed('statut') && user.statut === 'actif') {
          user.date_validation = new Date();
        }

        // Le hachage du mot de passe est géré exclusivement par userService.changePassword().
        // Ne PAS hacher ici pour éviter un double hash.
      }
    }
  });

  // =============================================================================
  // ASSOCIATIONS
  // =============================================================================
  User.associate = (models) => {
    User.belongsTo(models.TypeUser, {
      foreignKey: 'id_type_user',
      as: 'TypeUser',
      onDelete: 'RESTRICT'
    });

    User.belongsTo(models.User, {
      foreignKey: 'id_user_validate',
      as: 'Validateur',
      onDelete: 'SET NULL'
    });

    User.hasMany(models.User, {
      foreignKey: 'id_user_validate',
      as: 'UsersValides',
      onDelete: 'SET NULL'
    });
    
    User.belongsToMany(models.Role, { 
      through: models.UserRole, 
      foreignKey: 'id_user',
      as: 'Roles'
    });
    
    User.belongsToMany(models.Organisation, { 
      through: models.UserOrganisation, 
      foreignKey: 'id_user',
      as: 'Organisations'
    });
    
    User.belongsToMany(models.Oeuvre, { 
      through: models.OeuvreUser, 
      foreignKey: 'id_user',
      as: 'Oeuvres'
    });
    
    User.belongsToMany(models.Evenement, { 
      through: models.EvenementUser, 
      foreignKey: 'id_user',
      as: 'Evenements'
    });
    
    User.belongsTo(models.Wilaya, { 
      foreignKey: 'wilaya_residence',
      as: 'Wilaya',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    
    User.hasMany(models.Oeuvre, { 
      as: 'OeuvresSaisies', 
      foreignKey: 'saisi_par',
      onDelete: 'SET NULL'
    });
    
    User.hasMany(models.Oeuvre, {
      as: 'OeuvresValidees',
      foreignKey: 'validateur_id',
      onDelete: 'SET NULL'
    });

    User.hasMany(models.Evenement, {
      foreignKey: 'id_user',
      as: 'EvenementsOrganises',
      onDelete: 'SET NULL'
    });
    
    User.hasMany(models.Commentaire, { 
      foreignKey: 'id_user',
      as: 'Commentaires',
      onDelete: 'CASCADE'
    });
    
    User.hasMany(models.CritiqueEvaluation, {
      foreignKey: 'id_user',
      as: 'Critiques',
      onDelete: 'CASCADE'
    });

    User.hasMany(models.ProgrammeIntervenant, {
      foreignKey: 'id_user',
      as: 'Interventions',
      onDelete: 'CASCADE'
    });

    // ✅ Association bidirectionnelle avec Programme via ProgrammeIntervenant
    User.belongsToMany(models.Programme, {
      through: models.ProgrammeIntervenant,
      foreignKey: 'id_user',
      otherKey: 'id_programme',
      as: 'Programmes'
    });

    User.hasMany(models.Favori, { 
      foreignKey: 'id_user',
      as: 'Favoris',
      onDelete: 'CASCADE'
    });
  };

  // =============================================================================
  // MÉTHODES D'INSTANCE
  // =============================================================================
  
  // ⚡ NOUVELLE MÉTHODE - Obtenir le nom complet traduit
  User.prototype.getNomComplet = function(lang = 'fr') {
    const prenom = this.prenom?.[lang] || this.prenom?.fr || this.prenom?.ar || '';
    const nom = this.nom?.[lang] || this.nom?.fr || this.nom?.ar || '';
    return `${prenom} ${nom}`.trim();
  };
  
  // ⚡ NOUVELLE MÉTHODE - Obtenir la biographie traduite
  User.prototype.getBiographie = function(lang = 'fr') {
    return this.biographie?.[lang] || this.biographie?.fr || this.biographie?.ar || '';
  };
  
  User.prototype.toPublicJSON = function(lang = 'fr') {
    const values = this.toJSON();
    delete values.password;
    delete values.ip_inscription;
    
    // Traduire les champs
    values.nom_display = this.getNomComplet(lang);
    values.biographie_display = this.getBiographie(lang);
    
    if (!values.profil_public) {
      delete values.email;
      delete values.telephone;
      delete values.adresse;
      delete values.date_naissance;
    }
    
    if (!values.email_public) delete values.email;
    if (!values.telephone_public) delete values.telephone;
    
    return values;
  };

  return User;
};
