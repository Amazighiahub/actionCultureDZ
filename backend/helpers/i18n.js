// helpers/i18n.js
// Fonctions utilitaires pour l'internationalisation (i18n)

const { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, cheminJson } = require('../constants/langues');

/**
 * Traduit récursivement tous les champs d'un objet ou tableau
 * @param {Object|Array} data - Données à traduire
 * @param {string} lang - Code de langue cible
 * @param {Array} fieldsToTranslate - Liste des champs à traduire (optionnel)
 * @returns {Object|Array} - Données traduites
 */
const translateDeep = (data, lang = DEFAULT_LANGUAGE, fieldsToTranslate = null) => {
  if (!data) return data;
  // ?i18n=all : toutes les langues, sans traduction (formulaires de modification)
  if (lang === 'all') {
    if (Array.isArray(data)) return data.map(d => (d && typeof d.toJSON === 'function' ? d.toJSON() : d));
    return data.toJSON && typeof data.toJSON === 'function' ? data.toJSON() : data;
  }
  
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
 * Champ multilingue reçu d'un formulaire multipart (FormData) : l'objet { fr, ar, … } y arrive
 * en texte JSON. Le relit en objet ; un texte simple est rendu tel quel.
 * @param {string|Object} value
 * @returns {string|Object}
 */
const lireMultiLang = (value) => {
  if (typeof value !== 'string' || !value.trim().startsWith('{')) return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : value;
  } catch {
    return value;
  }
};

/**
 * Texte affichable d'un champ multilingue (objet, texte JSON ou simple chaîne) : la seule lecture d'un
 * texte multilingue du serveur (audit V11 COD-B3). Ordre : la langue demandée, la langue de secours
 * (si donnée), le français, l'arabe, puis les autres langues du site dans leur ordre (en, tz-ltn,
 * tz-tfng), puis toute autre clé remplie. Une langue vide ou faite d'espaces est sautée : un texte écrit
 * seulement en tamazight ou en anglais n'est donc jamais vide.
 * @param {Object|string|null} value
 * @param {string} [lang] langue demandée
 * @param {string|null} [secours] langue essayée juste après (adresses : l'anglais avant l'arabe, utils/slug.js)
 * @returns {string} '' si aucune langue n'est remplie
 */
const texteLisible = (value, lang = DEFAULT_LANGUAGE, secours = null) => {
  const v = lireMultiLang(value);
  if (v == null) return '';
  if (typeof v !== 'object') return String(v);
  const rempli = (x) => (typeof x === 'string' && x.trim() ? x : '');
  for (const cle of [lang, secours, 'fr', 'ar', ...SUPPORTED_LANGUAGES]) {
    if (cle && rempli(v[cle])) return v[cle];
  }
  return Object.values(v).map(rempli).find(Boolean) || '';
};

/**
 * Ancien nom de texteLisible, gardé pour ses appelants. Différences avec l'ancienne version : un texte
 * JSON est relu, une langue faite d'espaces est sautée, l'arabe passe avant les autres langues.
 * @param {Object|string} field
 * @param {string} [lang]
 * @param {string} [fallbackLang] langue essayée après la langue demandée (défaut : français)
 * @returns {string}
 */
const translate = (field, lang = DEFAULT_LANGUAGE, fallbackLang = DEFAULT_LANGUAGE) => texteLisible(field, lang, fallbackLang);

/** Vrai si au moins une langue est remplie */
const aUnTexte = (value) => texteLisible(value).trim().length > 0;

/**
 * Fusionne les traductions existantes avec de nouvelles
 * @param {Object} existing - Traductions existantes
 * @param {Object} updates - Nouvelles traductions
 * @returns {Object} - Traductions fusionnées
 */
const mergeTranslations = (existing, updates) => {
  updates = lireMultiLang(updates);
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

  // Filtrer les clés dangereuses (prototype pollution)
  const safeUpdates = {};
  for (const key of Object.keys(updatesObj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    // Une langue laissée vide ne remplace pas la traduction existante (un formulaire qui
    // n'envoie que la langue saisie effaçait sinon les autres)
    const value = updatesObj[key];
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) continue;
    safeUpdates[key] = value;
  }

  return { ...existingObj, ...safeUpdates };
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
 * Construit une clause WHERE pour correspondance exacte (insensible à la casse) sur un champ JSON multilingue.
 * Cherche dans toutes les langues : si la valeur existe dans n'importe quelle langue, retourne un match.
 * Utilisé par findOrCreate pour éviter les doublons.
 * @param {string} field - Nom du champ JSON (ex: 'nom')
 * @param {string} value - Valeur à chercher (string brute)
 * @returns {Object} - Clause Sequelize WHERE
 */
const buildMultiLangExactMatch = (field, value) => {
  const { Op, Sequelize } = require('sequelize');

  if (!value || typeof value !== 'string') return {};

  const normalized = value.trim().toLowerCase();
  if (!normalized) return {};

  const conditions = SUPPORTED_LANGUAGES.map(l => Sequelize.where(
    Sequelize.fn('LOWER',
      Sequelize.fn('JSON_UNQUOTE',
        Sequelize.fn('JSON_EXTRACT', Sequelize.col(field), Sequelize.literal(`'$.${cheminJson(l)}'`))
      )
    ),
    normalized
  ));

  return { [Op.or]: conditions };
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
    return { percentage: 0, missing: [...SUPPORTED_LANGUAGES], complete: [] };
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
  lireMultiLang,
  texteLisible,
  aUnTexte,
  mergeTranslations,
  prepareMultiLangField,
  buildMultiLangExactMatch,
  hasTranslation,
  getTranslationStatus
};
