/**
 * Langues du site — source unique pour les middlewares, helpers, contrôleurs et routes.
 * Ce fichier n'importe rien : il peut être chargé partout sans dépendance circulaire.
 * Les migrations gardent leur propre copie, figée à la date où elles ont été écrites.
 */
const SUPPORTED_LANGUAGES = Object.freeze(['fr', 'ar', 'en', 'tz-ltn', 'tz-tfng']);
const DEFAULT_LANGUAGE = 'fr';

/** Vrai si le code est exactement une langue du site (sans alias ni nettoyage). */
const estLangueSupportee = (lang) => typeof lang === 'string' && SUPPORTED_LANGUAGES.includes(lang);

/**
 * Clé d'une langue dans un chemin JSON MySQL : `"tz-ltn"` doit être cité (tiret), `fr` non.
 */
const cheminJson = (lang) => (lang.includes('-') ? `"${lang}"` : lang);

module.exports = { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, estLangueSupportee, cheminJson };
