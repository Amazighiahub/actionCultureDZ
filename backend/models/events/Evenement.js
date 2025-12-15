// models/Evenement.js - ⚡ MODIFIÉ POUR I18N
const { DataTypes, Op, fn, col } = require('sequelize');

module.exports = (sequelize) => {
  const Evenement = sequelize.define('Evenement', {
    id_evenement: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // ⚡ MODIFIÉ POUR I18N
    nom_evenement: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { fr: '' },
      comment: 'Nom en plusieurs langues { fr: "Festival du livre", ar: "مهرجان الكتاب", en: "Book Festival" }',
      validate: {
        notEmpty(value) {
          if (!value || (!value.fr && !value.ar)) {
            throw new Error('Le nom de l\'événement est requis');
          }
        }
      }
    },
    // ⚡ MODIFIÉ POUR I18N
    description: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Description en plusieurs langues'
    },
    date_debut: {
      type: DataTypes.DATE,
      allowNull: true
    },
    date_fin: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isAfterDateDebut(value) {
          if (value && this.date_debut && value < this.date_debut) {
            throw new Error('La date de fin doit être après la date de début');
          }
        }
      }
    },
    contact_email: {
      type: DataTypes.STRING(255),
      validate: {
        isEmail: true
      }
    },
    contact_telephone: {
      type: DataTypes.STRING(20),
      validate: {
        is: /^[0-9+\-\s()]+$/
      }
    },
    image_url: {
      type: DataTypes.STRING(500)
    },
    id_lieu: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'lieu',
        key: 'id_lieu'
      }
    },
    id_user: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'user',
        key: 'id_user'
      },
      comment: 'Organisateur principal'
    },
    id_type_evenement: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'type_evenement',
        key: 'id_type_evenement'
      }
    },
    statut: {
      type: DataTypes.ENUM('planifie', 'en_cours', 'termine', 'annule', 'reporte'),
      defaultValue: 'planifie'
    },
    capacite_max: {
      type: DataTypes.INTEGER,
      validate: {
        min: 0
      }
    },
    tarif: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    inscription_requise: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    age_minimum: {
      type: DataTypes.INTEGER,
      validate: {
        min: 0,
        max: 120
      },
      comment: 'Âge minimum requis pour participer'
    },
    // ⚡ MODIFIÉ POUR I18N
    accessibilite: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Informations sur l\'accessibilité en plusieurs langues'
    },
    certificat_delivre: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Un certificat sera-t-il délivré aux participants ?'
    },
    date_limite_inscription: {
      type: DataTypes.DATE,
      comment: 'Date limite pour s\'inscrire',
      validate: {
        isBeforeEvent(value) {
          if (value && this.date_debut && value > this.date_debut) {
            throw new Error('La date limite d\'inscription doit être avant le début de l\'événement');
          }
        }
      }
    },
    
    // Champs virtuels
    nombre_participants: {
      type: DataTypes.VIRTUAL,
      async get() {
        if (!this.id_evenement) return 0;
        const count = await sequelize.models.EvenementUser.count({
          where: { 
            id_evenement: this.id_evenement,
            statut_participation: ['confirme', 'present']
          }
        });
        return count;
      }
    },
    nombre_inscrits: {
      type: DataTypes.VIRTUAL,
      async get() {
        if (!this.id_evenement) return 0;
        const count = await sequelize.models.EvenementUser.count({
          where: { id_evenement: this.id_evenement }
        });
        return count;
      }
    },
    est_complet: {
      type: DataTypes.VIRTUAL,
      async get() {
        if (!this.capacite_max) return false;
        const inscrits = await this.get('nombre_inscrits');
        return inscrits >= this.capacite_max;
      }
    },
    duree_totale: {
      type: DataTypes.VIRTUAL,
      get() {
        if (!this.date_debut || !this.date_fin) return null;
        const diff = new Date(this.date_fin) - new Date(this.date_debut);
        return Math.round(diff / (1000 * 60 * 60));
      }
    },
    note_moyenne: {
      type: DataTypes.VIRTUAL,
      async get() {
        if (!this.id_evenement) return null;
        const result = await sequelize.models.EvenementUser.findOne({
          where: { 
            id_evenement: this.id_evenement,
            evaluation_evenement: { [Op.not]: null }
          },
          attributes: [
            [fn('AVG', col('evaluation_evenement')), 'moyenne']
          ],
          raw: true
        });
        return result?.moyenne ? parseFloat(result.moyenne).toFixed(1) : null;
      }
    }
  }, {
    tableName: 'evenement',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification',
    
    indexes: [
      { fields: ['id_lieu'] },
      { fields: ['id_user'] },
      { fields: ['id_type_evenement'] },
      { fields: ['statut'] },
      { fields: ['date_debut'] },
      { fields: ['date_fin'] },
      { fields: ['date_limite_inscription'] }
    ],
    
    hooks: {
      beforeValidate: (evenement) => {
        const now = new Date();
        if (evenement.date_debut && evenement.date_fin) {
          if (now < new Date(evenement.date_debut)) {
            evenement.statut = 'planifie';
          } else if (now >= new Date(evenement.date_debut) && now <= new Date(evenement.date_fin)) {
            evenement.statut = 'en_cours';
          } else if (now > new Date(evenement.date_fin)) {
            evenement.statut = 'termine';
          }
        }
      }
    }
  });

  // Associations
  Evenement.associate = (models) => {
    Evenement.belongsTo(models.TypeEvenement, { 
      foreignKey: 'id_type_evenement',
      as: 'TypeEvenement'
    });
    
    Evenement.belongsTo(models.Lieu, { 
      foreignKey: 'id_lieu',
      as: 'Lieu'
    });
    
    Evenement.belongsTo(models.User, { 
      foreignKey: 'id_user',
      as: 'Organisateur'
    });
    
    Evenement.hasMany(models.EvenementUser, {
      foreignKey: 'id_evenement',
      as: 'EvenementUsers'
    });
    
    Evenement.hasMany(models.EvenementOeuvre, {
      foreignKey: 'id_evenement',
      as: 'EvenementOeuvres'
    });
    
    Evenement.hasMany(models.EvenementOrganisation, {
      foreignKey: 'id_evenement',
      as: 'EvenementOrganisations'
    });
    
    Evenement.belongsToMany(models.User, {
      through: models.EvenementUser,
      foreignKey: 'id_evenement',
      otherKey: 'id_user',
      as: 'Participants'
    });
    
    Evenement.belongsToMany(models.Oeuvre, {
      through: models.EvenementOeuvre,
      foreignKey: 'id_evenement',
      otherKey: 'id_oeuvre',
      as: 'Oeuvres'
    });
    
    Evenement.belongsToMany(models.Organisation, {
      through: models.EvenementOrganisation,
      foreignKey: 'id_evenement',
      otherKey: 'id_organisation',
      as: 'Organisations'
    });
    
    Evenement.hasMany(models.Programme, {
      foreignKey: 'id_evenement',
      as: 'Programmes'
    });
    
    Evenement.hasMany(models.Media, {
      foreignKey: 'id_evenement',
      as: 'Medias'
    });
  };
  
  // ⚡ NOUVELLES MÉTHODES I18N
  Evenement.prototype.getNomEvenement = function(lang = 'fr') {
    return this.nom_evenement?.[lang] || this.nom_evenement?.fr || this.nom_evenement?.ar || '';
  };

  Evenement.prototype.getDescription = function(lang = 'fr') {
    return this.description?.[lang] || this.description?.fr || '';
  };

  Evenement.prototype.getAccessibilite = function(lang = 'fr') {
    return this.accessibilite?.[lang] || this.accessibilite?.fr || '';
  };

  // Méthodes d'instance existantes
  Evenement.prototype.isActive = function() {
    if (!this.date_fin) return false;
    return new Date(this.date_fin) >= new Date();
  };
  
  Evenement.prototype.isUpcoming = function() {
    if (!this.date_debut) return false;
    return new Date(this.date_debut) > new Date();
  };
  
  Evenement.prototype.canRegister = function() {
    if (!this.isActive()) return false;
    if (this.date_limite_inscription && new Date() > new Date(this.date_limite_inscription)) {
      return false;
    }
    return !this.est_complet;
  };
  
  Evenement.prototype.updateStatus = async function() {
    const now = new Date();
    let newStatus = this.statut;
    
    if (this.date_debut && this.date_fin) {
      if (now < new Date(this.date_debut)) {
        newStatus = 'planifie';
      } else if (now >= new Date(this.date_debut) && now <= new Date(this.date_fin)) {
        newStatus = 'en_cours';
      } else {
        newStatus = 'termine';
      }
    }
    
    if (newStatus !== this.statut) {
      this.statut = newStatus;
      await this.save();
    }
    
    return this;
  };
  
  // Méthodes de classe
  Evenement.getActiveEvents = function() {
    return this.findAll({
      where: {
        [Op.or]: [
          { statut: 'en_cours' },
          {
            statut: 'planifie',
            date_fin: { [Op.gte]: new Date() }
          }
        ]
      },
      order: [['date_debut', 'ASC']]
    });
  };

  return Evenement;
};
