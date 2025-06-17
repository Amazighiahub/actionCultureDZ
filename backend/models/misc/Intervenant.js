// models/misc/Intervenant.js - Modèle pour les intervenants avec Op correctement importé

const { DataTypes, Op } = require('sequelize'); // IMPORTANT: Importer Op ici

module.exports = (sequelize) => {
  const Intervenant = sequelize.define('Intervenant', {
    id_intervenant: {
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
      date_naissance: {
      type: DataTypes.DATEONLY,
      comment: 'Date de naissance'
    },
    lieu_naissance: {
      type: DataTypes.STRING(255),
      comment: 'Ville et pays de naissance'
    },
    date_deces: {
      type: DataTypes.DATEONLY,
      comment: 'Date de décès si applicable'
    },
    lieu_deces: {
      type: DataTypes.STRING(255),
      comment: 'Ville et pays de décès'
    },
    prix_distinctions: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Liste des prix et distinctions [{nom, annee, description}]'
    },
    wikipedia_url: {
      type: DataTypes.STRING(500),
      comment: 'Lien vers la page Wikipedia'
    },
    reseaux_sociaux: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Liens vers réseaux sociaux {twitter, linkedin, instagram, etc.}'
    },
    
    // MÉDIAS
   
    titre_professionnel: {
      type: DataTypes.STRING(255),
      comment: 'Ex: Dr., Prof., Maître, etc.'
    },
    organisation: {
      type: DataTypes.STRING(255),
      comment: 'Organisation/Institution de l\'intervenant'
    },
    email: {
      type: DataTypes.STRING(255),
      validate: {
        isEmail: true
      }
    },
    telephone: {
      type: DataTypes.STRING(20)
    },
    biographie: {
      type: DataTypes.TEXT,
      comment: 'Biographie courte de l\'intervenant'
    },
    photo_url: {
      type: DataTypes.STRING(500)
    },
    specialites: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Domaines d\'expertise'
    },
    site_web: {
      type: DataTypes.STRING(500)
    },
   
    pays_origine: {
      type: DataTypes.STRING(100)
    },
    langues_parlees: {
      type: DataTypes.JSON,
      defaultValue: ['ar'],
      comment: 'Langues parlées par l\'intervenant'
    },
    
    // Lien optionnel avec un utilisateur existant
    id_user: {
      type: DataTypes.INTEGER,
      references: {
        model: 'user',
        key: 'id_user'
      },
      comment: 'Lien optionnel si l\'intervenant a un compte utilisateur'
    },
    
    // Statut
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    verifie: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Profil vérifié par l\'administration'
    }
    
  }, {
    tableName: 'intervenant',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification',
    
    indexes: [
      {
        fields: ['nom', 'prenom']
      },
      {
        fields: ['id_user'],
        unique: true,
        where: { id_user: { [Op.not]: null } } // Utiliser Op directement
      },
      {
        fields: ['email'],
        unique: true,
        where: { email: { [Op.not]: null } } // Utiliser Op directement
      }
    ]
  });

  // ASSOCIATIONS COMPLÈTES
  Intervenant.associate = (models) => {
    // Lien optionnel avec User
    Intervenant.belongsTo(models.User, {
      foreignKey: 'id_user',
      as: 'UserAccount',
      constraints: false
    });
    Intervenant.hasMany(models.OeuvreIntervenant, { 
  foreignKey: 'id_intervenant' 
});
    // Relation Many-to-Many avec Programme via ProgrammeIntervenant
    Intervenant.belongsToMany(models.Programme, {
      through: models.ProgrammeIntervenant,
      foreignKey: 'id_intervenant',
      otherKey: 'id_programme',
      as: 'Programmes'
    });
    
    // Relation One-to-Many avec ProgrammeIntervenant
    Intervenant.hasMany(models.ProgrammeIntervenant, {
      foreignKey: 'id_intervenant',
      as: 'ProgrammeIntervenants'
    });
  };
  
  // Méthodes d'instance
  Intervenant.prototype.getNomComplet = function() {
    let nom = '';
    if (this.titre_professionnel) nom += this.titre_professionnel + ' ';
    nom += this.prenom + ' ' + this.nom;
    return nom;
  };
  
  Intervenant.prototype.ajouterSpecialite = function(specialite) {
    const specialites = this.specialites || [];
    if (!specialites.includes(specialite)) {
      specialites.push(specialite);
      this.specialites = specialites;
    }
  };
  
  Intervenant.prototype.getProgrammesActifs = async function() {
    return await this.getProgrammes({
      include: [{
        model: sequelize.models.Evenement,
        as: 'Evenement',
        where: {
          statut: ['planifie', 'en_cours']
        }
      }]
    });
  };
  
  Intervenant.prototype.getStatistiques = async function() {
    const stats = {
      nombreProgrammes: 0,
      nombreEvenements: 0,
      prochaineProgramme: null
    };
    
    // Compter les programmes
    const programmes = await sequelize.models.ProgrammeIntervenant.count({
      where: { id_intervenant: this.id_intervenant }
    });
    stats.nombreProgrammes = programmes;
    
    // Trouver le prochain programme
    const prochainProg = await sequelize.models.ProgrammeIntervenant.findOne({
      where: { 
        id_intervenant: this.id_intervenant,
        statut_confirmation: 'confirme'
      },
      include: [{
        model: sequelize.models.Programme,
        as: 'Programme',
        include: [{
          model: sequelize.models.Evenement,
          as: 'Evenement',
          where: {
            date_debut: { [Op.gte]: new Date() } // Utiliser Op directement
          }
        }]
      }],
      order: [[{ model: sequelize.models.Programme, as: 'Programme' }, 
               { model: sequelize.models.Evenement, as: 'Evenement' }, 
               'date_debut', 'ASC']]
    });
    
    if (prochainProg && prochainProg.Programme && prochainProg.Programme.Evenement) {
      stats.prochaineProgramme = prochainProg.Programme;
    }
    
    return stats;
  };
  
  // Méthodes statiques
  
  
  
  return Intervenant;
};