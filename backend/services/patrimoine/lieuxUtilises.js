/**
 * Lieux déjà utilisés parmi une liste (2026-11-19) : cités par une autre table (clés étrangères lues dans la base,
 * donc toute table ajoutée plus tard compte aussi), mis en favori ou signalés, ou parents d'un lieu hors de la liste.
 * Sert avant de supprimer ou d'écarter des lieux en masse (annulation de l'import, nettoyage des doublons) :
 * une suppression en cascade emporterait ce qui a été ajouté dessus (services, photos, parcours…).
 */

/** Tables liées à un lieu qui ne le rendent pas « utilisé » : sa fiche, la liste de l'import */
const SANS_IMPORTANCE = new Set(['detail_lieux', 'import_lieux_osm']);

/**
 * @param {import('sequelize').Sequelize} sequelize
 * @param {number[]} ids
 * @param {object} [transaction]
 * @returns {Promise<number[]>} identifiants utilisés, triés
 */
async function lieuxUtilises(sequelize, ids, transaction) {
  const liste = [...new Set((ids || []).map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  if (!liste.length) return [];
  const [refs] = await sequelize.query(`SELECT TABLE_NAME AS t, COLUMN_NAME AS c FROM information_schema.KEY_COLUMN_USAGE
    WHERE REFERENCED_TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME = 'lieu'`, { transaction });
  const requetes = refs.filter((r) => !SANS_IMPORTANCE.has(r.t)).map((r) => (r.t === 'lieu'
    ? `SELECT l.\`${r.c}\` AS id FROM lieu l WHERE l.\`${r.c}\` IN (:liste) AND l.id_lieu NOT IN (:liste)`
    : `SELECT x.\`${r.c}\` AS id FROM \`${r.t}\` x WHERE x.\`${r.c}\` IN (:liste)`));
  requetes.push("SELECT f.id_entite AS id FROM favoris f WHERE f.type_entite = 'lieu' AND f.id_entite IN (:liste)");
  requetes.push("SELECT s.id_entite AS id FROM signalements s WHERE s.type_entite = 'lieu' AND s.id_entite IN (:liste)");
  const [lignes] = await sequelize.query(requetes.join(' UNION '), { replacements: { liste }, transaction });
  return [...new Set(lignes.map((l) => Number(l.id)))].sort((a, b) => a - b);
}

module.exports = { lieuxUtilises };
