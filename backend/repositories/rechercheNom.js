/**
 * Recherche d'une personne par son nom, dans toutes les langues, sans accents ni majuscules.
 * Chaque mot doit se retrouver dans le prénom ou le nom : « amel charrad » comme « charrad amel ».
 * JSON_EXTRACT('$.*') ne garde que les valeurs : chercher « fr » ne trouve pas la clé de langue.
 */
const champ = (colonne) => `CAST(JSON_EXTRACT(${colonne}, '$.*') AS CHAR) COLLATE utf8mb4_0900_ai_ci`;

function conditionNom(sequelize, texte, { nom, prenom, autres = [] }) {
  const mots = String(texte || '').trim().split(/\s+/).filter(Boolean).slice(0, 5);
  if (!mots.length) return null;
  return mots.map((mot) => {
    const motif = sequelize.escape(`%${mot.replace(/[\\%_]/g, '\\$&')}%`);
    // autres : expressions SQL fixes (jamais saisies par le visiteur), par exemple les métiers
    const plus = autres.map((expr) => ` OR ${expr} LIKE ${motif}`).join('');
    return `(${champ(nom)} LIKE ${motif} OR ${champ(prenom)} LIKE ${motif}${plus})`;
  }).join(' AND ');
}

/** Œuvre dont la personne recherchée est l'auteur : celui qui l'a publiée, un contributeur ou un intervenant */
function conditionAuteurOeuvre(sequelize, texte, alias = 'Oeuvre') {
  const compte = conditionNom(sequelize, texte, { nom: 'u.`nom`', prenom: 'u.`prenom`' });
  const intervenant = conditionNom(sequelize, texte, { nom: 'i.`nom`', prenom: 'i.`prenom`' });
  if (!compte) return null;
  return `(\`${alias}\`.\`saisi_par\` IN (SELECT u.\`id_user\` FROM \`user\` u WHERE ${compte})`
    + ` OR \`${alias}\`.\`id_oeuvre\` IN (SELECT ou.\`id_oeuvre\` FROM \`oeuvre_user\` ou JOIN \`user\` u ON u.\`id_user\` = ou.\`id_user\` WHERE ${compte})`
    + ` OR \`${alias}\`.\`id_oeuvre\` IN (SELECT oi.\`id_oeuvre\` FROM \`oeuvre_intervenant\` oi JOIN \`intervenant\` i ON i.\`id_intervenant\` = oi.\`id_intervenant\` WHERE ${intervenant}))`;
}

module.exports = { conditionNom, conditionAuteurOeuvre };
