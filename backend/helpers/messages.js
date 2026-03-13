// helpers/messages.js
// Système de traduction des messages API (error/success) pour le backend
// Utilise req.lang (fourni par le middleware language.js) pour traduire les réponses

const SUPPORTED_LANGUAGES = ['fr', 'ar', 'en', 'tz-ltn', 'tz-tfng'];
const DEFAULT_LANGUAGE = 'fr';

// Charger les fichiers de traduction
const translations = {};
SUPPORTED_LANGUAGES.forEach(lang => {
  try {
    translations[lang] = require(`../i18n/messages/${lang}.json`);
  } catch (e) {
    console.warn(`[i18n] Messages file not found for language: ${lang}`);
    translations[lang] = {};
  }
});

/**
 * Traduit une clé de message dans la langue demandée
 * @param {string} key - Clé de traduction (ex: 'user.notFound')
 * @param {string} lang - Code de langue (ex: 'fr', 'ar', 'en')
 * @param {Object} params - Paramètres d'interpolation (ex: { count: 5 })
 * @returns {string} - Message traduit
 */
function t(key, lang = DEFAULT_LANGUAGE, params = {}) {
  const safeLang = SUPPORTED_LANGUAGES.includes(lang) ? lang : DEFAULT_LANGUAGE;
  
  // Chercher dans la langue demandée, puis fallback vers fr
  let message = getNestedValue(translations[safeLang], key)
    || getNestedValue(translations[DEFAULT_LANGUAGE], key)
    || key;

  // Interpolation des paramètres: ${param}
  if (params && typeof message === 'string') {
    for (const [k, v] of Object.entries(params)) {
      message = message.replace(new RegExp(`\\$\\{${k}\\}`, 'g'), String(v));
    }
  }

  return message;
}

/**
 * Crée une fonction t() liée à une langue (pour usage dans les controllers)
 * @param {string} lang - Code de langue
 * @returns {Function} - Fonction t(key, params)
 */
function createT(lang) {
  return (key, params) => t(key, lang, params);
}

/**
 * Middleware Express qui attache req.t() basé sur req.lang
 */
function i18nMiddleware(req, res, next) {
  req.t = createT(req.lang || req.language || DEFAULT_LANGUAGE);
  next();
}

/**
 * Accède à une valeur imbriquée dans un objet via un chemin pointé
 */
function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((cur, key) => cur && cur[key], obj);
}

module.exports = {
  t,
  createT,
  i18nMiddleware,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE
};
