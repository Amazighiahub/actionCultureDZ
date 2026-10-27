// models/events/messageEvenement.js
// Message de l'organisateur à ses participants (changement de programme, point de rencontre,
// programme en PDF, groupe WhatsApp, dossier Drive), gardé pour l'historique des envois.
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MessageEvenement = sequelize.define('MessageEvenement', {
    id_message: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_evenement: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'evenement', key: 'id_evenement' }
    },
    id_user: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Auteur du message (organisateur ou administration)'
    },
    cible: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'tous',
      comment: 'tous (sauf annulés), confirme, en_attente'
    },
    titre: { type: DataTypes.STRING(150), allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    point_rencontre: { type: DataTypes.STRING(300), allowNull: true },
    lien_programme: { type: DataTypes.STRING(500), allowNull: true, comment: 'Programme en PDF' },
    lien_whatsapp: { type: DataTypes.STRING(500), allowNull: true },
    lien_drive: { type: DataTypes.STRING(500), allowNull: true },
    nb_destinataires: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    nb_emails_envoyes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    nb_emails_echoues: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
  }, {
    tableName: 'message_evenement',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: false,
    indexes: [{ fields: ['id_evenement', 'date_creation'] }]
  });

  MessageEvenement.associate = (models) => {
    MessageEvenement.belongsTo(models.Evenement, { foreignKey: 'id_evenement', onDelete: 'CASCADE' });
    MessageEvenement.belongsTo(models.User, { as: 'Auteur', foreignKey: 'id_user', onDelete: 'SET NULL' });
  };

  return MessageEvenement;
};
