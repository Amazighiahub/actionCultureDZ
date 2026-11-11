'use strict';

/**
 * Migration : liste publique des événements (audit V11 BDD-6).
 *
 * Chaque page de la liste relisait et triait tous les événements depuis l'ouverture du site (tri sur
 * une expression), et additionnait pour chacun, en JSON, le nombre de personnes de chaque inscription.
 * - evenement.fin_effective : fin réelle, même calcul que helpers/finEvenement.js finSql (jour sans heure =
 *   toute la journée, heure d'Algérie ; sans date de fin = soir du premier jour), index
 *   (statut, fin_effective, date_debut) : les événements à venir se lisent dans l'ordre de l'index ;
 * - evenementusers.nb_personnes : personnes d'une inscription (1 par défaut), index
 *   (id_evenement, statut_participation, nb_personnes) : les places prises se comptent dans l'index.
 *   Le REGEXP évite un échec d'écriture en mode strict si la valeur n'est pas un nombre.
 *
 * Aucune donnée n'est modifiée. Rejouable.
 */
const FIN = `(CASE WHEN date_fin IS NOT NULL AND TIME(date_fin) <> '00:00:00' THEN date_fin
  ELSE TIMESTAMP(DATE(COALESCE(date_fin, date_debut) + INTERVAL 1 HOUR)) + INTERVAL 23 HOUR END)`;
const NB = `JSON_UNQUOTE(JSON_EXTRACT(reponses_inscription, '$.nombre_personnes'))`;
const PERSONNES = `(CASE WHEN ${NB} REGEXP '^[0-9]{1,4}$' THEN GREATEST(1, CAST(${NB} AS UNSIGNED)) ELSE 1 END)`;

const COLONNES = [
  ['evenement', 'fin_effective', 'DATETIME', FIN],
  ['evenementusers', 'nb_personnes', 'INT UNSIGNED', PERSONNES],
];
const INDEX = [
  ['evenement', 'idx_evenement_statut_fin_debut', '(statut, fin_effective, date_debut)'],
  ['evenementusers', 'idx_evenementusers_places', '(id_evenement, statut_participation, nb_personnes)'],
];

const aIndex = async (q, table, nom) => (await q.query(`SHOW INDEX FROM \`${table}\` WHERE Key_name = ?`, { replacements: [nom] }))[0].length > 0;

module.exports = {
  async up(queryInterface) {
    const q = queryInterface.sequelize;
    for (const [table, colonne, type, expression] of COLONNES) {
      if ((await queryInterface.describeTable(table))[colonne]) continue;
      await q.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${colonne}\` ${type} GENERATED ALWAYS AS (${expression}) STORED`);
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
