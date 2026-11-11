/**
 * Recherche d'une personne par son nom, dans toutes les langues, sans accents ni majuscules.
 * Chaque mot doit se retrouver dans le prénom ou le nom : « amel charrad » comme « charrad amel ».
 * JSON_EXTRACT('$.*') ne garde que les valeurs : chercher « fr » ne trouve pas la clé de langue.
 */
const { aColonne } = require('../utils/colonnesCalculees');

const champ = (colonne) => `CAST(JSON_EXTRACT(${colonne}, '$.*') AS CHAR) COLLATE utf8mb4_0900_ai_ci`;

/**
 * Colonnes nom_recherche (prénom et nom dans les 5 langues, sans accents ni majuscules, migration
 * 20261216-recherche-noms) : disponibles ? Sinon, extraction JSON à chaque ligne (audit V11 BDD-3).
 */
async function colonnesNom(models) {
  return { user: await aColonne(models?.User, 'nom_recherche'), intervenant: await aColonne(models?.Intervenant, 'nom_recherche') };
}

/**
 * @param {object} options nom, prenom : colonnes JSON ; recherche : colonne nom_recherche à utiliser à
 *   leur place quand elle existe ; autres : expressions SQL fixes en plus
 */
function conditionNom(sequelize, texte, { nom, prenom, autres = [], recherche = null }) {
  const mots = String(texte || '').trim().split(/\s+/).filter(Boolean).slice(0, 5);
  if (!mots.length) return null;
  return mots.map((mot) => {
    const motif = sequelize.escape(`%${mot.replace(/[\\%_]/g, '\\$&')}%`);
    // autres : expressions SQL fixes (jamais saisies par le visiteur), par exemple les métiers
    const plus = autres.map((expr) => ` OR ${expr} LIKE ${motif}`).join('');
    const base = recherche ? `${recherche} LIKE ${motif}` : `${champ(nom)} LIKE ${motif} OR ${champ(prenom)} LIKE ${motif}`;
    return `(${base}${plus})`;
  }).join(' AND ');
}

/** Œuvre dont la personne recherchée est l'auteur : celui qui l'a publiée, un contributeur ou un intervenant */
function conditionAuteurOeuvre(sequelize, texte, alias = 'Oeuvre', colonnes = {}) {
  const compte = conditionNom(sequelize, texte, { nom: 'u.`nom`', prenom: 'u.`prenom`', recherche: colonnes.user ? 'u.`nom_recherche`' : null });
  const intervenant = conditionNom(sequelize, texte, { nom: 'i.`nom`', prenom: 'i.`prenom`', recherche: colonnes.intervenant ? 'i.`nom_recherche`' : null });
  if (!compte) return null;
  return `(\`${alias}\`.\`saisi_par\` IN (SELECT u.\`id_user\` FROM \`user\` u WHERE ${compte})`
    + ` OR \`${alias}\`.\`id_oeuvre\` IN (SELECT ou.\`id_oeuvre\` FROM \`oeuvre_user\` ou JOIN \`user\` u ON u.\`id_user\` = ou.\`id_user\` WHERE ${compte})`
    + ` OR \`${alias}\`.\`id_oeuvre\` IN (SELECT oi.\`id_oeuvre\` FROM \`oeuvre_intervenant\` oi JOIN \`intervenant\` i ON i.\`id_intervenant\` = oi.\`id_intervenant\` WHERE ${intervenant}))`;
}

module.exports = { conditionNom, conditionAuteurOeuvre, colonnesNom };
