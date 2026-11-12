// RTLManager.tsx : classes de langue et de police sur <html>, métadonnées de langue.
// <html lang dir> est posé par i18n/config.ts (appliquerLangueDocument), seul endroit (audit V11 COD-3).
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGE_FONT_CLASSES, SUPPORTED_LANGUAGES, estLangueSupportee } from '@/types/common/multilingual.types';

// Classes posées par ce composant, retirées à chaque changement de langue
const CLASSES_LANGUE = [
  ...SUPPORTED_LANGUAGES.map(l => `lang-${l}`),
  ...Object.values(LANGUAGE_FONT_CLASSES).filter((c): c is string => !!c),
];

const RTLManager = () => {
  const { i18n, ready } = useTranslation();

  useEffect(() => {
    // Si i18n n'est pas prêt, ne rien faire
    if (!ready || !i18n.language) {
      return;
    }

    const currentLang = i18n.language;
    const html = document.documentElement;

    // Réinitialiser puis ajouter la classe de langue et la police (arabe, tifinagh)
    html.classList.remove(...CLASSES_LANGUE);
    html.classList.add(`lang-${currentLang}`);
    const police = estLangueSupportee(currentLang) ? LANGUAGE_FONT_CLASSES[currentLang] : undefined;
    if (police) html.classList.add(police);

    // Mettre à jour les métadonnées
    updateMetaTags(currentLang);
  }, [i18n.language, ready]);

  return null;
};

// Polices arabes et tifinagh : hébergées localement (src/styles/fonts.ts), plus de chargement Google Fonts

// Fonction pour mettre à jour les métadonnées SEO
const updateMetaTags = (language: string) => {
  // Mettre à jour la balise meta language
  let metaLang = document.querySelector('meta[name="language"]');
  if (!metaLang) {
    metaLang = document.createElement('meta');
    metaLang.setAttribute('name', 'language');
    document.head.appendChild(metaLang);
  }
  metaLang.setAttribute('content', language);
  
  // Mettre à jour Open Graph locale
  let ogLocale = document.querySelector('meta[property="og:locale"]');
  if (!ogLocale) {
    ogLocale = document.createElement('meta');
    ogLocale.setAttribute('property', 'og:locale');
    document.head.appendChild(ogLocale);
  }
  
  const localeMap: Record<string, string> = {
    'ar': 'ar_DZ',
    'ar-DZ': 'ar_DZ',
    'fr': 'fr_DZ',
    'en': 'en_US',
    'tz-ltn': 'ber_DZ',
    'tz-tfng': 'ber_DZ'
  };
  
  ogLocale.setAttribute('content', localeMap[language] || 'fr_FR');
};

export default RTLManager;