// hooks/useLanguage.ts
import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useState } from 'react';
import { changeLanguage as changeLanguageConfig } from '../../i18n/config';

export interface Language {
  code: string;
  name: string;
  flag: string;
  dir: 'ltr' | 'rtl';
}

const LANGUAGES: Language[] = [
  { code: 'ar', name: 'العربية', flag: '🇩🇿', dir: 'rtl' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'en', name: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'tz-ltn', name: 'Tamaziɣt', flag: 'ⵣ', dir: 'ltr' },
  { code: 'tz-tfng', name: 'ⵜⴰⵎⴰⵣⵉⵖⵜ', flag: '⵿', dir: 'ltr' },
];

const normalizeLanguageCode = (code: string | undefined): string => {
  if (!code || typeof code !== 'string') {
    return 'fr'; // Français par défaut
  }
  
  const codeLower = code.toLowerCase();
  
  // Normaliser les variations
  if (codeLower.startsWith('ar')) return 'ar';
  if (codeLower.startsWith('fr')) return 'fr';
  if (codeLower.startsWith('en')) return 'en';
  if (codeLower === 'tz' || codeLower === 'tz-ltn' || codeLower === 'tz_ltn') return 'tz-ltn';
  if (codeLower === 'tz-tfng' || codeLower === 'tz_tfng') return 'tz-tfng';
  
  return 'fr'; // Fallback
};

export const useLanguage = () => {
  const { i18n } = useTranslation();
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Obtenir la langue actuelle normalisée
  const currentLanguageCode = normalizeLanguageCode(i18n.language);
  const currentLanguage = LANGUAGES.find(lang => lang.code === currentLanguageCode) || LANGUAGES[1];
  
  // Fonction pour changer la langue
  const changeLanguage = useCallback(async (langCode: string) => {
    setIsChanging(true);
    setError(null);
    
    try {
      const normalizedCode = normalizeLanguageCode(langCode);
      
      await changeLanguageConfig(normalizedCode);
      
      // Mettre à jour les attributs HTML
      document.documentElement.lang = normalizedCode;
      document.documentElement.dir = normalizedCode === 'ar' ? 'rtl' : 'ltr';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      
      // Fallback : recharger la page
      localStorage.setItem('i18nextLng', normalizeLanguageCode(langCode));
      window.location.reload();
    } finally {
      setIsChanging(false);
    }
  }, []);
  
  // Effet pour synchroniser la direction du texte
  useEffect(() => {
    document.documentElement.dir = currentLanguage.dir;
    document.documentElement.lang = currentLanguage.code;
  }, [currentLanguage]);
  
  return {
    currentLanguage,
    currentLanguageCode,
    languages: LANGUAGES,
    changeLanguage,
    isChanging,
    error,
    isRtl: currentLanguage.dir === 'rtl',
  };
};

// Hook pour obtenir uniquement la direction
export const useDirection = () => {
  const { currentLanguage } = useLanguage();
  return currentLanguage.dir;
};