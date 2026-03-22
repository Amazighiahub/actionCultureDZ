'use strict';

/**
 * Migration: Audit DBA — Index composites optimaux + nettoyage
 *
 * Problèmes adressés:
 * - DBA-10: Index composite notification(id_user, lu, date_creation) pour la requête principale
 * - DBA-11: Index composite vues(type_entite, id_entite, date_vue) pour les stats par période
 * - Index composite evenement(statut, date_debut) pour les requêtes d'événements actifs/à venir
 * - Index composite oeuvre(saisi_par, statut) pour "mes oeuvres" filtrées par statut
 * - Index composite user(email_verifie, statut, date_creation) pour le cron de rappel vérification
 * - Index composite evenementusers(id_evenement, statut_participation) pour le comptage participants
 * - Index composite critique_evaluation(id_oeuvre, id_user) unique pour empêcher les doublons
 * - Suppression d'index à faible cardinalité sur ENUM (DBA-20)
 *
 * Impact: 0 downtime, 0 changement de comportement
 */

const COMPOSITE_INDEXES = [
  // ── Notification: requête la plus fréquente WHERE id_user=? AND lu=false ORDER BY date_creation DESC
  {
    table: 'notification',
    columns: ['id_user', 'lu', 'date_creation'],
    name: 'idx_notification_user_lu_date',
    comment: 'Couvre getNonLues() et le badge de notifications non lues'
  },

  // ── Vues: stats par entité et période
  {
    table: 'vues',
    columns: ['type_entite', 'id_entite', 'date_vue'],
    name: 'idx_vues_entite_date',
    comment: 'Couvre getViewStats() et les GROUP BY date_vue par entité'
  },

  // ── Evenement: événements actifs/à venir (statut + date_debut)
  {
    table: 'evenement',
    columns: ['statut', 'date_debut'],
    name: 'idx_evenement_statut_debut',
    comment: 'Couvre getActiveEvents(), checkUpcomingEvents(), filtrage par statut+date'
  },

  // ── Evenement: événements par organisateur + statut
  {
    table: 'evenement',
    columns: ['id_user', 'statut'],
    name: 'idx_evenement_user_statut',
    comment: 'Couvre getMesEvenements() et getMyEvenements()'
  },

  // ── Oeuvre: "mes oeuvres" filtrées par statut
  {
    table: 'oeuvre',
    columns: ['saisi_par', 'statut'],
    name: 'idx_oeuvre_saisi_statut',
    comment: 'Couvre getMesOeuvres() et getMyOeuvres() avec filtre statut'
  },

  // ── User: cron rappel vérification email
  {
    table: 'user',
    columns: ['email_verifie', 'statut'],
    name: 'idx_user_email_verifie_statut',
    comment: 'Couvre sendEmailVerificationReminders() et filtrage newsletter'
  },

  // ── EvenementUsers: comptage participants par événement+statut
  {
    table: 'evenementusers',
    columns: ['id_evenement', 'statut_participation'],
    name: 'idx_eventuser_event_statut',
    comment: 'Couvre le comptage de participants confirmés/présents'
  },

  // ── Critique: empêcher un user de noter 2 fois la même oeuvre
  {
    table: 'critique_evaluation',
    columns: ['id_oeuvre', 'id_user'],
    name: 'idx_critique_oeuvre_user_unique',
    unique: true,
    comment: 'Un seul avis par utilisateur par oeuvre'
  },

  // ── Favoris: recherche par user + type + tri date
  {
    table: 'favoris',
    columns: ['id_user', 'type_entite', 'date_ajout'],
    name: 'idx_favoris_user_type_date',
    comment: 'Couvre la liste des favoris par type triée par date'
  },

  // ── Signalements: file de modération triée
  {
    table: 'signalements',
    columns: ['statut', 'priorite', 'date_signalement'],
    name: 'idx_signalement_moderation_queue',
    comment: 'Couvre getQueue() ORDER BY priorite DESC, date_signalement ASC'
  },

  // ── Email verifications: recherche token valide
  {
    table: 'email_verifications',
    columns: ['id_user', 'type', 'used_at', 'expires_at'],
    name: 'idx_email_verif_user_type_active',
    comment: 'Couvre hasActiveToken() et invalidateUserTokens()'
  },

  // ── Audit logs: recherche par action + date
  {
    table: 'audit_logs',
    columns: ['action', 'date_action'],
    name: 'idx_audit_action_date',
    comment: 'Couvre la recherche de logs par action dans une période'
  },

  // ── Commentaire: commentaires par oeuvre triés par date
  {
    table: 'commentaire',
    columns: ['id_oeuvre', 'statut', 'date_creation'],
    name: 'idx_commentaire_oeuvre_statut_date',
    comment: 'Couvre l affichage des commentaires publiés par oeuvre'
  },

  // ── Commentaire: commentaires par événement triés par date
  {
    table: 'commentaire',
    columns: ['id_evenement', 'statut', 'date_creation'],
    name: 'idx_commentaire_event_statut_date',
    comment: 'Couvre l affichage des commentaires publiés par événement'
  },
];

// Index ENUM à faible cardinalité à supprimer (DBA-20)
const INDEXES_TO_REMOVE = [
  { table: 'media', name: 'media_qualite' },
  { table: 'media', name: 'media_droits_usage' },
];

// Colonnes manquantes utilisées par cronService et notificationService (DBA-18)
const { DataTypes } = require('sequelize');
const MISSING_COLUMNS = [
  { table: 'evenement', column: 'rappel_envoye', definition: { type: DataTypes.BOOLEAN, defaultValue: false, comment: 'Rappel 24h avant envoyé (cron)' } },
  { table: 'evenement', column: 'rappel_derniere_minute', definition: { type: DataTypes.BOOLEAN, defaultValue: false, comment: 'Rappel 1h avant envoyé (cron)' } },
  { table: 'user', column: 'rappel_verification_envoye', definition: { type: DataTypes.BOOLEAN, defaultValue: false, comment: 'Rappel vérification email envoyé (cron)' } },
  { table: 'user', column: 'notifications_evenements', definition: { type: DataTypes.BOOLEAN, defaultValue: true, comment: 'Accepte les notifications événements' } },
  { table: 'user', column: 'notifications_favoris', definition: { type: DataTypes.BOOLEAN, defaultValue: true, comment: 'Accepte les notifications favoris' } },
];

module.exports = {
  async up(queryInterface) {
    // 1. Ajouter les colonnes manquantes
    console.log('📊 Audit DBA: Ajout des colonnes manquantes...');
    for (const col of MISSING_COLUMNS) {
      try {
        await queryInterface.addColumn(col.table, col.column, col.definition);
        console.log(`  ✅ ${col.table}.${col.column} ajouté`);
      } catch (err) {
        if (err.original?.code === 'ER_DUP_FIELDNAME') {
          console.log(`  ⏭️  ${col.table}.${col.column} existe déjà`);
        } else {
          console.error(`  ❌ ${col.table}.${col.column} failed:`, err.message);
        }
      }
    }

    // 2. Ajouter les index composites
    console.log('📊 Audit DBA: Ajout des index composites optimaux...');
    let added = 0;

    for (const idx of COMPOSITE_INDEXES) {
      try {
        const options = { name: idx.name };
        if (idx.unique) options.unique = true;
        await queryInterface.addIndex(idx.table, idx.columns, options);
        console.log(`  ✅ ${idx.name} (${idx.table})`);
        added++;
      } catch (err) {
        if (err.original?.code === 'ER_DUP_KEYNAME' || err.original?.code === 'ER_NO_SUCH_TABLE') {
          console.log(`  ⏭️  ${idx.name} skipped (${err.original.code})`);
        } else {
          console.error(`  ❌ ${idx.name} failed:`, err.message);
        }
      }
    }

    // Supprimer les index inutiles sur ENUM faible cardinalité
    for (const idx of INDEXES_TO_REMOVE) {
      try {
        await queryInterface.removeIndex(idx.table, idx.name);
        console.log(`  🗑️  Removed ${idx.name} (low cardinality ENUM)`);
      } catch (err) {
        console.log(`  ⏭️  ${idx.name} removal skipped (may not exist)`);
      }
    }

    console.log(`✅ Audit DBA terminé: ${added}/${COMPOSITE_INDEXES.length} index ajoutés`);
  },

  async down(queryInterface) {
    console.log('🔄 Rollback Audit DBA...');

    // 1. Supprimer les index composites
    for (const idx of COMPOSITE_INDEXES) {
      try {
        await queryInterface.removeIndex(idx.table, idx.name);
      } catch (err) {
        console.log(`  ⏭️  ${idx.name} removal skipped`);
      }
    }

    // 2. Re-créer les index ENUM supprimés
    for (const idx of INDEXES_TO_REMOVE) {
      try {
        const col = idx.name.replace(`${idx.table}_`, '');
        await queryInterface.addIndex(idx.table, [col], { name: idx.name });
      } catch (err) {
        console.log(`  ⏭️  ${idx.name} re-creation skipped`);
      }
    }

    // 3. Supprimer les colonnes ajoutées
    for (const col of MISSING_COLUMNS) {
      try {
        await queryInterface.removeColumn(col.table, col.column);
      } catch (err) {
        console.log(`  ⏭️  ${col.table}.${col.column} removal skipped`);
      }
    }
  }
};
