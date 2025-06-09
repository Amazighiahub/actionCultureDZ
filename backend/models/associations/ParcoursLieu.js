const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ParcoursLieu = sequelize.define('ParcoursLieu', {
    id_parcours_lieu: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_parcours: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'parcours',
        key: 'id_parcours'
      }
    },
    id_lieu: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'lieux',
        key: 'id_lieu'
      }
    },
    id_evenement: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'evenement',
        key: 'id_evenement'
      }
    },
    ordre: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    duree_estimee: {
      type: DataTypes.INTEGER, // minutes
      allowNull: true,
      comment: 'Durée estimée en minutes à ce lieu'
    },
    distance_precedent: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Distance en km depuis le lieu précédent'
    },
    temps_trajet: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Temps de trajet en minutes depuis le lieu précédent'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes spécifiques pour cette étape du parcours'
    },
    transport_mode: {
      type: DataTypes.ENUM('marche', 'velo', 'voiture', 'transport_public'),
      allowNull: true,
      defaultValue: 'voiture'
    }
  }, {
    tableName: 'parcours_lieux',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['id_parcours', 'ordre'],
        name: 'unique_parcours_ordre'
      },
      {
        fields: ['id_parcours'],
        name: 'idx_parcours'
      },
      {
        fields: ['id_lieu'],
        name: 'idx_lieu'
      },
      {
        fields: ['id_evenement'],
        name: 'idx_evenement'
      }
    ]
  });

  // Associations
  ParcoursLieu.associate = (models) => {
    ParcoursLieu.belongsTo(models.Parcours, { 
      foreignKey: 'id_parcours',
      onDelete: 'CASCADE' 
    });
    
    ParcoursLieu.belongsTo(models.Lieu, { 
      foreignKey: 'id_lieu',
      onDelete: 'CASCADE' 
    });
    
    ParcoursLieu.belongsTo(models.Evenement, { 
      foreignKey: 'id_evenement',
      onDelete: 'SET NULL' 
    });
  };

  // Méthodes d'instance
  ParcoursLieu.prototype.toJSON = function() {
    const values = { ...this.get() };
    
    // Formater la durée en format lisible
    if (values.duree_estimee) {
      values.duree_formatee = values.duree_estimee >= 60 
        ? `${Math.floor(values.duree_estimee / 60)}h${values.duree_estimee % 60 > 0 ? values.duree_estimee % 60 + 'min' : ''}`
        : `${values.duree_estimee}min`;
    }
    
    // Formater le temps de trajet
    if (values.temps_trajet) {
      values.temps_trajet_formate = values.temps_trajet >= 60
        ? `${Math.floor(values.temps_trajet / 60)}h${values.temps_trajet % 60 > 0 ? values.temps_trajet % 60 + 'min' : ''}`
        : `${values.temps_trajet}min`;
    }
    
    // Formater la distance
    if (values.distance_precedent) {
      values.distance_formatee = values.distance_precedent >= 1
        ? `${values.distance_precedent.toFixed(1)} km`
        : `${(values.distance_precedent * 1000).toFixed(0)} m`;
    }
    
    return values;
  };

  // Méthodes statiques
  ParcoursLieu.reorderParcours = async function(parcoursId, transaction) {
    const etapes = await this.findAll({
      where: { id_parcours: parcoursId },
      order: [['ordre', 'ASC']],
      transaction
    });

    for (let i = 0; i < etapes.length; i++) {
      if (etapes[i].ordre !== i + 1) {
        await etapes[i].update({ ordre: i + 1 }, { transaction });
      }
    }
  };

  return ParcoursLieu;
};