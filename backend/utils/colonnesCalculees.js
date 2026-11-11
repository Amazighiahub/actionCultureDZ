/**
 * Colonnes calculées par MySQL (migrations 20261216-recherche-noms, 20261217-liste-evenements) : le code
 * s'en sert quand elles existent, sinon il garde l'ancien calcul (base créée depuis les modèles pour les
 * essais automatiques, ou migration pas encore passée). Vérifié une fois par table, puis gardé en mémoire.
 * Audit V11 BDD-3 et BDD-6.
 */
const tables = new Map();

/** @returns {Promise<boolean>} la colonne existe-t-elle dans la table du modèle ? */
async function aColonne(model, colonne) {
  if (typeof model?.sequelize?.getQueryInterface !== 'function') return false;
  const table = typeof model.getTableName === 'function' ? model.getTableName() : model.tableName;
  const nom = typeof table === 'object' ? table.tableName : table;
  if (!tables.has(nom)) {
    tables.set(nom, model.sequelize.getQueryInterface().describeTable(nom)
      .then((desc) => new Set(Object.keys(desc)))
      // Lecture impossible : ancien calcul, et nouvel essai au prochain appel
      .catch(() => { tables.delete(nom); return new Set(); }));
  }
  return (await tables.get(nom)).has(colonne);
}

/** Motif LIKE sûr : % et _ saisis par la personne cherchés tels quels */
const motifLike = (sequelize, texte) => sequelize.escape(`%${String(texte).trim().replace(/[\\%_]/g, '\\$&')}%`);

module.exports = { aColonne, motifLike, _viderPourTests: () => tables.clear() };
