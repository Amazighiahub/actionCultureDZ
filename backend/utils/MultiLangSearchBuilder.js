/**
 * MultiLangSearchBuilder - Utilitaire pour les recherches multilingues
 *
 * Ce module centralise la logique de recherche multilingue qui était
 * dupliquée dans 5 contrôleurs (OeuvreController, PatrimoineController,
 * LieuController, IntervenantController, ServicesController).
 *
 * Usage:
 *   const { buildMultiLangSearch, buildMultiLangOrder } = require('../utils/MultiLangSearchBuilder');
 *   const searchConditions = buildMultiLangSearch(sequelize, 'titre', searchTerm);
 */

const { Op } = require('sequelize');

// Langues supportées pour la recherche
const SUPPORTED_LANGUAGES = ['fr', 'ar', 'en', 'tz-ltn', 'tz-tfng'];

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

  const safeSearch = sequelize.escape(`%${search.trim()}%`);
  const fieldRef = tableName ? `\`${tableName}\`.\`${field}\`` : `\`${field}\``;

  return languages.map(lang => {
    return sequelize.literal(
      `JSON_UNQUOTE(JSON_EXTRACT(${fieldRef}, '$.${lang}')) LIKE ${safeSearch}`
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
  const fieldRef = tableName ? `\`${tableName}\`.\`${field}\`` : `\`${field}\``;
  const validDirection = direction.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  return [
    sequelize.literal(`JSON_UNQUOTE(JSON_EXTRACT(${fieldRef}, '$.${lang}')) ${validDirection}`)
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
  const fieldRef = tableName ? `\`${tableName}\`.\`${field}\`` : `\`${field}\``;
  const resultAlias = alias || `${field}_${lang}`;

  return [
    sequelize.literal(`JSON_UNQUOTE(JSON_EXTRACT(${fieldRef}, '$.${lang}'))`),
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
  const safeValue = sequelize.escape(value);

  return sequelize.where(
    sequelize.fn('JSON_UNQUOTE', sequelize.fn('JSON_EXTRACT', sequelize.col(field), sequelize.literal(`'$.${lang}'`))),
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
  const safeSearch = search.replace(/['"]/g, '');

  return sequelize.literal(
    `MATCH(${field}) AGAINST('${safeSearch}' IN NATURAL LANGUAGE MODE)`
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

module.exports = {
  // Fonctions principales
  buildMultiLangSearch,
  buildMultiFieldSearch,
  buildMultiLangOrder,
  buildTranslatedAttribute,
  buildExactMatch,
  buildFullTextSearch,
  buildGeographicFilter,

  // Constantes
  SUPPORTED_LANGUAGES
};
