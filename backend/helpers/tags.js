/**
 * Mots-clés (table tagmotcle), partagés par les œuvres et les événements.
 */
const { Op, Sequelize } = require('sequelize');

const LANGUES = ['fr', 'ar', 'en', 'tz-ltn', 'tz-tfng'];

/**
 * Liste de mots-clés envoyée par un formulaire : tableau, ou texte JSON (FormData).
 * @returns {Array|null} null si le champ est absent (ne rien changer)
 */
function lireTags(valeur) {
  if (valeur === undefined || valeur === null) return null;
  if (Array.isArray(valeur)) return valeur;
  if (typeof valeur === 'string') {
    const t = valeur.trim();
    if (!t) return [];
    try {
      const v = JSON.parse(t);
      return Array.isArray(v) ? v : [];
    } catch {
      return t.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
}

/**
 * Résout des tags envoyés sous forme d'IDs ou de noms ; crée les noms inconnus.
 * Un nom est retrouvé par la clé unique (sans casse ni accents), sinon dans n'importe quelle langue du
 * mot-clé (« فخار » → « poterie »). Création protégée par l'index unique (pas de doublon).
 * @returns {Promise<number[]|null>} null si `tags` est null/undefined
 */
async function resolveTagIds(models, tags, transaction) {
  if (tags == null) return null;
  if (!Array.isArray(tags) || tags.length === 0 || !models?.TagMotCle) return [];

  const resolvedIds = [];
  const stringTags = [];

  // Séparer IDs numériques et noms de tags
  for (const tag of tags) {
    const numericTagId = Number(tag);
    if (Number.isInteger(numericTagId) && numericTagId > 0) {
      resolvedIds.push(numericTagId);
    } else if (typeof tag === 'string' && tag.trim()) {
      stringTags.push(tag.trim());
    }
  }

  if (stringTags.length === 0) return [...new Set(resolvedIds)];

  // Colonne `cle` (nom en minuscules, index unique, migration 20261119) : recherche par l'index.
  // La clé d'un mot-clé lu est recalculée depuis son nom, comme le fait la base (première langue remplie).
  const cle = (n) => n.trim().toLowerCase().slice(0, 191);
  const cleDuNom = (nom) => {
    const objet = typeof nom === 'string' ? { fr: nom } : (nom || {});
    const premier = LANGUES.map((l) => objet[l]).find((v) => typeof v === 'string' && v.trim());
    return premier ? cle(premier) : null;
  };
  const parCle = new Map();
  // Comparer comme la base, sans majuscules ni accents (« Bejaia » = « Béjaïa »)
  const memeCle = (n) => [...parCle.keys()].find((k) => k.localeCompare(cle(n), 'fr', { sensitivity: 'base' }) === 0);
  const trouver = async (noms) => {
    const lignes = await models.TagMotCle.findAll({
      where: Sequelize.where(Sequelize.col('cle'), { [Op.in]: noms.map(cle) }),
      attributes: ['id_tag', 'nom'],
      transaction
    });
    for (const t of lignes) {
      const k = cleDuNom(t.nom);
      if (k) parCle.set(k, t.id_tag);
    }
    // Noms non trouvés : recherche exacte dans toutes les langues du mot-clé (« فخار » → « poterie »)
    for (const n of noms) {
      if (memeCle(n)) continue;
      const autre = await models.TagMotCle.findOne({
        where: Sequelize.where(Sequelize.fn('JSON_SEARCH', Sequelize.fn('LOWER', Sequelize.col('nom')), 'one', cle(n)), { [Op.ne]: null }),
        attributes: ['id_tag'],
        transaction
      });
      if (autre) parCle.set(cle(n), autre.id_tag);
    }
  };
  await trouver(stringTags);

  for (const name of stringTags) {
    if (memeCle(name)) continue;
    try {
      const cree = await models.TagMotCle.create({ nom: { fr: name } }, { transaction });
      parCle.set(cle(name), cree.id_tag);
    } catch (error) {
      // Créé entre-temps (autre requête) : l'index unique refuse le doublon, on reprend le mot-clé existant
      if (error.name !== 'SequelizeUniqueConstraintError') throw error;
      await trouver([name]);
    }
  }

  for (const name of stringTags) {
    const k = memeCle(name);
    if (k) resolvedIds.push(parCle.get(k));
  }

  return [...new Set(resolvedIds)];
}

module.exports = { lireTags, resolveTagIds };
