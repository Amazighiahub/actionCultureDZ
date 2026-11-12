// hooks/useRTL.ts - Version corrigée avec gestion des cas undefined

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { directionLangue } from '@/types/common/multilingual.types';

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
  
  // Sens d'écriture : la liste commune des langues du site (multilingual.types.ts), plus de copie ici
  const direction = directionLangue(normalizedLang);
  const isRtl = direction === 'rtl';
  
  // Classes pré-calculées basées sur isRtl
  const rtlClasses = useMemo(() => ({
    // Classes logiques (début / fin du texte), justes dans les deux sens d'écriture. Avant : mr-/ml-,
    // pr-/pl-, text-right/left selon la langue — or index.css retourne déjà ces classes en arabe :
    // marges et alignements repassaient du mauvais côté (inversés deux fois).
    textStart: 'text-start',
    textEnd: 'text-end',
    textCenter: 'text-center',
    
    // Margins
    marginStart: (value: number | string) => `ms-${value}`,
    marginEnd: (value: number | string) => `me-${value}`,
    
    // Paddings
    paddingStart: (value: number | string) => `ps-${value}`,
    paddingEnd: (value: number | string) => `pe-${value}`,
    
    // Flex
    // dir="rtl" (posé sur <html>) inverse déjà les rangées flex : ajouter flex-row-reverse
    // en arabe les remettait dans l'ordre du français
    flexRow: 'flex-row',
    flexRowReverse: 'flex-row-reverse',
    
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

// Export par défaut
export default useRTL;