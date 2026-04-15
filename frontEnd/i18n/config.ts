// i18n/config.ts - Version corrigée
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import UNIQUEMENT le français (langue par défaut) — les autres sont lazy-loaded
import frTranslation from './locales/fr/translation.json';

// Liste des langues supportées
const supportedLanguages = ['ar', 'fr', 'en', 'tz-ltn', 'tz-tfng'];

// Chargeurs dynamiques pour les autres langues (code splitting)
const lazyTranslations: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  ar: () => import('./locales/ar/translation.json'),
  en: () => import('./locales/en/translation.json'),
  'tz-ltn': () => import('./locales/tz-ltn/translation.json'),
  'tz-tfng': () => import('./locales/tz-tfng/translation.json'),
};

// Normaliser la langue - Version simplifiée
const normalizeLanguage = (lang: string | null | undefined): string => {
  if (!lang) return 'fr';

  const cleaned = lang.trim().toLowerCase();

  // Liste exacte des langues supportées
  const validLanguages = ['ar', 'fr', 'en', 'tz-ltn', 'tz-tfng'];

  // Si c'est une langue valide, la retourner directement
  if (validLanguages.includes(cleaned)) {
    return cleaned;
  }

  // Gérer les variantes
  if (cleaned.startsWith('ar')) return 'ar';
  if (cleaned.startsWith('fr')) return 'fr';
  if (cleaned.startsWith('en')) return 'en';

  console.log(`[i18n] Langue non reconnue: "${lang}" -> fallback fr`);
  return 'fr';
};

// Obtenir la langue initiale
const getInitialLanguage = (): string => {
  // 1. Vérifier le localStorage
  const stored = localStorage.getItem('i18nextLng');
  if (stored) {
    return normalizeLanguage(stored);
  }

  // 2. Utiliser le navigateur
  const browserLang = navigator.language?.split('-')[0];
  return normalizeLanguage(browserLang);
};

// Configuration sans forcer les minuscules partout
i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: frTranslation },
    },

    lng: getInitialLanguage(),
    fallbackLng: 'fr',
    debug: import.meta.env.DEV,

    interpolation: {
      escapeValue: false
    },

    supportedLngs: supportedLanguages,
    load: 'currentOnly',
    cleanCode: true,
    lowerCaseLng: true, // Forcer en minuscules pour éviter tz-Tfng vs tz-tfng

    react: {
      useSuspense: false,
    },
  });

/** Charge dynamiquement les traductions d'une langue (si pas encore chargée) */
async function loadLanguage(lang: string): Promise<void> {
  if (i18n.hasResourceBundle(lang, 'translation')) return;
  const loader = lazyTranslations[lang];
  if (!loader) return;
  const module = await loader();
  i18n.addResourceBundle(lang, 'translation', module.default, true, true);
}

// Intercepter les changements de langue pour la persistance
const originalChangeLanguage = i18n.changeLanguage.bind(i18n);
i18n.changeLanguage = async (lng: string | undefined, callback?: any) => {
  if (!lng) return originalChangeLanguage(lng, callback);

  // IMPORTANT: Forcer en minuscules pour tz-tfng et tz-ltn
  const normalized = lng.trim().toLowerCase();

  // Charger dynamiquement les traductions si nécessaire
  await loadLanguage(normalized);

  // Sauvegarder la version normalisée
  localStorage.setItem('i18nextLng', normalized);

  // Mettre à jour le DOM
  document.documentElement.lang = normalized;
  document.documentElement.dir = normalized === 'ar' ? 'rtl' : 'ltr';

  // ⚡ AJOUT : Sync avec backend (optionnel - stocke en cookie)
  try {
    const apiUrl = import.meta.env.VITE_API_URL || '/api';
    await fetch(`${apiUrl}/set-language`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang: normalized }),
      credentials: 'include'
    });
  } catch (e) {
    // Silencieux - pas critique
  }

  return originalChangeLanguage(normalized, callback);
};

// Fonction publique pour changer de langue
export const changeLanguage = (langCode: string): void => {
  i18n.changeLanguage(langCode);
};

// Fonction pour obtenir la langue actuelle
export const getCurrentLanguage = (): string => {
  return i18n.language;
};

// Fonction pour obtenir toutes les langues disponibles
export const getAvailableLanguages = () => [
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'fr', label: 'Français', dir: 'ltr' },
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'tz-ltn', label: 'Tamaziɣt', dir: 'ltr' },
  { code: 'tz-tfng', label: 'ⵜⴰⵎⴰⵣⵉⵖⵜ', dir: 'ltr' }
];

// Initialisation au démarrage
const initialize = async () => {
  const currentLang = getCurrentLanguage();
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';

  // Si la langue initiale n'est pas FR, charger ses traductions dynamiquement
  if (currentLang !== 'fr') {
    await loadLanguage(currentLang);
    await originalChangeLanguage(currentLang);
  }
};

// Exécuter l'initialisation
initialize();

// Exposer globalement pour le debug (dev seulement)
if (import.meta.env.DEV) {
  (window as any).i18nDebug = {
    current: () => i18n.language,
    stored: () => localStorage.getItem('i18nextLng'),
    changeLanguage,
  };
}

export default i18n;