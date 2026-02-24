// RTLManager.tsx amélioré
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { initializeAlgerianSite } from '@/utils/rtl';

const RTLManager = () => {
  const { i18n, ready } = useTranslation();
  
  useEffect(() => {
    // Si i18n n'est pas prêt, ne rien faire
    if (!ready || !i18n.language) {
      console.log('[RTLManager] i18n pas encore prêt');
      return;
    }
    
    // Utiliser la langue directement depuis i18n sans normalisation supplémentaire
    const currentLang = i18n.language;
    console.log('[RTLManager] Configuration pour la langue:', currentLang);
    
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
        loadArabicFonts();
        break;
        
      case 'tz-tfng':
        document.documentElement.classList.add('tifinagh-font');
        loadTifinaghFonts();
        break;
        
      // Autres langues: pas de configuration spéciale
      default:
        break;
    }
    
    // Mettre à jour les métadonnées
    updateMetaTags(currentLang);
    
    console.log('[RTLManager] Configuration appliquée - Langue:', currentLang, 'RTL:', isRTL);
    
  }, [i18n.language, ready]);
  
  return null;
};

// Fonction pour charger les polices arabes
const loadArabicFonts = () => {
  if (!document.getElementById('arabic-fonts')) {
    const link = document.createElement('link');
    link.id = 'arabic-fonts';
    link.href = 'https://fonts.googleapis.com/css2?family=Tajawal:wght@200;300;400;500;700;800;900&family=Cairo:wght@200;300;400;500;600;700;800;900&family=Noto+Kufi+Arabic:wght@100;200;300;400;500;600;700;800;900&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
};

// Fonction pour charger les polices Tifinagh
const loadTifinaghFonts = () => {
  if (!document.getElementById('tifinagh-fonts')) {
    const link = document.createElement('link');
    link.id = 'tifinagh-fonts';
    link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Tifinagh&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
};

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