'use strict';

/**
 * Migration : index de tri des listes d'œuvres (audit V11 BDD-16).
 *
 * « Œuvres populaires » (statut publié, tri par vues puis date), « œuvres similaires » (même type,
 * tri par vues) et « à lire » du patrimoine (livres publiés, tri par date) triaient toutes les lignes
 * trouvées à chaque visite (EXPLAIN : Using filesort). Avec ces index, MySQL lit déjà dans l'ordre.
 *
 * Ajout d'index seulement : aucune donnée modifiée. Rejouable ; down retire les trois index.
 */
const INDEX = [
  ['idx_oeuvre_statut_vues', '(statut, nb_vues, date_creation)'],
  ['idx_oeuvre_type_statut_vues', '(id_type_oeuvre, statut, nb_vues)'],
  ['idx_oeuvre_type_statut_date', '(id_type_oeuvre, statut, date_creation)'],
];

const aIndex = async (q, nom) => (await q.query('SHOW INDEX FROM `oeuvre` WHERE Key_name = ?', { replacements: [nom] }))[0].length > 0;

module.exports = {
  async up(queryInterface) {
    const q = queryInterface.sequelize;
    for (const [nom, colonnes] of INDEX) {
      if (!(await aIndex(q, nom))) await q.query(`ALTER TABLE \`oeuvre\` ADD INDEX \`${nom}\` ${colonnes}`);
    }
  },

  async down(queryInterface) {
    const q = queryInterface.sequelize;
    for (const [nom] of [...INDEX].reverse()) {
      if (await aIndex(q, nom)) await q.query(`ALTER TABLE \`oeuvre\` DROP INDEX \`${nom}\``);
    }
  }
};
