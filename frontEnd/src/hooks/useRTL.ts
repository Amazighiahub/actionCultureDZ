// hooks/useRTL.ts - Version corrigée avec gestion des cas undefined

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

// Fonction pour normaliser les codes de langue
const normalizeLanguageCode = (lang: string | undefined): string => {
  if (!lang || typeof lang !== 'string') {
    // Retourner français par défaut si la langue n'est pas définie
    return 'fr';
  }
  
  const lowercased = lang.toLowerCase();
  
  if (lowercased.startsWith('ar')) return 'ar';
  if (lowercased.startsWith('fr')) return 'fr';
  if (lowercased.startsWith('en')) return 'en';
  if (lowercased === 'tz' || lowercased.includes('tz-ltn')) return 'tz-ltn';
  if (lowercased.includes('tz-tfng')) return 'tz-tfng';
  
  return lang;
};

// Version principale du hook
export const useRTL = (languageParam?: string) => {
  const { i18n, ready } = useTranslation();
  
  // Utiliser le paramètre si fourni, sinon utiliser i18n.language
  const language = languageParam || i18n.language || localStorage.getItem('i18nextLng') || 'fr';
  
  // Normaliser le code de langue
  const normalizedLang = normalizeLanguageCode(language);
  
  const isRtl = ['ar', 'ar-DZ', 'he', 'fa', 'ur'].includes(normalizedLang);
  const direction = isRtl ? 'rtl' : 'ltr' as const;
  
  // Classes pré-calculées basées sur isRtl
  const rtlClasses = useMemo(() => ({
    // Text alignment
    textStart: isRtl ? 'text-right' : 'text-left',
    textEnd: isRtl ? 'text-left' : 'text-right',
    textCenter: 'text-center',
    
    // Margins
    marginStart: (value: number | string) => {
      if (typeof value === 'string') {
        return isRtl ? `mr-${value}` : `ml-${value}`;
      }
      return isRtl ? `mr-${value}` : `ml-${value}`;
    },
    marginEnd: (value: number | string) => {
      if (typeof value === 'string') {
        return isRtl ? `ml-${value}` : `mr-${value}`;
      }
      return isRtl ? `ml-${value}` : `mr-${value}`;
    },
    
    // Paddings
    paddingStart: (value: number | string) => {
      if (typeof value === 'string') {
        return isRtl ? `pr-${value}` : `pl-${value}`;
      }
      return isRtl ? `pr-${value}` : `pl-${value}`;
    },
    paddingEnd: (value: number | string) => {
      if (typeof value === 'string') {
        return isRtl ? `pl-${value}` : `pr-${value}`;
      }
      return isRtl ? `pl-${value}` : `pr-${value}`;
    },
    
    // Flex
    flexRow: isRtl ? 'flex-row-reverse' : 'flex-row',
    flexRowReverse: isRtl ? 'flex-row' : 'flex-row-reverse',
    
    // Position
    start: (value: number | string) => {
      if (typeof value === 'string') {
        return isRtl ? `right-${value}` : `left-${value}`;
      }
      return isRtl ? `right-${value}` : `left-${value}`;
    },
    end: (value: number | string) => {
      if (typeof value === 'string') {
        return isRtl ? `left-${value}` : `right-${value}`;
      }
      return isRtl ? `left-${value}` : `right-${value}`;
    },
    
    // Rounded corners
    roundedStart: (size: string) => isRtl ? `rounded-r-${size}` : `rounded-l-${size}`,
    roundedEnd: (size: string) => isRtl ? `rounded-l-${size}` : `rounded-r-${size}`,
  }), [isRtl]);
  
  return {
    isRtl,
    rtlClasses,
    direction,
    language: normalizedLang,
    originalLanguage: language,
    isReady: ready,
  };
};

// Hook utilitaire pour obtenir uniquement la direction
export const useDirection = () => {
  const { direction } = useRTL();
  return direction;
};

// Hook utilitaire pour obtenir uniquement le statut RTL
export const useIsRTL = () => {
  const { isRtl } = useRTL();
  return isRtl;
};

// Export par défaut
export default useRTL;