import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { initializeAlgerianSite } from '@/utils/rtl';

const RTLManager = () => {
  const { i18n, ready } = useTranslation();
  
  useEffect(() => {
    // Si i18n n'est pas prêt, ne rien faire
    if (!ready || !i18n.language) {
      console.log('[RTLManager] i18n pas encore prêt, langue:', i18n.language);
      return;
    }
    
    // Normaliser le code de langue avec vérification
    const normalizeLanguage = (lang: string | undefined): string => {
      // Vérifier que lang existe
      if (!lang || typeof lang !== 'string') {
        console.log('[RTLManager] Langue non définie, utilisation du français');
        return 'fr';
      }
      
      const langLower = lang.toLowerCase();
      
      if (langLower.startsWith('ar')) return 'ar';
      if (langLower.startsWith('fr')) return 'fr';
      if (langLower.startsWith('en')) return 'en';
      if (langLower === 'tz' || langLower.includes('tz-ltn')) return 'tz-ltn';
      if (langLower.includes('tz-tfng')) return 'tz-tfng';
      
      return lang;
    };
    
    const normalizedLang = normalizeLanguage(i18n.language);
    
    // Langues RTL
    const rtlLanguages = ['ar', 'ar-DZ', 'he', 'fa', 'ur'];
    const isRTL = rtlLanguages.includes(normalizedLang);
    
    // Définir la direction
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = normalizedLang;
    
    // Réinitialiser toutes les classes de langue
    document.documentElement.classList.remove(
      'lang-ar',
      'lang-fr', 
      'lang-en',
      'lang-tz-ltn',
      'lang-tz-tfng',
      'tifinagh-font',
      'font-arabic'
    );
    
    // Ajouter la classe de langue actuelle
    document.documentElement.classList.add(`lang-${normalizedLang}`);
    
    // Gestion spécifique par langue
    switch (normalizedLang) {
      case 'ar':
        // Pour l'arabe algérien
        document.documentElement.classList.add('font-arabic');
        initializeAlgerianSite();
        // Charger les polices arabes
        loadArabicFonts();
        break;
        
      case 'tz-tfng':
        // Pour le Tifinagh
        document.documentElement.classList.add('tifinagh-font');
        loadTifinaghFonts();
        break;
        
      case 'tz-ltn':
        // Pour le Tamazight latin
        // Pas de police spéciale nécessaire, utilise les polices latines
        break;
        
      case 'fr':
      case 'en':
      default:
        // Langues latines standard
        break;
    }
    
    // Mettre à jour les métadonnées
    updateMetaTags(normalizedLang);
    
    console.log('[RTLManager] Configuration appliquée pour:', normalizedLang, 'RTL:', isRTL);
    
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
    // Vous pouvez utiliser Noto Sans Tifinagh ou d'autres polices Tifinagh
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
    'tz-ltn': 'ber_DZ', // Code ISO pour Berbère/Tamazight
    'tz-tfng': 'ber_DZ'
  };
  
  ogLocale.setAttribute('content', localeMap[language] || 'fr_FR');
};

export default RTLManager;