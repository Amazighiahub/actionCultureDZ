// i18n/config-simple.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import direct des traductions
import arTranslation from './locales/ar/translation.json';
import frTranslation from './locales/fr/translation.json';
import enTranslation from './locales/en/translation.json';
import tzLtnTranslation from './locales/tz-ltn/translation.json';
import tzTfngTranslation from './locales/tz-tfng/translation.json';

// Liste des langues supportées (TOUJOURS en minuscules)
const supportedLanguages = ['ar', 'fr', 'en', 'tz-ltn', 'tz-tfng'];

// Normaliser TOUJOURS en minuscules
const normalizeLanguage = (lang: string | null | undefined): string => {
  if (!lang) return 'fr';
  
  // Forcer en minuscules et nettoyer
  const normalized = lang.toLowerCase().trim();
  
  // Vérifier si supporté
  if (supportedLanguages.includes(normalized)) {
    return normalized;
  }
  
  // Gérer les cas spéciaux
  if (normalized.startsWith('ar')) return 'ar';
  if (normalized.startsWith('fr')) return 'fr';
  if (normalized.startsWith('en')) return 'en';
  
  return 'fr'; // Fallback
};

// Obtenir la langue initiale
const getInitialLanguage = (): string => {
  // 1. Vérifier le localStorage
  const stored = localStorage.getItem('i18nextLng');
  if (stored) {
    const normalized = normalizeLanguage(stored);
    // Corriger le localStorage si nécessaire
    if (stored !== normalized) {
      console.log(`[i18n] Correction du localStorage: ${stored} -> ${normalized}`);
      localStorage.setItem('i18nextLng', normalized);
    }
    return normalized;
  }
  
  // 2. Utiliser le navigateur
  const browserLang = navigator.language?.split('-')[0];
  return normalizeLanguage(browserLang);
};

// Configuration minimale sans LanguageDetector
i18n
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: arTranslation },
      fr: { translation: frTranslation },
      en: { translation: enTranslation },
      'tz-ltn': { translation: tzLtnTranslation },
      'tz-tfng': { translation: tzTfngTranslation },
    },
    
    lng: getInitialLanguage(), // Définir la langue initiale explicitement
    fallbackLng: 'fr',
    debug: false, // Désactiver le debug pour moins de bruit
    
    interpolation: {
      escapeValue: false
    },
    
    supportedLngs: supportedLanguages,
    load: 'currentOnly',
    cleanCode: false,
    lowerCaseLng: true, // Forcer en minuscules
    
    react: {
      useSuspense: false,
    },
  });

// Intercepter TOUS les changements de langue pour forcer la normalisation
const originalChangeLanguage = i18n.changeLanguage.bind(i18n);
i18n.changeLanguage = async (lng: string | undefined, callback?: any) => {
  if (!lng) return originalChangeLanguage(lng, callback);
  
  const normalized = normalizeLanguage(lng);
  console.log(`[i18n] changeLanguage intercepté: ${lng} -> ${normalized}`);
  
  // Toujours sauvegarder la version normalisée
  localStorage.setItem('i18nextLng', normalized);
  
  // Mettre à jour le DOM
  document.documentElement.lang = normalized;
  document.documentElement.dir = normalized === 'ar' ? 'rtl' : 'ltr';
  
  return originalChangeLanguage(normalized, callback);
};

// Fonction publique pour changer de langue
export const changeLanguage = (langCode: string): void => {
  i18n.changeLanguage(langCode);
};

// Fonction pour obtenir la langue actuelle (toujours normalisée)
export const getCurrentLanguage = (): string => {
  return normalizeLanguage(i18n.language);
};

// Fonction pour obtenir toutes les langues disponibles
export const getAvailableLanguages = () => [
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'fr', label: 'Français', dir: 'ltr' },
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'tz-ltn', label: 'Tamaziɣt', dir: 'ltr' },
  { code: 'tz-tfng', label: 'ⵜⴰⵎⴰⵣⵉⵖⵜ', dir: 'ltr' }
];

// Nettoyer au démarrage
const cleanup = () => {
  // Nettoyer localStorage
  const stored = localStorage.getItem('i18nextLng');
  if (stored && stored !== stored.toLowerCase()) {
    console.log(`[i18n] Nettoyage au démarrage: ${stored} -> ${stored.toLowerCase()}`);
    localStorage.setItem('i18nextLng', stored.toLowerCase());
  }
  
  // Nettoyer sessionStorage aussi
  const sessionStored = sessionStorage.getItem('i18nextLng');
  if (sessionStored) {
    sessionStorage.removeItem('i18nextLng');
    console.log('[i18n] SessionStorage nettoyé');
  }
  
  // S'assurer que le HTML est synchronisé
  const currentLang = getCurrentLanguage();
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
};

// Exécuter le nettoyage
cleanup();

// Exposer globalement pour le debug (dev seulement)
if (import.meta.env.DEV) {
  (window as any).i18nDebug = {
    current: () => i18n.language,
    normalized: () => getCurrentLanguage(),
    stored: () => localStorage.getItem('i18nextLng'),
    changeLanguage,
    cleanup,
  };
}

export default i18n;