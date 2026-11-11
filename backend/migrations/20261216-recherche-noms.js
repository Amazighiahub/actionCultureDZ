'use strict';

/**
 * Migration : recherche et tri des noms (audit V11 BDD-3), sur le modèle de 20261120-recherche-oeuvres.
 *
 * Les recherches publiques (lieux, intervenants, professionnels, événements) extrayaient les noms dans
 * 5 langues pour chaque ligne (5 à 10 JSON_EXTRACT par ligne, deux fois : total puis page). Colonnes
 * calculées par MySQL à l'écriture, comparées sans accents ni majuscules (« ait smail » trouve « Aït Smaïl ») :
 * - lieu.texte_recherche : nom et adresse ; lieu.nom_tri : nom (première langue remplie), index (statut, nom_tri)
 *   (le tri se faisait sur le JSON brut, dans un ordre faux : accents en fin de liste) ;
 * - intervenant.nom_recherche : prénom et nom ; intervenant.nom_tri : nom ;
 * - user.nom_recherche : prénom et nom ;
 * - evenement.texte_recherche : nom et description.
 *
 * Aucune donnée n'est modifiée. Rejouable. Sur `user` et `lieu`, MySQL reconstruit la table (colonne
 * STORED) : quelques secondes avec les volumes actuels ; la mise en ligne fait une sauvegarde avant.
 */
const LANGUES = ['fr', 'ar', 'en', '"tz-ltn"', '"tz-tfng"'];
const extraire = (champ) => LANGUES.map((l) => `JSON_UNQUOTE(JSON_EXTRACT(\`${champ}\`, '$.${l}'))`);
const texte = (...champs) => `CONCAT_WS(' ', ${champs.flatMap(extraire).join(', ')})`;
const tri = (champ) => `LEFT(TRIM(COALESCE(${extraire(champ).map((e) => `NULLIF(${e}, '')`).join(', ')})), 191)`;

const COLONNES = [
  ['lieu', 'texte_recherche', 'TEXT', texte('nom', 'adresse')],
  ['lieu', 'nom_tri', 'VARCHAR(191)', tri('nom')],
  ['intervenant', 'nom_recherche', 'TEXT', texte('prenom', 'nom')],
  ['intervenant', 'nom_tri', 'VARCHAR(191)', tri('nom')],
  ['user', 'nom_recherche', 'TEXT', texte('prenom', 'nom')],
  ['evenement', 'texte_recherche', 'MEDIUMTEXT', texte('nom_evenement', 'description')],
];
const INDEX = [
  ['lieu', 'idx_lieu_statut_nom_tri', '(statut, nom_tri)'],
  ['intervenant', 'idx_intervenant_nom_tri', '(nom_tri)'],
];

const aIndex = async (q, table, nom) => (await q.query(`SHOW INDEX FROM \`${table}\` WHERE Key_name = ?`, { replacements: [nom] }))[0].length > 0;

module.exports = {
  async up(queryInterface) {
    const q = queryInterface.sequelize;
    for (const [table, colonne, type, expression] of COLONNES) {
      if ((await queryInterface.describeTable(table))[colonne]) continue;
      await q.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${colonne}\` ${type}
        CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci GENERATED ALWAYS AS (${expression}) STORED`);
    }
    for (const [table, nom, colonnes] of INDEX) {
      if (!(await aIndex(q, table, nom))) await q.query(`ALTER TABLE \`${table}\` ADD INDEX \`${nom}\` ${colonnes}`);
    }
  },

  async down(queryInterface) {
    const q = queryInterface.sequelize;
    for (const [table, nom] of [...INDEX].reverse()) {
      if (await aIndex(q, table, nom)) await q.query(`ALTER TABLE \`${table}\` DROP INDEX \`${nom}\``);
    }
    for (const [table, colonne] of [...COLONNES].reverse()) {
      if ((await queryInterface.describeTable(table))[colonne]) await q.query(`ALTER TABLE \`${table}\` DROP COLUMN \`${colonne}\``);
    }
  }
};
