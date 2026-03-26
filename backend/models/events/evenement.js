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
      allowNull: true,
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
      type: DataTypes.STRING(500),
      allowNull: true
    },
    id_lieu: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'lieu',
        key: 'id_lieu'
      },
      comment: 'Nullable pour les événements virtuels'
    },
    url_virtuel: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Lien pour les événements en ligne (Zoom, Meet, etc.)'
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
      type: DataTypes.ENUM('brouillon', 'publie', 'planifie', 'en_cours', 'termine', 'annule', 'reporte'),
      defaultValue: 'brouillon'
    },
    capacite_max: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
    rappel_envoye: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Rappel 24h avant envoyé (cron)'
    },
    rappel_derniere_minute: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Rappel 1h avant envoyé (cron)'
    },
    
    // Champ virtuel synchrone (pas de requête DB)
    duree_totale: {
      type: DataTypes.VIRTUAL,
      get() {
        if (!this.date_debut || !this.date_fin) return null;
        const diff = new Date(this.date_fin) - new Date(this.date_debut);
        return Math.round(diff / (1000 * 60 * 60));
      }
    }

    // ⚠️ DBA-01: Les anciens getters VIRTUAL async (nombre_participants, nombre_inscrits,
    // est_complet, note_moyenne) ont été supprimés car ils déclenchaient des requêtes N+1
    // silencieuses (4 queries par événement dans un findAll de 20 = 80 queries).
    //
    // Utiliser des sous-requêtes dans les attributes du findAll à la place :
    //   attributes: { include: [
    //     [sequelize.literal(`(SELECT COUNT(*) FROM evenementusers WHERE evenementusers.id_evenement = Evenement.id_evenement AND statut_participation IN ('confirme','present'))`), 'nombre_participants'],
    //     [sequelize.literal(`(SELECT COUNT(*) FROM evenementusers WHERE evenementusers.id_evenement = Evenement.id_evenement)`), 'nombre_inscrits'],
    //     [sequelize.literal(`(SELECT AVG(evaluation_evenement) FROM evenementusers WHERE evenementusers.id_evenement = Evenement.id_evenement AND evaluation_evenement IS NOT NULL)`), 'note_moyenne']
    //   ]}
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
        // Ne pas écraser les statuts manuels (brouillon, annule, reporte)
        const manualStatuses = ['brouillon', 'annule', 'reporte'];
        if (manualStatuses.includes(evenement.statut)) return;

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
      as: 'TypeEvenement',
      onDelete: 'RESTRICT'
    });

    Evenement.belongsTo(models.Lieu, {
      foreignKey: 'id_lieu',
      as: 'Lieu',
      onDelete: 'SET NULL'
    });

    Evenement.belongsTo(models.User, {
      foreignKey: 'id_user',
      as: 'Organisateur',
      onDelete: 'RESTRICT'
    });
    
    Evenement.hasMany(models.EvenementUser, {
      foreignKey: 'id_evenement',
      as: 'EvenementUsers',
      onDelete: 'CASCADE'
    });
    
    Evenement.hasMany(models.EvenementOeuvre, {
      foreignKey: 'id_evenement',
      as: 'EvenementOeuvres',
      onDelete: 'CASCADE'
    });

    Evenement.hasMany(models.EvenementOrganisation, {
      foreignKey: 'id_evenement',
      as: 'EvenementOrganisations',
      onDelete: 'CASCADE'
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
      as: 'Programmes',
      onDelete: 'CASCADE'
    });

    Evenement.hasMany(models.Media, {
      foreignKey: 'id_evenement',
      as: 'Medias',
      onDelete: 'CASCADE'
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
  
  Evenement.prototype.canRegister = async function() {
    if (!this.isActive()) return false;
    if (this.date_limite_inscription && new Date() > new Date(this.date_limite_inscription)) {
      return false;
    }
    if (!this.capacite_max) return true;
    const inscrits = await sequelize.models.EvenementUser.count({
      where: { id_evenement: this.id_evenement }
    });
    return inscrits < this.capacite_max;
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
  Evenement.getActiveEvents = function(limit = 100) {
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
      order: [['date_debut', 'ASC']],
      limit
    });
  };

  // ====================================================================
  // Méthodes de sérialisation JSON
  // ====================================================================

  const resolveI18n = (value, lang = 'fr') => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value[lang] || value.fr || value.ar || value.en || '';
  };

  Evenement.prototype.toCardJSON = function(lang = 'fr') {
    const plain = this.get({ plain: true });
    return {
      ...plain,
      nom_evenement: resolveI18n(plain.nom_evenement, lang),
      description: resolveI18n(plain.description, lang),
      accessibilite: resolveI18n(plain.accessibilite, lang),
    };
  };

  Evenement.prototype.toDetailJSON = function(lang = 'fr') {
    return this.toCardJSON(lang);
  };

  Evenement.prototype.toAdminJSON = function(lang = 'fr') {
    return this.toCardJSON(lang);
  };

  Evenement.afterDestroy(async (evenement, options) => {
    const { Favori, Vue, Signalement } = sequelize.models;
    const id = evenement.id_evenement;
    if (Favori) await Favori.destroy({ where: { type_entite: 'evenement', id_entite: id } });
    if (Vue) await Vue.destroy({ where: { type_entite: 'evenement', id_entite: id } });
    if (Signalement) await Signalement.destroy({ where: { type_entite: 'evenement', id_entite: id } });
  });

  return Evenement;
};
