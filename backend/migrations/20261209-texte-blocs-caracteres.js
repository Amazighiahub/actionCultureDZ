'use strict';

/**
 * Migration : réparer « & », « < » et « > » dans le texte des blocs d'articles et de pages de lieux.
 * Jusqu'ici, le nettoyage des blocs de texte (utils/sanitizeArticle.js) les enregistrait sous la forme
 * « &amp; », « &lt; », « &gt; », que le site affichait tels quels (« Arts &amp; Culture »). Le nettoyage
 * garde désormais ces caractères ; cette migration répare une fois les textes déjà enregistrés.
 *
 * Seulement les blocs de texte (text, heading, citation, list, separator) dont le texte contient ces
 * formes. Aucune ligne supprimée. Rejouable (un texte réparé ne contient plus ces formes, sauf si un
 * auteur les a écrites lui-même après la réparation). La descente ne change rien.
 */
const TYPES = ['text', 'heading', 'citation', 'list', 'separator'];

// &lt; et &gt; d'abord, &amp; en dernier : « &amp;lt; » redevient bien « &lt; » écrit par l'auteur
const reparer = (t) => t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

module.exports = {
  async up(queryInterface) {
    const s = queryInterface.sequelize;
    const lignes = await s.query(
      `SELECT id_block, contenu FROM article_block
        WHERE type_block IN (?) AND contenu IS NOT NULL
          AND (contenu LIKE '%&amp;%' OR contenu LIKE '%&lt;%' OR contenu LIKE '%&gt;%')`,
      { replacements: [TYPES], type: s.QueryTypes.SELECT }
    );
    for (const { id_block: id, contenu } of lignes) {
      const propre = reparer(String(contenu));
      if (propre !== contenu) {
        await s.query('UPDATE article_block SET contenu = ? WHERE id_block = ?', { replacements: [propre, id] });
      }
    }
  },

  async down() {
    // Rien à défaire : les textes réparés sont ceux que les auteurs avaient écrits
  },

  _reparer: reparer,
};
