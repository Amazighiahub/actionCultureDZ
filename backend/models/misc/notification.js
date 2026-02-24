// models/Notification.js - Modèle pour l'historique des notifications
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Notification = sequelize.define('Notification', {
    id_notification: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_user: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'user',
        key: 'id_user'
      }
    },
    type_notification: {
      type: DataTypes.ENUM(
        'validation_participation',
        'annulation_evenement',
        'modification_programme',
        'nouvel_evenement',
        'nouvelle_oeuvre',
        'nouveau_commentaire',
        'bienvenue',
        'validation_compte',
        'message_admin',
        'rappel_evenement',
        'autre'
      ),
      allowNull: false
    },
    titre: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    id_evenement: {
      type: DataTypes.INTEGER,
      references: {
        model: 'evenement',
        key: 'id_evenement'
      }
    },
    id_programme: {
      type: DataTypes.INTEGER,
      references: {
        model: 'programme',
        key: 'id_programme'
      }
    },
    id_oeuvre: {
      type: DataTypes.INTEGER,
      references: {
        model: 'oeuvre',
        key: 'id_oeuvre'
      }
    },
    url_action: {
      type: DataTypes.STRING(500),
      comment: 'URL vers l\'élément concerné'
    },
    email_envoye: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Indique si un email a été envoyé'
    },
    sms_envoye: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Indique si un SMS a été envoyé'
    },
    lu: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    date_lecture: {
      type: DataTypes.DATE
    },
    priorite: {
      type: DataTypes.ENUM('basse', 'normale', 'haute', 'urgente'),
      defaultValue: 'normale'
    },
    expire_le: {
      type: DataTypes.DATE,
      comment: 'Date d\'expiration de la notification'
    }
  }, {
    tableName: 'notification',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification',
    indexes: [
      {
        fields: ['id_user', 'lu']
      },
      {
        fields: ['type_notification']
      },
      {
        fields: ['date_creation']
      }
    ]
  });

  // Associations
  Notification.associate = (models) => {
    Notification.belongsTo(models.User, { 
      foreignKey: 'id_user',
      as: 'Utilisateur'
    });
    
    Notification.belongsTo(models.Evenement, { 
      foreignKey: 'id_evenement',
      as: 'Evenement'
    });
    
    Notification.belongsTo(models.Programme, { 
      foreignKey: 'id_programme',
      as: 'Programme'
    });
    
    Notification.belongsTo(models.Oeuvre, { 
      foreignKey: 'id_oeuvre',
      as: 'Oeuvre'
    });
  };

  // Méthodes d'instance
  Notification.prototype.marquerCommeLue = async function() {
    this.lu = true;
    this.date_lecture = new Date();
    await this.save();
  };

  // Méthodes statiques
  Notification.getNonLues = async function(userId) {
    return await this.findAll({
      where: {
        id_user: userId,
        lu: false
      },
      order: [['date_creation', 'DESC']]
    });
  };

  Notification.marquerToutesLues = async function(userId) {
    return await this.update(
      { 
        lu: true, 
        date_lecture: new Date() 
      },
      {
        where: {
          id_user: userId,
          lu: false
        }
      }
    );
  };

  Notification.supprimerAnciennes = async function(joursRetention = 90) {
    const datelimite = new Date();
    dateLimit.setDate(dateLimit.getDate() - joursRetention);
    
    return await this.destroy({
      where: {
        date_creation: {
          [sequelize.Op.lt]: dateLimit
        },
        lu: true
      }
    });
  };

  return Notification;
};