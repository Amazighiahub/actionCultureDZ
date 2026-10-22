/**
 * Mots-clés (table tagmotcle), partagés par les œuvres et les événements.
 */
const { Op } = require('sequelize');

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
 * Un nom est retrouvé dans n'importe quelle langue du mot-clé (« Poterie », « فخار »…).
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

  // Chercher uniquement les tags demandés (pas un full scan)
  const existing = await models.TagMotCle.findAll({
    where: {
      [Op.or]: stringTags.map(name => ({
        nom: { [Op.like]: `%"${name.toLowerCase()}"%` }
      }))
    },
    transaction
  });

  const existingNames = new Map();
  for (const t of existing) {
    const names = Object.values(t.nom || {})
      .filter(v => typeof v === 'string')
      .map(v => v.trim().toLowerCase());
    for (const n of names) existingNames.set(n, t.id_tag);
  }

  const toCreate = stringTags.filter(n => !existingNames.has(n.toLowerCase()));

  if (toCreate.length > 0) {
    const created = await models.TagMotCle.bulkCreate(
      toCreate.map(n => ({ nom: { fr: n } })),
      { ignoreDuplicates: true, transaction, returning: true }
    );
    for (const t of created) {
      const frName = t.nom?.fr?.trim()?.toLowerCase();
      if (frName) existingNames.set(frName, t.id_tag);
    }
  }

  for (const name of stringTags) {
    const id = existingNames.get(name.toLowerCase());
    if (id) resolvedIds.push(id);
  }

  return [...new Set(resolvedIds)];
}

module.exports = { lireTags, resolveTagIds };
