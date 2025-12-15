// routes/languageRoutes.js - Routes pour la gestion des langues i18n
const express = require('express');
const router = express.Router();

const { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } = require('../helpers/i18n');

/**
 * Routes pour la gestion des langues
 * Ces routes permettent aux clients de connaître les langues supportées
 * et de définir leur préférence de langue
 */

// GET /api/languages - Récupérer les langues supportées
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      supported: SUPPORTED_LANGUAGES,
      current: req.lang || DEFAULT_LANGUAGE,
      default: DEFAULT_LANGUAGE,
      labels: {
        'fr': 'Français',
        'ar': 'العربية',
        'en': 'English',
        'tz-ltn': 'Tamazight (Latin)',
        'tz-tfng': 'ⵜⴰⵎⴰⵣⵉⵖⵜ (Tifinagh)'
      },
      rtl: ['ar', 'tz-tfng']  // Langues de droite à gauche
    }
  });
});

// POST /api/set-language - Définir la langue préférée (stockée en cookie)
router.post('/set-language', (req, res) => {
  const { lang } = req.body;
  
  if (!lang) {
    return res.status(400).json({
      success: false,
      error: 'Paramètre "lang" requis'
    });
  }
  
  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    return res.status(400).json({
      success: false,
      error: `Langue non supportée: ${lang}`,
      supported: SUPPORTED_LANGUAGES
    });
  }
  
  // Définir le cookie de langue (1 an)
  res.cookie('language', lang, {
    maxAge: 365 * 24 * 60 * 60 * 1000,  // 1 an
    httpOnly: false,  // Accessible côté client
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });
  
  res.json({
    success: true,
    message: `Langue définie: ${lang}`,
    data: {
      lang,
      label: {
        'fr': 'Français',
        'ar': 'العربية',
        'en': 'English',
        'tz-ltn': 'Tamazight (Latin)',
        'tz-tfng': 'ⵜⴰⵎⴰⵣⵉⵖⵜ (Tifinagh)'
      }[lang]
    }
  });
});

// GET /api/languages/detect - Détecter la langue du navigateur
router.get('/detect', (req, res) => {
  const acceptLanguage = req.headers['accept-language'];
  let detected = DEFAULT_LANGUAGE;
  
  if (acceptLanguage) {
    const languages = acceptLanguage
      .split(',')
      .map(lang => {
        const [code, qValue] = lang.trim().split(';q=');
        return {
          code: code.split('-')[0].toLowerCase(),
          q: qValue ? parseFloat(qValue) : 1.0
        };
      })
      .sort((a, b) => b.q - a.q);
    
    // Mapper les codes vers nos langues supportées
    const mapping = {
      'fr': 'fr',
      'ar': 'ar',
      'en': 'en',
      'ber': 'tz-ltn',
      'kab': 'tz-ltn',
      'tzm': 'tz-ltn',
      'tmh': 'tz-tfng'
    };
    
    for (const { code } of languages) {
      const mapped = mapping[code] || code;
      if (SUPPORTED_LANGUAGES.includes(mapped)) {
        detected = mapped;
        break;
      }
    }
  }
  
  res.json({
    success: true,
    data: {
      detected,
      acceptLanguage,
      current: req.lang || DEFAULT_LANGUAGE,
      cookie: req.cookies?.language
    }
  });
});

// GET /api/languages/translations-status - Statut des traductions (admin)
router.get('/translations-status', async (req, res) => {
  // Cette route peut être utilisée pour afficher le pourcentage de traductions complètes
  // Pour l'instant, retourne juste les langues supportées
  res.json({
    success: true,
    data: {
      languages: SUPPORTED_LANGUAGES.map(lang => ({
        code: lang,
        label: {
          'fr': 'Français',
          'ar': 'العربية',
          'en': 'English',
          'tz-ltn': 'Tamazight (Latin)',
          'tz-tfng': 'ⵜⴰⵎⴰⵣⵉⵖⵜ (Tifinagh)'
        }[lang],
        isDefault: lang === DEFAULT_LANGUAGE
      }))
    }
  });
});

module.exports = router;
