// RTLManager.tsx amélioré
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { initializeAlgerianSite } from '@/utils/rtl';

const RTLManager = () => {
  const { i18n, ready } = useTranslation();
  
  useEffect(() => {
    // Si i18n n'est pas prêt, ne rien faire
    if (!ready || !i18n.language) {
      return;
    }
    
    // Utiliser la langue directement depuis i18n sans normalisation supplémentaire
    const currentLang = i18n.language;
    
    // Langues RTL
    const rtlLanguages = ['ar', 'ar-DZ', 'he', 'fa', 'ur'];
    const isRTL = rtlLanguages.includes(currentLang);
    
    // Définir la direction
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;
    
    // Réinitialiser toutes les classes de langue
    const allLangClasses = [
      'lang-ar',
      'lang-fr', 
      'lang-en',
      'lang-tz-ltn',
      'lang-tz-tfng',
      'tifinagh-font',
      'font-arabic'
    ];
    
    document.documentElement.classList.remove(...allLangClasses);
    
    // Ajouter la classe de langue actuelle
    document.documentElement.classList.add(`lang-${currentLang}`);
    
    // Gestion spécifique par langue
    switch (currentLang) {
      case 'ar':
      case 'ar-DZ':
        document.documentElement.classList.add('font-arabic');
        initializeAlgerianSite();
        break;
        
      case 'tz-tfng':
        document.documentElement.classList.add('tifinagh-font');
        break;
        
      // Autres langues: pas de configuration spéciale
      default:
        break;
    }
    
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
    'fr': 'fr_FR',
    'en': 'en_US',
    'tz-ltn': 'ber_DZ',
    'tz-tfng': 'ber_DZ'
  };
  
  ogLocale.setAttribute('content', localeMap[language] || 'fr_FR');
};

export default RTLManager;