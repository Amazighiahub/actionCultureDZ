const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EvenementOrganisation = sequelize.define('EvenementOrganisation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_evenement: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'evenement',
        key: 'id_evenement'
      }
    },
    id_organisation: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'organisation',
        key: 'id_organisation'
      }
    },
    role: {
      type: DataTypes.ENUM(
        'organisateur_principal',
        'co_organisateur',
        'partenaire',
        'sponsor',
        'media_partner',
        'soutien'
      ),
      defaultValue: 'partenaire',
      comment: 'Rôle de l\'organisation dans l\'événement'
    },
    
    // ===== NOUVEAUX CHAMPS AJOUTÉS =====
    
    // Description de la contribution
    contribution: {
      type: DataTypes.TEXT,
      comment: 'Description de la contribution de l\'organisation'
    },
    

    
    // Affichage du logo
    logo_affichage: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Autorisation d\'afficher le logo de l\'organisation'
    },
    
    // Mention dans les communications
    mention_communication: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Mention de l\'organisation dans les communications'
    },
    
    // Nombre d'invitations VIP
    invitation_vip: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Nombre d\'invitations VIP accordées'
    }
    
  }, {
    tableName: 'evenementorganisation',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification',
    indexes: [
      {
        unique: true,
        fields: ['id_organisation', 'id_evenement']
      },
      {
        fields: ['role']
      }
    ]
  });

  // Associations
  EvenementOrganisation.associate = (models) => {
    EvenementOrganisation.belongsTo(models.Evenement, { 
      foreignKey: 'id_evenement',
      as: 'Evenement'
    });
    
    EvenementOrganisation.belongsTo(models.Organisation, { 
      foreignKey: 'id_organisation',
      as: 'Organisation'
    });
  };
  
  // Méthodes de classe
  EvenementOrganisation.getSponsors = async function(id_evenement) {
    return this.findAll({
      where: {
        id_evenement,
        role: 'sponsor'
      },
      include: ['Organisation'],
      order: [['montant_sponsoring', 'DESC']]
    });
  };
  
  EvenementOrganisation.getOrganisateurs = async function(id_evenement) {
    return this.findAll({
      where: {
        id_evenement,
        role: ['organisateur_principal', 'co_organisateur']
      },
      include: ['Organisation']
    });
  };
  
  // Méthodes d'instance
  EvenementOrganisation.prototype.isSponsor = function() {
    return this.role === 'sponsor';
  };
  
  EvenementOrganisation.prototype.isOrganisateur = function() {
    return ['organisateur_principal', 'co_organisateur'].includes(this.role);
  };

  return EvenementOrganisation;
};