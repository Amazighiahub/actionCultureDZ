'use strict';

/**
 * Migration : index pour les listes publiques et les recherches courantes (audit V7 base de données :
 * N4, N6, N8, N19, N20, N30). Un index ne modifie aucune donnée ; il évite de relire toute la table
 * et de trier en mémoire à chaque page (important sous forte affluence).
 * Un index n'est créé que si toutes ses colonnes existent et qu'aucun index identique n'existe. Rejouable.
 */
const INDEX = [
  // Liste du patrimoine : statut publié, sites (pas les points de visite), du plus récent au plus ancien
  ['lieu', 'idx_lieu_public_date', ['statut', 'id_lieu_parent', 'createdAt']],
  ['lieu', 'idx_lieu_public_type_date', ['statut', 'id_lieu_parent', 'typePatrimoine', 'createdAt']],
  // Liste des événements : statut IN (…) empêche (statut, date_debut) de servir au tri par date
  ['evenement', 'idx_evenement_debut_statut', ['date_debut', 'statut']],
  // Sous-requête « hors plats » de chaque liste d'œuvres
  ['lieu_oeuvre', 'idx_lieu_oeuvre_section', ['section_patrimoine', 'id_oeuvre']],
  // Avis d'un service, triés par date
  ['commentaire', 'idx_commentaire_service_statut_date', ['id_service', 'statut', 'date_creation']],
  // Anti double-envoi d'une œuvre (même auteur, même type, dernière minute)
  ['oeuvre', 'idx_oeuvre_saisi_type_creation', ['saisi_par', 'id_type_oeuvre', 'date_creation']],
  // Annuaire des organisations publiées
  ['organisation', 'idx_organisation_statut', ['statut', 'id_organisation']],
];

async function colonnesIndexees(q, table) {
  const [lignes] = await q.query(
    `SELECT INDEX_NAME AS nom, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols
     FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? GROUP BY INDEX_NAME`,
    { replacements: [table] });
  return lignes;
}

module.exports = {
  async up(queryInterface) {
    const q = queryInterface.sequelize;
    for (const [table, nom, colonnes] of INDEX) {
      const desc = await queryInterface.describeTable(table).catch(() => null);
      if (!desc || colonnes.some((c) => !desc[c])) continue;
      const existants = await colonnesIndexees(q, table);
      if (existants.some((i) => i.nom === nom || i.cols === colonnes.join(','))) continue;
      await queryInterface.addIndex(table, colonnes, { name: nom });
    }
  },

  async down(queryInterface) {
    const q = queryInterface.sequelize;
    for (const [table, nom] of INDEX) {
      const existants = await colonnesIndexees(q, table).catch(() => []);
      if (!existants.some((i) => i.nom === nom)) continue;
      try {
        await queryInterface.removeIndex(table, nom);
      } catch (error) {
        // MySQL a pu prendre ce nouvel index pour une clé étrangère : il reste (sans effet sur les données)
        if (!/needed in a foreign key constraint/i.test(error.message)) throw error;
      }
    }
  }
};
