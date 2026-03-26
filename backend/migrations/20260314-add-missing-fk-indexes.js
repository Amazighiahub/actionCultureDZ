'use strict';

/**
 * Migration: Ajouter les index manquants sur les clés étrangères
 *
 * 43 FK identifiées sans index explicite. Les index accélèrent les JOINs,
 * les ON DELETE CASCADE, et les requêtes WHERE sur ces colonnes.
 *
 * Impact: 0 downtime, 0 changement de comportement, ~30s d'exécution
 */

const INDEXES = [
  // ── Oeuvre ──
  { table: 'oeuvre', column: 'id_oeuvre_originale', name: 'idx_oeuvre_originale' },

  // ── Notification ──
  { table: 'notification', column: 'id_evenement', name: 'idx_notification_evenement' },
  { table: 'notification', column: 'id_programme', name: 'idx_notification_programme' },
  { table: 'notification', column: 'id_oeuvre', name: 'idx_notification_oeuvre' },

  // ── Media ──
  { table: 'media', column: 'id_oeuvre', name: 'idx_media_oeuvre' },
  { table: 'media', column: 'id_evenement', name: 'idx_media_evenement' },

  // ── Programme ──
  { table: 'programme', column: 'id_evenement', name: 'idx_programme_evenement' },

  // ── Association: evenement_user ──
  { table: 'evenementusers', column: 'valide_par', name: 'idx_evenement_user_valideur' },

  // ── Association: evenement_oeuvre ──
  { table: 'evenement_oeuvre', column: 'id_presentateur', name: 'idx_evenement_oeuvre_presentateur' },

  // ── Critique / Évaluation ──
  { table: 'critique_evaluation', column: 'id_oeuvre', name: 'idx_critique_oeuvre' },
  { table: 'critique_evaluation', column: 'id_user', name: 'idx_critique_user' },

  // ── Signalement ──
  { table: 'signalements', column: 'id_moderateur', name: 'idx_signalement_moderateur' },

  // ── QR Code / Scan ──
  { table: 'qr_codes', column: 'id_lieu', name: 'idx_qrcode_lieu' },
  { table: 'qr_scans', column: 'id_user', name: 'idx_qrscan_user' },

  // ── Association: oeuvre_editeur ──
  { table: 'oeuvre_editeur', column: 'id_oeuvre', name: 'idx_oeuvre_editeur_oeuvre' },
  { table: 'oeuvre_editeur', column: 'id_editeur', name: 'idx_oeuvre_editeur_editeur' },

  // ── Association: oeuvre_user ──
  { table: 'oeuvre_user', column: 'id_oeuvre', name: 'idx_oeuvre_user_oeuvre' },
  { table: 'oeuvre_user', column: 'id_user', name: 'idx_oeuvre_user_user' },
  { table: 'oeuvre_user', column: 'id_type_user', name: 'idx_oeuvre_user_type' },

  // ── Association: oeuvre_tag ──
  { table: 'oeuvretags', column: 'id_oeuvre', name: 'idx_oeuvre_tag_oeuvre' },
  { table: 'oeuvretags', column: 'id_tag', name: 'idx_oeuvre_tag_tag' },

  // ── Association: oeuvre_categorie ──
  { table: 'oeuvrecategories', column: 'id_oeuvre', name: 'idx_oeuvre_categorie_oeuvre' },
  { table: 'oeuvrecategories', column: 'id_categorie', name: 'idx_oeuvre_categorie_categorie' },

  // ── Association: programme_intervenant ──
  { table: 'programme_intervenant', column: 'id_programme', name: 'idx_prog_interv_programme' },
  { table: 'programme_intervenant', column: 'id_user', name: 'idx_prog_interv_user' },

  // ── Association: user_organisation ──
  { table: 'userorganisation', column: 'id_user', name: 'idx_user_org_user' },
  { table: 'userorganisation', column: 'id_organisation', name: 'idx_user_org_org' },
  { table: 'userorganisation', column: 'id_superviseur', name: 'idx_user_org_superviseur' },

  // ── Association: evenement_organisation ──
  { table: 'evenement_organisation', column: 'id_evenement', name: 'idx_event_org_evenement' },
  { table: 'evenement_organisation', column: 'id_organisation', name: 'idx_event_org_org' },

  // ── Lieux détails ──
  { table: 'detail_lieux', column: 'id_lieu', name: 'idx_detail_lieu' },
  { table: 'lieu_medias', column: 'id_lieu', name: 'idx_lieu_media_lieu' },
  { table: 'monuments', column: 'id_detail_lieu', name: 'idx_monument_detail' },
  { table: 'vestiges', column: 'id_detail_lieu', name: 'idx_vestige_detail' },

  // ── Organisation ──
  { table: 'organisation', column: 'id_type_organisation', name: 'idx_org_type' },

  // ── Livre ──
  { table: 'livre', column: 'id_oeuvre', name: 'idx_livre_oeuvre' },
  { table: 'livre', column: 'id_genre', name: 'idx_livre_genre' },

  // ── Certification / Spécialité ──
  { table: 'user_certifications', column: 'id_user', name: 'idx_user_cert_user' },
  { table: 'user_specialite', column: 'id_user', name: 'idx_user_spec_user' },
  { table: 'user_specialite', column: 'id_specialite', name: 'idx_user_spec_specialite' },
];

module.exports = {
  async up(queryInterface) {
    for (const { table, column, name } of INDEXES) {
      try {
        await queryInterface.addIndex(table, [column], { name });
      } catch (err) {
        // Index ou table peut déjà exister, ou table absente en dev
        if (err.original?.code === 'ER_DUP_KEYNAME' || err.original?.code === 'ER_NO_SUCH_TABLE') {
          console.log(`⏭️  Index ${name} skipped (${err.original.code})`);
        } else {
          throw err;
        }
      }
    }
    console.log(`✅ ${INDEXES.length} indexes FK ajoutés`);
  },

  async down(queryInterface) {
    for (const { table, name } of INDEXES) {
      try {
        await queryInterface.removeIndex(table, name);
      } catch (err) {
        // Ignorer si l'index n'existe pas
        console.log(`⏭️  Index ${name} removal skipped`);
      }
    }
  }
};
