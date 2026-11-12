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
 * Construit une condition de recherche sur plusieurs champs multilingues
 *
 * @param {Sequelize} sequelize - Instance Sequelize
 * @param {string[]} fields - Liste des champs à chercher
 * @param {string} search - Terme de recherche
 * @param {string} [tableName] - Nom de la table
 * @returns {Object} Condition Sequelize pour le WHERE
 *
 * @example
 * const where = buildMultiFieldSearch(sequelize, ['titre', 'description'], 'art');
 */
function buildMultiFieldSearch(sequelize, fields, search, tableName = null) {
  if (!search || !fields || fields.length === 0) {
    return {};
  }

  const allConditions = fields.flatMap(field =>
    buildMultiLangSearch(sequelize, field, search, tableName)
  );

  if (allConditions.length === 0) {
    return {};
  }

  return {
    [Op.or]: allConditions
  };
}

/**
 * Construit une clause ORDER BY pour trier par un champ JSON multilingue
 *
 * @param {Sequelize} sequelize - Instance Sequelize
 * @param {string} field - Nom du champ
 * @param {string} lang - Langue pour le tri (défaut: 'fr')
 * @param {string} direction - Direction du tri ('ASC' ou 'DESC')
 * @param {string} [tableName] - Nom de la table
 * @returns {Array} Clause pour l'option order de Sequelize
 *
 * @example
 * const order = buildMultiLangOrder(sequelize, 'titre', 'fr', 'ASC');
 */
function buildMultiLangOrder(sequelize, field, lang = 'fr', direction = 'ASC', tableName = null) {
  // 🔒 Valider tous les paramètres
  const safeField = sanitizeField(field);
  if (!safeField) return [['id', 'ASC']]; // Fallback sécurisé

  const safeTable = tableName ? sanitizeTableName(tableName) : null;
  const safeLang = sanitizeLang(lang);
  const fieldRef = safeTable ? `\`${safeTable}\`.\`${safeField}\`` : `\`${safeField}\``;
  const validDirection = direction.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const jsonPath = `$.${cheminJson(safeLang)}`;
  return [
    sequelize.literal(`JSON_UNQUOTE(JSON_EXTRACT(${fieldRef}, '${jsonPath}')) ${validDirection}`)
  ];
}

/**
 * Extrait la valeur traduite d'un champ JSON selon la langue
 *
 * @param {Sequelize} sequelize - Instance Sequelize
 * @param {string} field - Nom du champ
 * @param {string} lang - Langue souhaitée
 * @param {string} [alias] - Alias pour le résultat
 * @param {string} [tableName] - Nom de la table
 * @returns {Array} Attribut Sequelize pour SELECT
 *
 * @example
 * const attr = buildTranslatedAttribute(sequelize, 'titre', 'ar', 'titre_traduit');
 */
function buildTranslatedAttribute(sequelize, field, lang = 'fr', alias = null, tableName = null) {
  // 🔒 Valider tous les paramètres
  const safeField = sanitizeField(field);
  if (!safeField) return null;

  const safeTable = tableName ? sanitizeTableName(tableName) : null;
  const safeLang = sanitizeLang(lang);
  const fieldRef = safeTable ? `\`${safeTable}\`.\`${safeField}\`` : `\`${safeField}\``;
  const resultAlias = alias ? sanitizeField(alias) || `${safeField}_${safeLang}` : `${safeField}_${safeLang}`;

  const jsonPath = `$.${cheminJson(safeLang)}`;
  return [
    sequelize.literal(`JSON_UNQUOTE(JSON_EXTRACT(${fieldRef}, '${jsonPath}'))`),
    resultAlias
  ];
}

/**
 * Construit un filtre WHERE pour un champ JSON multilingue exact
 *
 * @param {Sequelize} sequelize - Instance Sequelize
 * @param {string} field - Nom du champ
 * @param {string} value - Valeur exacte à chercher
 * @param {string} lang - Langue du champ
 * @returns {Object} Condition Sequelize
 */
function buildExactMatch(sequelize, field, value, lang = 'fr') {
  // 🔒 Valider le champ et la langue
  const safeField = sanitizeField(field);
  if (!safeField) return null;

  const safeLang = sanitizeLang(lang);

  const jsonPath = `$.${cheminJson(safeLang)}`;
  return sequelize.where(
    sequelize.fn('JSON_UNQUOTE', sequelize.fn('JSON_EXTRACT', sequelize.col(safeField), sequelize.literal(`'${jsonPath}'`))),
    value
  );
}

/**
 * Construit une recherche FULLTEXT sur les champs JSON (si index FULLTEXT configuré)
 * Note: Nécessite un index FULLTEXT sur la colonne
 *
 * @param {Sequelize} sequelize - Instance Sequelize
 * @param {string} field - Nom du champ
 * @param {string} search - Terme de recherche
 * @returns {Object} Condition Sequelize pour MATCH AGAINST
 */
function buildFullTextSearch(sequelize, field, search) {
  // 🔒 Valider le champ
  const safeField = sanitizeField(field);
  if (!safeField) return null;

  // 🔒 Nettoyer la recherche - supprimer tout caractère dangereux
  const safeSearch = search
    .replace(/['"\\;]/g, '') // Supprimer quotes et point-virgule
    .replace(/[<>]/g, '')    // Supprimer chevrons
    .substring(0, 100)       // Limiter la longueur
    .trim();

  if (!safeSearch) return null;

  return sequelize.literal(
    `MATCH(\`${safeField}\`) AGAINST(${sequelize.escape(safeSearch)} IN NATURAL LANGUAGE MODE)`
  );
}

/**
 * Helper pour créer des conditions de filtre géographique avec traduction
 *
 * @param {Sequelize} sequelize - Instance Sequelize
 * @param {Object} models - Modèles Sequelize
 * @param {Object} params - Paramètres de filtre { wilaya, daira, commune }
 * @returns {Object} Conditions et includes pour Sequelize
 */
function buildGeographicFilter(sequelize, models, params = {}) {
  const { wilaya, daira, commune } = params;
  const includes = [];
  const where = {};

  if (commune) {
    where.communeId = commune;
  }

  // Include Commune avec Daira et Wilaya
  const communeInclude = {
    model: models.Commune,
    as: 'Commune',
    required: false,
    include: [{
      model: models.Daira,
      as: 'Daira',
      required: false,
      include: [{
        model: models.Wilaya,
        as: 'Wilaya',
        required: false
      }]
    }]
  };

  if (daira) {
    communeInclude.where = { id_daira: daira };
    communeInclude.required = true;
  }

  if (wilaya) {
    communeInclude.include[0].where = { id_wilaya: wilaya };
    communeInclude.include[0].required = true;
    communeInclude.required = true;
  }

  includes.push(communeInclude);

  return { where, includes };
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
  buildMultiFieldSearch,
  buildMultiLangOrder,
  buildTranslatedAttribute,
  buildExactMatch,
  buildFullTextSearch,
  buildGeographicFilter,

  // Constantes
  SUPPORTED_LANGUAGES
};
