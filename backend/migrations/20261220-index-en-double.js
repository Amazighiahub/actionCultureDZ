'use strict';

/**
 * Migration : retrait des index en double (audit V11 BDD-14).
 *
 * Chaque index retiré a ses colonnes au début d'un autre index de la même table (relevé sur la base
 * de production le 2026-11-12) : MySQL se sert de l'index plus long pour les mêmes recherches. Un index
 * en trop ralentit chaque écriture et prend de la place, sans rien accélérer.
 *
 * Prudence, index par index :
 * - retiré seulement s'il existe avec exactement les colonnes attendues (le nom peut différer d'une
 *   base à l'autre : rien n'est retiré à l'aveugle) ;
 * - et si un autre index commence encore par ces colonnes au moment du retrait ;
 * - un index dont une clé étrangère a besoin est laissé en place (MySQL le refuse : erreur attrapée).
 * Aucune donnée modifiée. Rejouable ; down recrée les index retirés, avec leurs colonnes.
 */
const EN_DOUBLE = [
  ['audit_logs', 'audit_logs_action', 'action'],
  ['commentaire', 'commentaire_id_evenement', 'id_evenement'],
  ['commentaire', 'commentaire_id_oeuvre', 'id_oeuvre'],
  ['commentaire', 'commentaire_id_user', 'id_user'],
  ['critique_evaluation', 'idx_critique_oeuvre', 'id_oeuvre'],
  ['email_verifications', 'email_verifications_id_user_type', 'id_user,type'],
  ['evenement', 'evenement_date_debut', 'date_debut'],
  ['evenement', 'evenement_id_type_evenement', 'id_type_evenement'],
  ['evenement', 'evenement_id_user', 'id_user'],
  ['evenement', 'evenement_statut', 'statut'],
  ['evenementusers', 'idx_eventuser_event_statut', 'id_evenement,statut_participation'],
  ['favoris', 'favoris_id_user', 'id_user'],
  ['lieu', 'idx_lieu_statut', 'statut'],
  ['media', 'media_id_oeuvre', 'id_oeuvre'],
  ['notification', 'notification_id_user_lu', 'id_user,lu'],
  ['oeuvre', 'idx_oeuvre_langue', 'id_langue'],
  ['oeuvre', 'oeuvre_id_type_oeuvre', 'id_type_oeuvre'],
  ['oeuvre', 'idx_oeuvre_type_statut', 'id_type_oeuvre,statut'],
  ['oeuvre', 'oeuvre_saisi_par', 'saisi_par'],
  ['oeuvre', 'oeuvre_statut', 'statut'],
  ['oeuvre_editeur', 'idx_oeuvre_editeur_oeuvre', 'id_oeuvre'],
  ['oeuvre_intervenant', 'oeuvre_intervenant_id_oeuvre', 'id_oeuvre'],
  ['oeuvre_user', 'idx_oeuvre_user_oeuvre', 'id_oeuvre'],
  ['oeuvrecategories', 'idx_oeuvre_categorie_oeuvre', 'id_oeuvre'],
  ['oeuvretags', 'idx_oeuvre_tag_oeuvre', 'id_oeuvre'],
  ['oeuvretags', 'idx_oeuvre_tag_tag', 'id_tag'],
  ['parcours_lieux', 'idx_parcours', 'id_parcours'],
  ['programme_intervenant', 'idx_prog_interv_programme', 'id_programme'],
  ['signalements', 'idx_moderation', 'statut,priorite'],
  ['signalements', 'idx_signalement_type_entite', 'type_entite'],
  ['signalements', 'idx_entite_signalee', 'type_entite,id_entite'],
  ['user', 'user_id_type_user', 'id_type_user'],
  ['user', 'user_statut', 'statut'],
  ['user_specialite', 'idx_user_spec_user', 'id_user'],
  ['userorganisation', 'idx_user_org_user', 'id_user'],
  ['vues', 'idx_entite', 'type_entite,id_entite'],
];

/** Index de la table : nom → colonnes dans l'ordre (null si la table n'existe pas) */
async function indexDe(q, table) {
  try {
    const [lignes] = await q.query(`SHOW INDEX FROM \`${table}\``);
    const parNom = new Map();
    for (const l of lignes.sort((a, b) => a.Seq_in_index - b.Seq_in_index)) {
      if (!parNom.has(l.Key_name)) parNom.set(l.Key_name, []);
      parNom.get(l.Key_name).push(l.Column_name);
    }
    return parNom;
  } catch {
    return null;
  }
}

module.exports = {
  async up(queryInterface) {
    const q = queryInterface.sequelize;
    for (const [table, nom, colonnes] of EN_DOUBLE) {
      const index = await indexDe(q, table);
      if (!index || !index.has(nom)) continue;
      const cols = colonnes.split(',');
      if (index.get(nom).join(',') !== colonnes) continue;
      const couvert = [...index].some(([autre, c]) => autre !== nom && c.length > cols.length && cols.every((x, i) => c[i] === x));
      if (!couvert) continue;
      try {
        await q.query(`ALTER TABLE \`${table}\` DROP INDEX \`${nom}\``);
      } catch (e) {
        // Index nécessaire à une clé étrangère : gardé
        if (!/foreign key/i.test(e.message)) throw e;
      }
    }
  },

  async down(queryInterface) {
    const q = queryInterface.sequelize;
    for (const [table, nom, colonnes] of [...EN_DOUBLE].reverse()) {
      const index = await indexDe(q, table);
      if (!index || index.has(nom)) continue;
      const cols = colonnes.split(',').map((c) => `\`${c}\``).join(', ');
      await q.query(`ALTER TABLE \`${table}\` ADD INDEX \`${nom}\` (${cols})`);
    }
  }
};
