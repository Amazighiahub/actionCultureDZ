// helpers/i18n.js
// Fonctions utilitaires pour l'internationalisation (i18n)

const SUPPORTED_LANGUAGES = ['fr', 'ar', 'en', 'tz-ltn', 'tz-tfng'];
const DEFAULT_LANGUAGE = 'fr';

/**
 * Traduit un champ JSON multilingue vers une langue spécifique
 * @param {Object|string} field - Champ JSON ou string
 * @param {string} lang - Code de langue cible
 * @param {string} fallbackLang - Langue de fallback (défaut: fr)
 * @returns {string} - Valeur traduite
 */
const translate = (field, lang = DEFAULT_LANGUAGE, fallbackLang = DEFAULT_LANGUAGE) => {
  // Si c'est déjà une string, la retourner
  if (typeof field === 'string') {
    return field;
  }
  
  // Si null ou undefined
  if (!field) {
    return '';
  }
  
  // Si c'est un objet JSON avec les traductions
  if (typeof field === 'object') {
    // Essayer la langue demandée
    if (field[lang]) {
      return field[lang];
    }
    
    // Fallback vers la langue par défaut
    if (field[fallbackLang]) {
      return field[fallbackLang];
    }
    
    // Fallback vers français
    if (field['fr']) {
      return field['fr'];
    }
    
    // Retourner la première valeur disponible
    const values = Object.values(field).filter(v => v && typeof v === 'string');
    return values[0] || '';
  }
  
  return String(field);
};

/**
 * Traduit récursivement tous les champs d'un objet ou tableau
 * @param {Object|Array} data - Données à traduire
 * @param {string} lang - Code de langue cible
 * @param {Array} fieldsToTranslate - Liste des champs à traduire (optionnel)
 * @returns {Object|Array} - Données traduites
 */
const translateDeep = (data, lang = DEFAULT_LANGUAGE, fieldsToTranslate = null) => {
  if (!data) return data;
  
  // Si c'est un tableau, traiter chaque élément
  if (Array.isArray(data)) {
    return data.map(item => translateDeep(item, lang, fieldsToTranslate));
  }
  
  // Si c'est un objet Sequelize, le convertir en JSON
  if (data.toJSON && typeof data.toJSON === 'function') {
    data = data.toJSON();
  }
  
  // Si ce n'est pas un objet, le retourner tel quel
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  // Créer une copie de l'objet
  const result = { ...data };
  
  // Parcourir toutes les clés
  for (const key of Object.keys(result)) {
    const value = result[key];
    
    // Si c'est un objet qui ressemble à des traductions (contient des codes de langue)
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const keys = Object.keys(value);
      const isTranslationObject = keys.some(k => SUPPORTED_LANGUAGES.includes(k));
      
      if (isTranslationObject) {
        // Si fieldsToTranslate est défini, vérifier si ce champ doit être traduit
        if (!fieldsToTranslate || fieldsToTranslate.includes(key)) {
          result[key] = translate(value, lang);
        }
      } else {
        // Traduire récursivement les sous-objets
        result[key] = translateDeep(value, lang, fieldsToTranslate);
      }
    }
    // Si c'est un tableau, traduire chaque élément
    else if (Array.isArray(value)) {
      result[key] = value.map(item => translateDeep(item, lang, fieldsToTranslate));
    }
  }
  
  return result;
};

/**
 * Crée un objet multilingue à partir d'une valeur et d'une langue
 * @param {string} value - Valeur à stocker
 * @param {string} lang - Code de langue
 * @param {Object} existingTranslations - Traductions existantes (optionnel)
 * @returns {Object} - Objet JSON multilingue
 */
const createMultiLang = (value, lang = DEFAULT_LANGUAGE, existingTranslations = {}) => {
  // Si la valeur est déjà un objet multilingue, la retourner
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const keys = Object.keys(value);
    if (keys.some(k => SUPPORTED_LANGUAGES.includes(k))) {
      return { ...existingTranslations, ...value };
    }
  }
  
  // Créer l'objet avec la valeur dans la langue spécifiée
  return {
    ...existingTranslations,
    [lang]: value
  };
};

/**
 * Fusionne les traductions existantes avec de nouvelles
 * @param {Object} existing - Traductions existantes
 * @param {Object} updates - Nouvelles traductions
 * @returns {Object} - Traductions fusionnées
 */
const mergeTranslations = (existing, updates) => {
  if (!existing && !updates) return {};
  if (!existing) return updates;
  if (!updates) return existing;
  
  // Convertir les strings en objets si nécessaire
  const existingObj = typeof existing === 'string' 
    ? { [DEFAULT_LANGUAGE]: existing } 
    : existing;
  
  const updatesObj = typeof updates === 'string'
    ? { [DEFAULT_LANGUAGE]: updates }
    : updates;
  
  return { ...existingObj, ...updatesObj };
};

/**
 * Prépare un champ multilingue pour la sauvegarde
 * Accepte string ou objet JSON
 * @param {string|Object} value - Valeur entrée par l'utilisateur
 * @param {string} lang - Langue courante
 * @param {Object} existingValue - Valeur existante en BDD (optionnel)
 * @returns {Object} - Objet JSON prêt pour la BDD
 */
const prepareMultiLangField = (value, lang = DEFAULT_LANGUAGE, existingValue = null) => {
  // Si pas de valeur, retourner l'existant ou objet vide
  if (value === undefined || value === null) {
    return existingValue || {};
  }
  
  // Si c'est déjà un objet multilingue
  if (typeof value === 'object' && !Array.isArray(value)) {
    const keys = Object.keys(value);
    if (keys.some(k => SUPPORTED_LANGUAGES.includes(k))) {
      // Fusionner avec l'existant
      return mergeTranslations(existingValue, value);
    }
  }
  
  // Si c'est une string, créer/mettre à jour dans la langue courante
  if (typeof value === 'string') {
    return mergeTranslations(existingValue, { [lang]: value });
  }
  
  return existingValue || {};
};

/**
 * Construit une clause WHERE pour recherche multilingue
 * @param {string} field - Nom du champ
 * @param {string} searchTerm - Terme de recherche
 * @param {string} lang - Langue de recherche (optionnel, cherche dans toutes si non spécifié)
 * @returns {Object} - Clause Sequelize
 */
const buildMultiLangSearch = (field, searchTerm, lang = null) => {
  const { Op, Sequelize } = require('sequelize');
  
  if (!searchTerm) return {};
  
  const searchPattern = `%${searchTerm}%`;
  
  if (lang) {
    // Recherche dans une langue spécifique
    return Sequelize.where(
      Sequelize.fn('JSON_EXTRACT', Sequelize.col(field), Sequelize.literal(`'$.${lang}'`)),
      { [Op.like]: searchPattern }
    );
  }
  
  // Recherche dans toutes les langues
  const conditions = SUPPORTED_LANGUAGES.map(l => 
    Sequelize.where(
      Sequelize.fn('JSON_EXTRACT', Sequelize.col(field), Sequelize.literal(`'$.${l}'`)),
      { [Op.like]: searchPattern }
    )
  );
  
  return { [Op.or]: conditions };
};

/**
 * Construit une clause ORDER BY pour tri multilingue
 * @param {string} field - Nom du champ
 * @param {string} lang - Langue pour le tri
 * @param {string} direction - ASC ou DESC
 * @returns {Array} - Clause Sequelize pour order
 */
const buildMultiLangOrder = (field, lang = DEFAULT_LANGUAGE, direction = 'ASC') => {
  const { Sequelize } = require('sequelize');
  
  return [
    Sequelize.fn('JSON_EXTRACT', Sequelize.col(field), Sequelize.literal(`'$.${lang}'`)),
    direction
  ];
};

/**
 * Vérifie si un champ a une traduction dans une langue donnée
 * @param {Object} field - Champ JSON multilingue
 * @param {string} lang - Code de langue
 * @returns {boolean}
 */
const hasTranslation = (field, lang) => {
  if (!field || typeof field !== 'object') return false;
  return !!field[lang] && field[lang].trim() !== '';
};

/**
 * Retourne le pourcentage de traduction d'un objet
 * @param {Object} field - Champ JSON multilingue
 * @returns {Object} - { percentage, missing: ['ar', 'en'], complete: ['fr'] }
 */
const getTranslationStatus = (field) => {
  if (!field || typeof field !== 'object') {
    return { percentage: 0, missing: SUPPORTED_LANGUAGES, complete: [] };
  }
  
  const complete = SUPPORTED_LANGUAGES.filter(lang => hasTranslation(field, lang));
  const missing = SUPPORTED_LANGUAGES.filter(lang => !hasTranslation(field, lang));
  const percentage = Math.round((complete.length / SUPPORTED_LANGUAGES.length) * 100);
  
  return { percentage, missing, complete };
};

module.exports = {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  translate,
  translateDeep,
  createMultiLang,
  mergeTranslations,
  prepareMultiLangField,
  buildMultiLangSearch,
  buildMultiLangOrder,
  hasTranslation,
  getTranslationStatus
};