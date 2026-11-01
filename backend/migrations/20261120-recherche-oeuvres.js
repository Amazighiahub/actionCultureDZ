'use strict';

/**
 * Migration : recherche et tri des œuvres (audit V7 base de données N1).
 * La recherche publique extrayait, pour chaque œuvre, le titre et la description dans 5 langues
 * (10 JSON_EXTRACT par ligne, deux fois : total puis page). Deux colonnes calculées par MySQL à l'écriture :
 * - texte_recherche : titres et descriptions dans les 5 langues, comparés sans accents ni majuscules
 *   (mêmes résultats qu'avant, sans extraction JSON à chaque recherche) ;
 * - titre_tri : titre (première langue remplie) pour trier par titre — le tri se faisait sur le JSON brut,
 *   dans un ordre faux — avec un index (statut, titre_tri).
 * Aucune donnée existante n'est modifiée. Rejouable.
 */
const langues = ['fr', 'ar', 'en', '"tz-ltn"', '"tz-tfng"'];
const extraire = (champ) => langues.map((l) => `JSON_UNQUOTE(JSON_EXTRACT(\`${champ}\`, '$.${l}'))`);

const TEXTE = `CONCAT_WS(' ', ${[...extraire('titre'), ...extraire('description')].join(', ')})`;
const TITRE = `LEFT(TRIM(COALESCE(${extraire('titre').map((e) => `NULLIF(${e}, '')`).join(', ')})), 191)`;

module.exports = {
  async up(queryInterface) {
    const q = queryInterface.sequelize;
    const colonnes = await queryInterface.describeTable('oeuvre');
    if (!colonnes.texte_recherche) {
      await q.query(`ALTER TABLE oeuvre ADD COLUMN texte_recherche MEDIUMTEXT
        CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci GENERATED ALWAYS AS (${TEXTE}) STORED`);
    }
    if (!colonnes.titre_tri) {
      await q.query(`ALTER TABLE oeuvre ADD COLUMN titre_tri VARCHAR(191)
        CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci GENERATED ALWAYS AS (${TITRE}) STORED`);
    }
    const [index] = await q.query("SHOW INDEX FROM oeuvre WHERE Key_name = 'idx_oeuvre_statut_titre_tri'");
    if (!index.length) await q.query('ALTER TABLE oeuvre ADD INDEX idx_oeuvre_statut_titre_tri (statut, titre_tri)');
  },

  async down(queryInterface) {
    const q = queryInterface.sequelize;
    const [index] = await q.query("SHOW INDEX FROM oeuvre WHERE Key_name = 'idx_oeuvre_statut_titre_tri'");
    if (index.length) await q.query('ALTER TABLE oeuvre DROP INDEX idx_oeuvre_statut_titre_tri');
    const colonnes = await queryInterface.describeTable('oeuvre');
    if (colonnes.titre_tri) await q.query('ALTER TABLE oeuvre DROP COLUMN titre_tri');
    if (colonnes.texte_recherche) await q.query('ALTER TABLE oeuvre DROP COLUMN texte_recherche');
  }
};
