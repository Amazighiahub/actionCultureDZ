'use strict';

/**
 * Migration : mots-clés en double (audit V7 base de données N2).
 * La recherche d'un mot-clé était sensible à la casse : « Artisanat » n'était jamais retrouvé et il était
 * recréé à chaque œuvre ou événement (63 mots-clés en local, dont 30 doublons).
 *
 * 1. Les anciens mots-clés enregistrés en texte simple ("oasis") passent au format par langue ({"fr": "oasis"}),
 *    sans changer leur texte.
 * 2. Les doublons (même nom, sans tenir compte des majuscules ni des accents) sont fusionnés sur le plus
 *    ancien : les œuvres et événements qui portaient un doublon portent le mot-clé gardé (un lien en double
 *    sur la même œuvre n'est pas recréé), les traductions manquantes du mot-clé gardé sont complétées par
 *    celles des doublons, puis les doublons sont supprimés. Aucune œuvre ni aucun événement ne perd de mot-clé.
 * 3. Colonne `cle` (nom en minuscules) avec index unique : un mot-clé ne peut plus exister deux fois.
 *
 * La descente retire la colonne et l'index ; la fusion n'est pas défaite (sauvegarde faite avant chaque
 * déploiement). Rejouable.
 */
const LANGUES = ['fr', 'ar', 'en', 'tz-ltn', 'tz-tfng'];
const LIENS = [['oeuvretags', 'id_oeuvre'], ['evenementtags', 'id_evenement']];

// Nom de référence du mot-clé : première langue remplie, en minuscules, sans espaces autour
const EXPRESSION_CLE = `LOWER(TRIM(COALESCE(
  NULLIF(JSON_UNQUOTE(JSON_EXTRACT(nom, '$.fr')), ''),
  NULLIF(JSON_UNQUOTE(JSON_EXTRACT(nom, '$.ar')), ''),
  NULLIF(JSON_UNQUOTE(JSON_EXTRACT(nom, '$.en')), ''),
  NULLIF(JSON_UNQUOTE(JSON_EXTRACT(nom, '$."tz-ltn"')), ''),
  NULLIF(JSON_UNQUOTE(JSON_EXTRACT(nom, '$."tz-tfng"')), ''))))`;

const vide = (v) => typeof v !== 'string' || !v.trim();

module.exports = {
  async up(queryInterface) {
    const q = queryInterface.sequelize;
    const colonnes = await queryInterface.describeTable('tagmotcle');

    await q.transaction(async (transaction) => {
      // 1. Ancien format texte simple → format par langue
      await q.query(`UPDATE tagmotcle SET nom = JSON_OBJECT('fr', JSON_UNQUOTE(nom)) WHERE JSON_TYPE(nom) = 'STRING'`, { transaction });

      // 2. Groupes de doublons (comparaison sans casse ni accents, comme l'index unique)
      const [groupes] = await q.query(
        `SELECT GROUP_CONCAT(id_tag ORDER BY id_tag) AS ids FROM tagmotcle
         WHERE ${EXPRESSION_CLE} IS NOT NULL
         GROUP BY CAST(${EXPRESSION_CLE} AS CHAR(191)) COLLATE utf8mb4_unicode_ci
         HAVING COUNT(*) > 1`, { transaction });

      for (const { ids } of groupes) {
        const [garde, ...doublons] = String(ids).split(',').map(Number);
        const [lignes] = await q.query('SELECT id_tag, nom FROM tagmotcle WHERE id_tag IN (:ids) ORDER BY id_tag',
          { replacements: { ids: [garde, ...doublons] }, transaction });
        const lire = (n) => (typeof n === 'string' ? JSON.parse(n) : n) || {};
        const nom = { ...lire(lignes[0].nom) };
        for (const ligne of lignes.slice(1)) {
          const autre = lire(ligne.nom);
          for (const l of LANGUES) if (vide(nom[l]) && !vide(autre[l])) nom[l] = autre[l];
        }
        await q.query('UPDATE tagmotcle SET nom = :nom WHERE id_tag = :garde',
          { replacements: { nom: JSON.stringify(nom), garde }, transaction });

        for (const doublon of doublons) {
          for (const [table, entite] of LIENS) {
            // Lien déjà présent vers le mot-clé gardé : le lien vers le doublon est en trop
            await q.query(`DELETE t FROM \`${table}\` t JOIN \`${table}\` g ON g.\`${entite}\` = t.\`${entite}\` AND g.id_tag = :garde
              WHERE t.id_tag = :doublon`, { replacements: { garde, doublon }, transaction });
            await q.query(`UPDATE \`${table}\` SET id_tag = :garde WHERE id_tag = :doublon`,
              { replacements: { garde, doublon }, transaction });
          }
        }
        await q.query('DELETE FROM tagmotcle WHERE id_tag IN (:doublons)', { replacements: { doublons }, transaction });
      }
    });

    // 3. Clé unique (hors transaction : un ALTER TABLE valide de lui-même)
    if (!colonnes.cle) {
      await q.query(`ALTER TABLE tagmotcle ADD COLUMN cle VARCHAR(191) COLLATE utf8mb4_unicode_ci
        GENERATED ALWAYS AS (LEFT(${EXPRESSION_CLE}, 191)) STORED`);
    }
    const [index] = await q.query("SHOW INDEX FROM tagmotcle WHERE Key_name = 'uq_tagmotcle_cle'");
    if (!index.length) await q.query('ALTER TABLE tagmotcle ADD UNIQUE INDEX uq_tagmotcle_cle (cle)');
  },

  async down(queryInterface) {
    const q = queryInterface.sequelize;
    const [index] = await q.query("SHOW INDEX FROM tagmotcle WHERE Key_name = 'uq_tagmotcle_cle'");
    if (index.length) await q.query('ALTER TABLE tagmotcle DROP INDEX uq_tagmotcle_cle');
    const colonnes = await queryInterface.describeTable('tagmotcle');
    if (colonnes.cle) await q.query('ALTER TABLE tagmotcle DROP COLUMN cle');
  }
};
