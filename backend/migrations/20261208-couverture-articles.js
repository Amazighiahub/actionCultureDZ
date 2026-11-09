'use strict';

/**
 * Migration : image principale des articles déjà publiés.
 * Un article dont aucune image n'est « principale » montrait sur sa carte (listes, accueil, partages) la
 * première image envoyée, souvent une ancienne image retirée du texte. Désormais l'image principale suit la
 * première image visible du contenu (services/articleBlockService.js, à chaque enregistrement). Cette
 * migration l'applique une fois aux articles existants, sans attendre qu'ils soient ré-enregistrés.
 *
 * Ne touche que les œuvres SANS image principale, et seulement une image de la même œuvre. Ne modifie qu'un
 * indicateur (media.is_Principale) : aucune donnée n'est supprimée. Rejouable (une œuvre traitée a ensuite
 * une image principale). La descente ne change rien : l'état d'avant (« aucune principale ») revenait à
 * afficher la première image envoyée, ce que l'indicateur posé ne rend pas impossible à refaire à la main.
 */
const TYPES = [
  { type: 'article', table: 'article', cle: 'id_article' },
  { type: 'article_scientifique', table: 'articlescientifique', cle: 'id_article_scientifique' },
];

module.exports = {
  async up(queryInterface) {
    const q = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements, type: queryInterface.sequelize.QueryTypes.SELECT });

    // Première image visible du contenu de chaque article (ordre le plus petit, puis bloc le plus ancien)
    const premieres = new Map(); // id_oeuvre -> id_media
    for (const { type, table, cle } of TYPES) {
      const lignes = await q(
        `SELECT p.id_oeuvre, b.id_media, b.ordre, b.id_block
           FROM article_block b
           JOIN \`${table}\` p ON p.\`${cle}\` = b.id_article
          WHERE b.article_type = ? AND b.type_block = 'image' AND b.id_media IS NOT NULL AND b.visible = 1
          ORDER BY p.id_oeuvre, b.ordre, b.id_block`, [type]);
      for (const l of lignes) if (!premieres.has(l.id_oeuvre)) premieres.set(l.id_oeuvre, l.id_media);
    }
    if (!premieres.size) return;

    // Œuvres qui ont déjà une image principale : on n'y touche pas
    const oeuvres = [...premieres.keys()];
    const dejaPrincipale = new Set((await q(
      'SELECT DISTINCT id_oeuvre FROM media WHERE is_Principale = 1 AND id_oeuvre IN (?)', [oeuvres]
    )).map((l) => l.id_oeuvre));

    // L'image doit appartenir à la même œuvre et être une image
    const candidats = oeuvres.filter((o) => !dejaPrincipale.has(o)).map((o) => premieres.get(o));
    if (!candidats.length) return;
    const valides = (await q(
      `SELECT m.id_media, m.id_oeuvre FROM media m WHERE m.id_media IN (?) AND m.type_media = 'image'`, [candidats]
    )).filter((l) => premieres.get(l.id_oeuvre) === l.id_media && !dejaPrincipale.has(l.id_oeuvre)).map((l) => l.id_media);
    if (!valides.length) return;

    await queryInterface.sequelize.query('UPDATE media SET is_Principale = 1 WHERE id_media IN (?)', { replacements: [valides] });
  },

  async down() {
    // Rien à défaire : seul un indicateur a été posé (voir l'en-tête)
  }
};
