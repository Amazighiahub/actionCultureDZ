// models/Intervenant.js - ⚡ MODIFIÉ POUR I18N
const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
  const Intervenant = sequelize.define('Intervenant', {
    id_intervenant: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // ⚡ MODIFIÉ POUR I18N
    nom: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { fr: '', ar: '' },
      comment: 'Nom en plusieurs langues { fr: "Bouzidi", ar: "بوزيدي", "tz-ltn": "Buzidi", "tz-tfng": "ⴱⵓⵣⵉⴷⵉ" }'
    },
    // ⚡ MODIFIÉ POUR I18N
    prenom: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { fr: '', ar: '' },
      comment: 'Prénom en plusieurs langues'
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
    // ⚡ MODIFIÉ POUR I18N
    biographie: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Biographie en plusieurs langues'
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
    id_user: {
      type: DataTypes.INTEGER,
      references: {
        model: 'user',
        key: 'id_user'
      },
      comment: 'Lien optionnel si l\'intervenant a un compte utilisateur'
    },
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
      { fields: ['id_user'], unique: true, where: { id_user: { [Op.not]: null } } },
      { fields: ['email'], unique: true, where: { email: { [Op.not]: null } } }
    ]
  });

  // Associations
  Intervenant.associate = (models) => {
    Intervenant.belongsTo(models.User, {
      foreignKey: 'id_user',
      as: 'UserAccount',
      constraints: false
    });
    
    Intervenant.hasMany(models.OeuvreIntervenant, { 
      foreignKey: 'id_intervenant' 
    });
    
    Intervenant.belongsToMany(models.Programme, {
      through: models.ProgrammeIntervenant,
      foreignKey: 'id_intervenant',
      otherKey: 'id_programme',
      as: 'Programmes'
    });
  };
  
  // ⚡ NOUVELLES MÉTHODES I18N
  Intervenant.prototype.getNom = function(lang = 'fr') {
    return this.nom?.[lang] || this.nom?.fr || this.nom?.ar || '';
  };

  Intervenant.prototype.getPrenom = function(lang = 'fr') {
    return this.prenom?.[lang] || this.prenom?.fr || this.prenom?.ar || '';
  };

  Intervenant.prototype.getNomComplet = function(lang = 'fr') {
    let nom = '';
    if (this.titre_professionnel) nom += this.titre_professionnel + ' ';
    nom += this.getPrenom(lang) + ' ' + this.getNom(lang);
    return nom.trim();
  };

  Intervenant.prototype.getBiographie = function(lang = 'fr') {
    return this.biographie?.[lang] || this.biographie?.fr || '';
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
    
    const programmes = await sequelize.models.ProgrammeIntervenant.count({
      where: { id_intervenant: this.id_intervenant }
    });
    stats.nombreProgrammes = programmes;
    
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
            date_debut: { [Op.gte]: new Date() }
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

  return Intervenant;
};
