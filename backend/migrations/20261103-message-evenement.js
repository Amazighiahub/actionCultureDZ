'use strict';

/**
 * Migration : messages de l'organisateur à ses participants (table message_evenement).
 * Changement de programme, point de rencontre, programme en PDF, groupe WhatsApp, dossier Drive :
 * chaque message est gardé (l'organisateur voit ce qu'il a déjà envoyé) et arrive aux participants
 * par notification sur le site (type « message_evenement ») et par email.
 */
const TYPES = [
  'validation_participation', 'annulation_evenement', 'modification_programme', 'nouvel_evenement',
  'nouvelle_oeuvre', 'nouveau_commentaire', 'bienvenue', 'validation_compte', 'message_admin',
  'rappel_evenement', 'autre'
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('message_evenement')) {
      await queryInterface.createTable('message_evenement', {
        id_message: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        id_evenement: {
          type: Sequelize.INTEGER, allowNull: false,
          references: { model: 'evenement', key: 'id_evenement' }, onDelete: 'CASCADE', onUpdate: 'CASCADE'
        },
        id_user: {
          type: Sequelize.INTEGER, allowNull: true,
          references: { model: 'user', key: 'id_user' }, onDelete: 'SET NULL', onUpdate: 'CASCADE'
        },
        cible: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'tous' },
        titre: { type: Sequelize.STRING(150), allowNull: false },
        message: { type: Sequelize.TEXT, allowNull: false },
        point_rencontre: { type: Sequelize.STRING(300), allowNull: true },
        lien_programme: { type: Sequelize.STRING(500), allowNull: true },
        lien_whatsapp: { type: Sequelize.STRING(500), allowNull: true },
        lien_drive: { type: Sequelize.STRING(500), allowNull: true },
        nb_destinataires: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        nb_emails_envoyes: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        nb_emails_echoues: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        date_creation: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
      await queryInterface.addIndex('message_evenement', ['id_evenement', 'date_creation']);
    }

    const [colonnes] = await queryInterface.sequelize.query("SHOW COLUMNS FROM notification LIKE 'type_notification'");
    if (colonnes[0] && !String(colonnes[0].Type).includes('message_evenement')) {
      await queryInterface.changeColumn('notification', 'type_notification', {
        type: Sequelize.ENUM(...TYPES, 'message_evenement'), allowNull: false
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query("UPDATE notification SET type_notification = 'autre' WHERE type_notification = 'message_evenement'");
    await queryInterface.changeColumn('notification', 'type_notification', { type: Sequelize.ENUM(...TYPES), allowNull: false });
    await queryInterface.dropTable('message_evenement');
  }
};
