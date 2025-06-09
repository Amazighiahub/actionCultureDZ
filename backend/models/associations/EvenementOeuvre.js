const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EvenementOeuvre = sequelize.define('EvenementOeuvre', {
    id_EventOeuvre: {
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
    id_oeuvre: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'oeuvre',
        key: 'id_oeuvre'
      }
    },
    id_presentateur: {
      type: DataTypes.INTEGER,
      references: {
        model: 'user',
        key: 'id_user'
      },
      comment: 'Utilisateur qui présente l\'œuvre'
    },
    
    // ===== NOUVEAUX CHAMPS AJOUTÉS =====
    
    // Ordre de présentation dans l'événement
    ordre_presentation: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Ordre de présentation de l\'œuvre durant l\'événement'
    },
    
    // Durée de présentation en minutes
    duree_presentation: {
      type: DataTypes.INTEGER,
      comment: 'Durée de présentation en minutes'
    },
    
    // Description spécifique pour cette présentation
    description_presentation: {
      type: DataTypes.TEXT,
      comment: 'Description spécifique de l\'œuvre pour cet événement'
    },
    
   
    
   
    
  }, {
    tableName: 'evenement_oeuvre',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['id_evenement', 'id_oeuvre']
      },
      {
        fields: ['ordre_presentation']
      }
    ]
  });

  // Associations
  EvenementOeuvre.associate = (models) => {
    EvenementOeuvre.belongsTo(models.Evenement, { 
      foreignKey: 'id_evenement',
      as: 'Evenement'
    });
    
    EvenementOeuvre.belongsTo(models.Oeuvre, { 
      foreignKey: 'id_oeuvre',
      as: 'Oeuvre'
    });
    
    EvenementOeuvre.belongsTo(models.User, { 
      as: 'Presentateur', 
      foreignKey: 'id_presentateur' 
    });
  };
  
  // Méthodes d'instance
  EvenementOeuvre.prototype.addMateriel = function(item) {
    const materiel = this.materiel_exposition || [];
    if (!materiel.includes(item)) {
      materiel.push(item);
      this.materiel_exposition = materiel;
    }
  };
  
  EvenementOeuvre.prototype.removeMateriel = function(item) {
    const materiel = this.materiel_exposition || [];
    const index = materiel.indexOf(item);
    if (index > -1) {
      materiel.splice(index, 1);
      this.materiel_exposition = materiel;
    }
  };

  return EvenementOeuvre;
};