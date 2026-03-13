const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Commentaire = sequelize.define('Commentaire', {
    id_commentaire: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    contenu: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    id_user: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'user',
        key: 'id_user'
      }
    },
    id_oeuvre: {
      type: DataTypes.INTEGER,
      references: {
        model: 'oeuvre',
        key: 'id_oeuvre'
      }
    },
    id_evenement: {
      type: DataTypes.INTEGER,
      references: {
        model: 'evenement',
        key: 'id_evenement'
      }
    },
    commentaire_parent_id: {
      type: DataTypes.INTEGER,
      references: {
        model: 'commentaire',
        key: 'id_commentaire'
      }
    },
    statut: {
      type: DataTypes.ENUM('publie', 'en_attente', 'rejete', 'supprime'),
      defaultValue: 'publie'
    },
    note_qualite: {
      type: DataTypes.INTEGER,
      validate: { min: 1, max: 5 }
    }
  }, {
    tableName: 'commentaire',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification',
    indexes: [
      { fields: ['id_user'] },
      { fields: ['id_oeuvre'] },
      { fields: ['id_evenement'] },
      { fields: ['statut'] },
      { fields: ['commentaire_parent_id'] },
      { fields: ['date_creation'] }
    ],
    hooks: {
      beforeValidate: (commentaire) => {
        if (!commentaire.id_oeuvre && !commentaire.id_evenement) {
          throw new Error('Un commentaire doit être associé à une œuvre ou un événement');
        }
      }
    }
  });

  // Associations
  Commentaire.associate = (models) => {
    Commentaire.belongsTo(models.User, { foreignKey: 'id_user' });
    Commentaire.belongsTo(models.Oeuvre, { foreignKey: 'id_oeuvre' });
    Commentaire.belongsTo(models.Evenement, { foreignKey: 'id_evenement' });
    Commentaire.belongsTo(models.Commentaire, { as: 'CommentaireParent', foreignKey: 'commentaire_parent_id', onDelete: 'CASCADE' });
    Commentaire.hasMany(models.Commentaire, { as: 'Reponses', foreignKey: 'commentaire_parent_id', onDelete: 'CASCADE' });
  };

  return Commentaire;
};