// ========================================
// Signalement.js - Modèle pour signalements
// ========================================

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Signalement = sequelize.define('Signalement', {
    id_signalement: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    type_entite: {
      type: DataTypes.ENUM('commentaire', 'oeuvre', 'evenement', 'user', 'artisanat'),
      allowNull: false,
      comment: 'Type d\'entité signalée'
    },
    id_entite: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID de l\'entité signalée'
    },
    id_user_signalant: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'user',
        key: 'id_user'
      },
      comment: 'Utilisateur qui signale'
    },
    motif: {
      type: DataTypes.ENUM(
        'spam',
        'contenu_inapproprie',
        'faux_contenu',
        'violation_droits',
        'harcelement',
        'incitation_haine',
        'contenu_illegal',
        'autre'
      ),
      allowNull: false,
      comment: 'Motif du signalement'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description détaillée du problème'
    },
    url_screenshot: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Capture d\'écran si fournie'
    },
    statut: {
      type: DataTypes.ENUM('en_attente', 'en_cours', 'traite', 'rejete'),
      defaultValue: 'en_attente',
      allowNull: false
    },
    priorite: {
      type: DataTypes.ENUM('basse', 'normale', 'haute', 'urgente'),
      defaultValue: 'normale',
      comment: 'Priorité basée sur le motif et l\'historique'
    },
    id_moderateur: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'user',
        key: 'id_user'
      },
      comment: 'Modérateur qui traite le signalement'
    },
    date_traitement: {
      type: DataTypes.DATE,
      allowNull: true
    },
    action_prise: {
      type: DataTypes.ENUM(
        'aucune',
        'avertissement',
        'suppression_contenu',
        'suspension_temporaire',
        'suspension_permanente',
        'signalement_autorites'
      ),
      allowNull: true
    },
    notes_moderation: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes du modérateur'
    },
    date_signalement: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'signalements',
    timestamps: true,
    createdAt: 'date_signalement',
    updatedAt: 'date_modification',
    indexes: [
      {
        fields: ['type_entite', 'id_entite'],
        name: 'idx_entite_signalee'
      },
      {
        fields: ['id_user_signalant'],
        name: 'idx_signalant'
      },
      {
        fields: ['statut', 'priorite'],
        name: 'idx_moderation'
      },
      {
        fields: ['date_signalement'],
        name: 'idx_date'
      },
      {
        unique: true,
        fields: ['type_entite', 'id_entite', 'id_user_signalant'],
        name: 'unique_signalement_user',
        comment: 'Un user ne peut signaler qu\'une fois la même entité'
      }
    ]
  });

  // Associations
  Signalement.associate = (models) => {
    Signalement.belongsTo(models.User, { 
      foreignKey: 'id_user_signalant',
      as: 'Signalant'
    });
    
    Signalement.belongsTo(models.User, { 
      foreignKey: 'id_moderateur',
      as: 'Moderateur'
    });

    // Relations polymorphiques selon type_entite
    Signalement.belongsTo(models.Commentaire, {
      foreignKey: 'id_entite',
      constraints: false,
      as: 'CommentaireSignale'
    });

    Signalement.belongsTo(models.Oeuvre, {
      foreignKey: 'id_entite',
      constraints: false,
      as: 'OeuvreSignalee'
    });

    Signalement.belongsTo(models.User, {
      foreignKey: 'id_entite',
      constraints: false,
      as: 'UserSignale'
    });
  };

  // Hooks
  Signalement.beforeCreate(async (signalement) => {
    // Définir la priorité selon le motif
    const hautesPriorites = ['contenu_illegal', 'harcelement', 'incitation_haine'];
    if (hautesPriorites.includes(signalement.motif)) {
      signalement.priorite = 'haute';
    }

    // Vérifier l'historique du signalant (spam de signalements)
    const countRecent = await Signalement.count({
      where: {
        id_user_signalant: signalement.id_user_signalant,
        date_signalement: {
          [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24h
        }
      }
    });

    if (countRecent > 10) {
      signalement.priorite = 'basse'; // Possible abus
    }
  });

  // Méthodes statiques
  Signalement.getQueue = async function(moderatorId = null) {
    const where = {
      statut: ['en_attente', 'en_cours']
    };

    if (moderatorId) {
      where[Op.or] = [
        { id_moderateur: null },
        { id_moderateur: moderatorId }
      ];
    }

    return await this.findAll({
      where,
      include: [
        { model: models.User, as: 'Signalant', attributes: ['nom', 'prenom'] }
      ],
      order: [
        ['priorite', 'DESC'],
        ['date_signalement', 'ASC']
      ]
    });
  };

  Signalement.process = async function(signalementId, moderatorId, action, notes) {
    const signalement = await this.findByPk(signalementId);
    if (!signalement) throw new Error('Signalement non trouvé');

    await signalement.update({
      statut: 'traite',
      id_moderateur: moderatorId,
      date_traitement: new Date(),
      action_prise: action,
      notes_moderation: notes
    });

    // Appliquer l'action
    switch (action) {
      case 'suppression_contenu':
        await this.deleteContent(signalement);
        break;
      case 'suspension_temporaire':
      case 'suspension_permanente':
        await this.suspendUser(signalement, action);
        break;
      case 'avertissement':
        await this.warnUser(signalement);
        break;
    }

    return signalement;
  };

  return Signalement;
};