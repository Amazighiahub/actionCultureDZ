// middleware/language.js
// Middleware de détection et validation de la langue pour i18n

const SUPPORTED_LANGUAGES = ['fr', 'ar', 'en', 'tz-ltn', 'tz-tfng'];
const DEFAULT_LANGUAGE = 'fr';

/**
 * Normalise un code de langue
 */
const normalizeLanguage = (lang) => {
  if (!lang || typeof lang !== 'string') return DEFAULT_LANGUAGE;
  
  const cleaned = lang.trim().toLowerCase();
  
  // Vérifier si c'est une langue supportée exacte
  if (SUPPORTED_LANGUAGES.includes(cleaned)) {
    return cleaned;
  }
  
  // Gérer les variantes
  if (cleaned.startsWith('ar')) return 'ar';
  if (cleaned.startsWith('fr')) return 'fr';
  if (cleaned.startsWith('en')) return 'en';
  
  // Mapping des codes alternatifs pour Tamazight
  const tamazightCodes = ['ber', 'kab', 'tzm', 'zgh'];
  if (tamazightCodes.some(code => cleaned.startsWith(code))) {
    return 'tz-ltn';
  }
  
  // Tifinagh
  if (cleaned === 'tmh' || cleaned.includes('tfng')) {
    return 'tz-tfng';
  }
  
  return DEFAULT_LANGUAGE;
};

/**
 * Middleware de détection automatique de la langue
 * Ordre de priorité :
 * 1. Query parameter ?lang=xx
 * 2. Header X-Language
 * 3. Cookie 'language'
 * 4. Header Accept-Language
 * 5. Langue par défaut (fr)
 */
const languageMiddleware = (req, res, next) => {
  let detectedLang = null;
  
  // 1. Query parameter
  if (req.query.lang) {
    detectedLang = req.query.lang;
  }
  // 2. Header X-Language
  else if (req.headers['x-language']) {
    detectedLang = req.headers['x-language'];
  }
  // 3. Cookie
  else if (req.cookies && req.cookies.language) {
    detectedLang = req.cookies.language;
  }
  // 4. Accept-Language header
  else if (req.headers['accept-language']) {
    const acceptLang = req.headers['accept-language'].split(',')[0];
    detectedLang = acceptLang.split('-')[0];
  }
  
  // Normaliser et attacher à la requête
  req.language = normalizeLanguage(detectedLang);
  req.lang = req.language; // Alias
  
  // Ajouter au header de réponse pour debug
  res.setHeader('X-Content-Language', req.language);
  
  next();
};

/**
 * Middleware de validation de langue pour les routes de traduction
 * Valide le paramètre :lang dans l'URL
 */
const validateLanguage = (req, res, next) => {
  const { lang } = req.params;
  
  if (!lang) {
    return res.status(400).json({
      success: false,
      error: req.t ? req.t('validation.invalidData') : 'Language code required'
    });
  }
  
  const normalized = normalizeLanguage(lang);
  
  if (!SUPPORTED_LANGUAGES.includes(normalized)) {
    return res.status(400).json({
      success: false,
      error: req.t ? req.t('validation.invalidData') : `Unsupported language: ${lang}`,
      supportedLanguages: SUPPORTED_LANGUAGES
    });
  }
  
  req.targetLanguage = normalized;
  next();
};

/**
 * Middleware pour définir la langue via cookie
 */
const setLanguageCookie = (req, res, next) => {
  const { lang } = req.body;
  
  if (!lang) {
    return res.status(400).json({
      success: false,
      error: req.t ? req.t('validation.invalidData') : 'Language code required'
    });
  }
  
  const normalized = normalizeLanguage(lang);
  
  if (!SUPPORTED_LANGUAGES.includes(normalized)) {
    return res.status(400).json({
      success: false,
      error: req.t ? req.t('validation.invalidData') : `Unsupported language: ${lang}`,
      supportedLanguages: SUPPORTED_LANGUAGES
    });
  }
  
  // Définir le cookie (1 an)
  res.cookie('language', normalized, {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  
  req.language = normalized;
  next();
};

/**
 * Helper pour obtenir les infos de toutes les langues
 */
const getLanguagesInfo = () => [
  { code: 'fr', label: 'Français', nativeLabel: 'Français', dir: 'ltr', flag: '🇫🇷' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', dir: 'rtl', flag: '🇩🇿' },
  { code: 'en', label: 'English', nativeLabel: 'English', dir: 'ltr', flag: '🇬🇧' },
  { code: 'tz-ltn', label: 'Tamazight (Latin)', nativeLabel: 'Tamaziɣt', dir: 'ltr', flag: 'ⵣ' },
  { code: 'tz-tfng', label: 'Tamazight (Tifinagh)', nativeLabel: 'ⵜⴰⵎⴰⵣⵉⵖⵜ', dir: 'ltr', flag: 'ⵣ' }
];

/**
 * Helper pour vérifier si une langue est RTL
 */
const isRTL = (lang) => {
  const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
  return rtlLanguages.includes(normalizeLanguage(lang));
};

module.exports = {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  normalizeLanguage,
  languageMiddleware,
  validateLanguage,
  setLanguageCookie,
  getLanguagesInfo,
  isRTL
};