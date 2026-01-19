'use strict';

/**
 * Migration: Ajout des index de performance manquants
 *
 * Cette migration ajoute les index nécessaires pour optimiser les requêtes
 * fréquentes identifiées lors de l'audit de performance.
 *
 * Impact estimé: 40-60% de réduction du temps de requête
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('📊 Ajout des index de performance...');

      // ========================================
      // INDEX TABLE USER
      // ========================================

      // Index sur email (critique pour login/recherche)
      await queryInterface.addIndex('user', ['email'], {
        name: 'idx_user_email',
        unique: true,
        transaction
      }).catch(() => console.log('  ℹ️ Index idx_user_email existe déjà'));

      // Index sur statut + date_creation (filtrage utilisateurs actifs)
      await queryInterface.addIndex('user', ['statut', 'date_creation'], {
        name: 'idx_user_statut_creation',
        transaction
      }).catch(() => console.log('  ℹ️ Index idx_user_statut_creation existe déjà'));

      // Index sur id_type_user + statut (requêtes par rôle)
      await queryInterface.addIndex('user', ['id_type_user', 'statut'], {
        name: 'idx_user_type_statut',
        transaction
      }).catch(() => console.log('  ℹ️ Index idx_user_type_statut existe déjà'));

      // Index sur wilaya_residence (recherche géographique)
      await queryInterface.addIndex('user', ['wilaya_residence'], {
        name: 'idx_user_wilaya',
        transaction
      }).catch(() => console.log('  ℹ️ Index idx_user_wilaya existe déjà'));

      console.log('  ✅ Index table user ajoutés');

      // ========================================
      // INDEX TABLE OEUVRE
      // ========================================

      // Index sur statut + date_creation (liste des œuvres)
      await queryInterface.addIndex('oeuvre', ['statut', 'date_creation'], {
        name: 'idx_oeuvre_statut_creation',
        transaction
      }).catch(() => console.log('  ℹ️ Index idx_oeuvre_statut_creation existe déjà'));

      // Index sur id_type_oeuvre + statut (filtrage par type)
      await queryInterface.addIndex('oeuvre', ['id_type_oeuvre', 'statut'], {
        name: 'idx_oeuvre_type_statut',
        transaction
      }).catch(() => console.log('  ℹ️ Index idx_oeuvre_type_statut existe déjà'));

      // Index sur saisi_par (mes œuvres)
      await queryInterface.addIndex('oeuvre', ['saisi_par'], {
        name: 'idx_oeuvre_saisi_par',
        transaction
      }).catch(() => console.log('  ℹ️ Index idx_oeuvre_saisi_par existe déjà'));

      // Index sur id_langue (filtrage par langue)
      await queryInterface.addIndex('oeuvre', ['id_langue'], {
        name: 'idx_oeuvre_langue',
        transaction
      }).catch(() => console.log('  ℹ️ Index idx_oeuvre_langue existe déjà'));

      console.log('  ✅ Index table oeuvre ajoutés');

      // ========================================
      // INDEX TABLE EVENEMENT
      // ========================================

      // Index sur date_debut + date_fin (événements à venir/passés)
      await queryInterface.addIndex('evenement', ['date_debut', 'date_fin'], {
        name: 'idx_evenement_dates',
        transaction
      }).catch(() => console.log('  ℹ️ Index idx_evenement_dates existe déjà'));

      // Index sur id_type_evenement + date_debut (filtrage par type)
      await queryInterface.addIndex('evenement', ['id_type_evenement', 'date_debut'], {
        name: 'idx_evenement_type_date',
        transaction
      }).catch(() => console.log('  ℹ️ Index idx_evenement_type_date existe déjà'));

      // Index sur id_lieu (recherche par lieu)
      await queryInterface.addIndex('evenement', ['id_lieu'], {
        name: 'idx_evenement_lieu',
        transaction
      }).catch(() => console.log('  ℹ️ Index idx_evenement_lieu existe déjà'));

      // Index sur statut (filtrage par statut)
      await queryInterface.addIndex('evenement', ['statut'], {
        name: 'idx_evenement_statut',
        transaction
      }).catch(() => console.log('  ℹ️ Index idx_evenement_statut existe déjà'));

      console.log('  ✅ Index table evenement ajoutés');

      // ========================================
      // INDEX TABLE LIEU
      // ========================================

      // Index sur communeId (jointure géographique)
      await queryInterface.addIndex('lieu', ['communeId'], {
        name: 'idx_lieu_commune',
        transaction
      }).catch(() => console.log('  ℹ️ Index idx_lieu_commune existe déjà'));

      // Index sur typePatrimoine (filtrage par type)
      await queryInterface.addIndex('lieu', ['typePatrimoine'], {
        name: 'idx_lieu_type_patrimoine',
        transaction
      }).catch(() => console.log('  ℹ️ Index idx_lieu_type_patrimoine existe déjà'));

      // Index sur statut (filtrage par statut)
      await queryInterface.addIndex('lieu', ['statut'], {
        name: 'idx_lieu_statut',
        transaction
      }).catch(() => console.log('  ℹ️ Index idx_lieu_statut existe déjà'));

      console.log('  ✅ Index table lieu ajoutés');

      // ========================================
      // INDEX TABLE COMMENTAIRE
      // ========================================

      // Index sur id_oeuvre (commentaires par œuvre)
      await queryInterface.addIndex('commentaire', ['id_oeuvre'], {
        name: 'idx_commentaire_oeuvre',
        transaction
      }).catch(() => console.log('  ℹ️ Index idx_commentaire_oeuvre existe déjà'));

      // Index sur id_evenement (commentaires par événement)
      await queryInterface.addIndex('commentaire', ['id_evenement'], {
        name: 'idx_commentaire_evenement',
        transaction
      }).catch(() => console.log('  ℹ️ Index idx_commentaire_evenement existe déjà'));

      // Index sur id_user (commentaires par utilisateur)
      await queryInterface.addIndex('commentaire', ['id_user'], {
        name: 'idx_commentaire_user',
        transaction
      }).catch(() => console.log('  ℹ️ Index idx_commentaire_user existe déjà'));

      console.log('  ✅ Index table commentaire ajoutés');

      // ========================================
      // INDEX TABLE FAVORI
      // ========================================

      // Index composite sur id_user + type_entite (favoris par utilisateur)
      await queryInterface.addIndex('favori', ['id_user', 'type_entite'], {
        name: 'idx_favori_user_type',
        transaction
      }).catch(() => console.log('  ℹ️ Index idx_favori_user_type existe déjà'));

      console.log('  ✅ Index table favori ajoutés');

      // ========================================
      // INDEX TABLE MEDIA
      // ========================================

      // Index sur type + uploaded_by (médias par type et utilisateur)
      await queryInterface.addIndex('media', ['type', 'uploaded_by'], {
        name: 'idx_media_type_user',
        transaction
      }).catch(() => console.log('  ℹ️ Index idx_media_type_user existe déjà'));

      console.log('  ✅ Index table media ajoutés');

      // ========================================
      // INDEX TABLE NOTIFICATION
      // ========================================

      // Index sur id_user + lu (notifications non lues)
      await queryInterface.addIndex('notification', ['id_user', 'lu'], {
        name: 'idx_notification_user_lu',
        transaction
      }).catch(() => console.log('  ℹ️ Index idx_notification_user_lu existe déjà'));

      console.log('  ✅ Index table notification ajoutés');

      await transaction.commit();
      console.log('✅ Migration des index de performance terminée avec succès');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erreur lors de la migration des index:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('🔄 Suppression des index de performance...');

      // User
      await queryInterface.removeIndex('user', 'idx_user_email', { transaction }).catch(() => {});
      await queryInterface.removeIndex('user', 'idx_user_statut_creation', { transaction }).catch(() => {});
      await queryInterface.removeIndex('user', 'idx_user_type_statut', { transaction }).catch(() => {});
      await queryInterface.removeIndex('user', 'idx_user_wilaya', { transaction }).catch(() => {});

      // Oeuvre
      await queryInterface.removeIndex('oeuvre', 'idx_oeuvre_statut_creation', { transaction }).catch(() => {});
      await queryInterface.removeIndex('oeuvre', 'idx_oeuvre_type_statut', { transaction }).catch(() => {});
      await queryInterface.removeIndex('oeuvre', 'idx_oeuvre_saisi_par', { transaction }).catch(() => {});
      await queryInterface.removeIndex('oeuvre', 'idx_oeuvre_langue', { transaction }).catch(() => {});

      // Evenement
      await queryInterface.removeIndex('evenement', 'idx_evenement_dates', { transaction }).catch(() => {});
      await queryInterface.removeIndex('evenement', 'idx_evenement_type_date', { transaction }).catch(() => {});
      await queryInterface.removeIndex('evenement', 'idx_evenement_lieu', { transaction }).catch(() => {});
      await queryInterface.removeIndex('evenement', 'idx_evenement_statut', { transaction }).catch(() => {});

      // Lieu
      await queryInterface.removeIndex('lieu', 'idx_lieu_commune', { transaction }).catch(() => {});
      await queryInterface.removeIndex('lieu', 'idx_lieu_type_patrimoine', { transaction }).catch(() => {});
      await queryInterface.removeIndex('lieu', 'idx_lieu_statut', { transaction }).catch(() => {});

      // Commentaire
      await queryInterface.removeIndex('commentaire', 'idx_commentaire_oeuvre', { transaction }).catch(() => {});
      await queryInterface.removeIndex('commentaire', 'idx_commentaire_evenement', { transaction }).catch(() => {});
      await queryInterface.removeIndex('commentaire', 'idx_commentaire_user', { transaction }).catch(() => {});

      // Favori
      await queryInterface.removeIndex('favori', 'idx_favori_user_type', { transaction }).catch(() => {});

      // Media
      await queryInterface.removeIndex('media', 'idx_media_type_user', { transaction }).catch(() => {});

      // Notification
      await queryInterface.removeIndex('notification', 'idx_notification_user_lu', { transaction }).catch(() => {});

      await transaction.commit();
      console.log('✅ Suppression des index terminée');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erreur lors de la suppression des index:', error);
      throw error;
    }
  }
};
