/**
 * MultiLangSearchBuilder - Utilitaire pour les recherches multilingues
 *
 * Ce module centralise la logique de recherche multilingue qui était
 * dupliquée dans 5 contrôleurs (OeuvreController, PatrimoineController,
 * LieuController, IntervenantController, ServicesController).
 *
 * Usage:
 *   const { buildMultiLangSearch, buildMultiLangOrder } = require('../utils/multiLangSearchBuilder');
 *   const searchConditions = buildMultiLangSearch(sequelize, 'titre', searchTerm);
 */

const { Op } = require('sequelize');

// Langues supportées pour la recherche
const { SUPPORTED_LANGUAGES, cheminJson } = require('../constants/langues');

/**
 * 🔒 Valide et retourne une langue sécurisée
 * Prévient l'injection SQL via le paramètre lang
 */
function sanitizeLang(lang) {
  if (!lang || typeof lang !== 'string') return 'fr';
  const normalizedLang = lang.toLowerCase().trim();
  return SUPPORTED_LANGUAGES.includes(normalizedLang) ? normalizedLang : 'fr';
}

/**
 * 🔒 Valide et retourne un nom de champ sécurisé
 * Seuls les caractères alphanumériques et underscores sont autorisés
 */
function sanitizeField(field) {
  if (!field || typeof field !== 'string') return null;
  // Autoriser uniquement lettres, chiffres et underscores
  const sanitized = field.replace(/[^a-zA-Z0-9_]/g, '');
  return sanitized.length > 0 ? sanitized : null;
}

/**
 * 🔒 Valide et retourne un nom de table sécurisé
 */
function sanitizeTableName(tableName) {
  if (!tableName || typeof tableName !== 'string') return null;
  const sanitized = tableName.replace(/[^a-zA-Z0-9_]/g, '');
  return sanitized.length > 0 ? sanitized : null;
}

/**
 * Construit les conditions de recherche multilingue pour un champ JSON
 *
 * @param {Sequelize} sequelize - Instance Sequelize
 * @param {string} field - Nom du champ (ex: 'titre', 'nom', 'description')
 * @param {string} search - Terme de recherche
 * @param {string} [tableName] - Nom de la table (optionnel, pour les alias)
 * @param {string[]} [languages] - Langues à chercher (défaut: toutes)
 * @returns {Array} Array de conditions pour Op.or
 *
 * @example
 * const conditions = buildMultiLangSearch(sequelize, 'titre', 'culture');
 * // Génère: JSON_EXTRACT(titre, '$.fr') LIKE '%culture%' OR JSON_EXTRACT(titre, '$.ar') LIKE '%culture%' ...
 */
function buildMultiLangSearch(sequelize, field, search, tableName = null, languages = SUPPORTED_LANGUAGES) {
  if (!search || typeof search !== 'string') {
    return [];
  }

  // 🔒 Valider le champ et la table
  const safeField = sanitizeField(field);
  if (!safeField) return [];

  const safeTable = tableName ? sanitizeTableName(tableName) : null;
  const safeSearch = sequelize.escape(`%${search.trim()}%`);
  const fieldRef = safeTable ? `\`${safeTable}\`.\`${safeField}\`` : `\`${safeField}\``;

  // 🔒 Filtrer uniquement les langues supportées
  const safeLangs = languages.filter(l => SUPPORTED_LANGUAGES.includes(l));

  return safeLangs.map(lang => {
    // Clé citée pour les codes à tiret (tz-ltn, tz-tfng) : constants/langues.js cheminJson
    const jsonPath = `$.${cheminJson(lang)}`;
    // Sans majuscules ni accents : la valeur extraite du JSON est comparée en binaire (« palais » ne
    // trouvait pas « Palais », ni « theatre » « Théâtre ») — la recherche des lieux ne trouvait presque rien
    return sequelize.literal(
      `CONVERT(JSON_UNQUOTE(JSON_EXTRACT(${fieldRef}, '${jsonPath}')) USING utf8mb4) COLLATE utf8mb4_0900_ai_ci LIKE ${safeSearch}`
    );
  });
}

/**
 * Condition de recherche d'une liste, à fusionner dans son where : toutes les langues ;
 * null si moins de 2 caractères. Réservé aux listes d'administration (parcours de la table).
 */
function conditionRecherche(sequelize, champ, terme, table) {
  if (typeof terme !== 'string' || terme.trim().length < 2) return null;
  const { sanitizeLike } = require('./sanitize');
  return { [Op.or]: buildMultiLangSearch(sequelize, champ, sanitizeLike(terme.trim()), table) };
}

/**
 * Recherche d'une personne (compte ou intervenant) par prénom ou nom, dans toutes les langues : colonne
 * nom_recherche quand la migration 20261216-recherche-noms est passée (une comparaison au lieu de dix
 * extractions JSON par ligne), sinon prénom et nom langue par langue. `terme` : déjà passé par sanitizeLike,
 * comme pour buildMultiLangSearch. Audit V11 BDD-3.
 * @returns {Promise<Array>} conditions à mettre dans un Op.or
 */
async function rechercheNomPersonne(sequelize, model, terme, tableName = null) {
  if (!terme || typeof terme !== 'string') return [];
  const { aColonne } = require('./colonnesCalculees');
  if (await aColonne(model, 'nom_recherche')) {
    const table = tableName ? sanitizeTableName(tableName) : null;
    const ref = table ? `\`${table}\`.\`nom_recherche\`` : '`nom_recherche`';
    return [sequelize.literal(`${ref} LIKE ${sequelize.escape(`%${terme.trim()}%`)}`)];
  }
  return [...buildMultiLangSearch(sequelize, 'nom', terme, tableName), ...buildMultiLangSearch(sequelize, 'prenom', terme, tableName)];
}

module.exports = {
  // Fonctions principales
  buildMultiLangSearch,
  rechercheNomPersonne,
  conditionRecherche,
  // Constantes
  SUPPORTED_LANGUAGES
};
