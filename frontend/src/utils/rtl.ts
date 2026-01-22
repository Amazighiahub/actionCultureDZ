/**
 * Utilitaires pour la gestion RTL (Right-to-Left)
 * Support pour l'arabe et autres langues RTL
 * Configuration spéciale pour les sites algériens
 */

import * as React from 'react';

// Langues RTL supportées
/* eslint-disable @typescript-eslint/no-explicit-any */
export const RTL_LANGUAGES = ['ar', 'ar-DZ', 'he', 'fa', 'ur', 'ps', 'sd'] as const;
export type RTLLanguage = typeof RTL_LANGUAGES[number];

// Configuration par défaut pour un site algérien
export const DEFAULT_LOCALE = 'ar-DZ';
export const DEFAULT_DIRECTION = 'rtl';

// Vérifier si une langue est RTL
export const isRTL = (language: string): boolean => {
  return RTL_LANGUAGES.includes(language as RTLLanguage);
};

// Obtenir la direction d'une langue
export const getDirection = (language: string): 'rtl' | 'ltr' => {
  return isRTL(language) ? 'rtl' : 'ltr';
};

// Classes Tailwind pour RTL
export const rtlClasses = {
  // Marges
  marginStart: (value: string | number, isRtl: boolean) => 
    isRtl ? `mr-${value}` : `ml-${value}`,
  marginEnd: (value: string | number, isRtl: boolean) => 
    isRtl ? `ml-${value}` : `mr-${value}`,
  
  // Paddings
  paddingStart: (value: string | number, isRtl: boolean) => 
    isRtl ? `pr-${value}` : `pl-${value}`,
  paddingEnd: (value: string | number, isRtl: boolean) => 
    isRtl ? `pl-${value}` : `pr-${value}`,
  
  // Positions
  start: (value: string | number, isRtl: boolean) => 
    isRtl ? `right-${value}` : `left-${value}`,
  end: (value: string | number, isRtl: boolean) => 
    isRtl ? `left-${value}` : `right-${value}`,
  
  // Text alignment
  textStart: (isRtl: boolean) => 
    isRtl ? 'text-right' : 'text-left',
  textEnd: (isRtl: boolean) => 
    isRtl ? 'text-left' : 'text-right',
  
  // Flex direction
  flexRowReverse: (isRtl: boolean) => 
    isRtl ? 'flex-row-reverse' : 'flex-row',
  
  // Borders
  borderStart: (width: string | number, isRtl: boolean) => 
    isRtl ? `border-r-${width}` : `border-l-${width}`,
  borderEnd: (width: string | number, isRtl: boolean) => 
    isRtl ? `border-l-${width}` : `border-r-${width}`,
  
  // Rounded corners
  roundedStart: (size: string, isRtl: boolean) => 
    isRtl ? `rounded-r-${size}` : `rounded-l-${size}`,
  roundedEnd: (size: string, isRtl: boolean) => 
    isRtl ? `rounded-l-${size}` : `rounded-r-${size}`,
  
  // Transforms
  scaleX: (isRtl: boolean) => 
    isRtl ? 'scale-x-[-1]' : '',
  
  // Grid
  colStart: (value: string | number, isRtl: boolean) => 
    isRtl ? `col-end-${value}` : `col-start-${value}`,
  colEnd: (value: string | number, isRtl: boolean) => 
    isRtl ? `col-start-${value}` : `col-end-${value}`,
};

// Helper pour créer des classes conditionnelles RTL
export const rtl = (rtlClass: string, ltrClass: string, isRtl: boolean): string => {
  return isRtl ? rtlClass : ltrClass;
};

// Helper pour combiner des classes avec support RTL
export const rtlClassNames = (
  baseClasses: string,
  rtlSpecific: Record<string, boolean>,
  isRtl: boolean
): string => {
  const classes = [baseClasses];
  
  Object.entries(rtlSpecific).forEach(([className, condition]) => {
    if (condition) {
      classes.push(className);
    }
  });
  
  return classes.filter(Boolean).join(' ');
};

// Convertir les propriétés CSS logiques
export const logicalProperties = (isRtl: boolean) => ({
  // Margin
  marginInlineStart: isRtl ? 'marginRight' : 'marginLeft',
  marginInlineEnd: isRtl ? 'marginLeft' : 'marginRight',
  marginBlockStart: 'marginTop',
  marginBlockEnd: 'marginBottom',
  
  // Padding
  paddingInlineStart: isRtl ? 'paddingRight' : 'paddingLeft',
  paddingInlineEnd: isRtl ? 'paddingLeft' : 'paddingRight',
  paddingBlockStart: 'paddingTop',
  paddingBlockEnd: 'paddingBottom',
  
  // Position
  insetInlineStart: isRtl ? 'right' : 'left',
  insetInlineEnd: isRtl ? 'left' : 'right',
  insetBlockStart: 'top',
  insetBlockEnd: 'bottom',
  
  // Border
  borderInlineStart: isRtl ? 'borderRight' : 'borderLeft',
  borderInlineEnd: isRtl ? 'borderLeft' : 'borderRight',
  borderBlockStart: 'borderTop',
  borderBlockEnd: 'borderBottom',
  
  // Size
  inlineSize: 'width',
  blockSize: 'height',
  
  // Text
  textAlign: isRtl ? 'right' : 'left'
});

// Styles inline avec support RTL
export const rtlStyles = (isRtl: boolean) => ({
  // Conteneur avec direction
  container: {
    direction: isRtl ? 'rtl' as const : 'ltr' as const,
    textAlign: isRtl ? 'right' as const : 'left' as const
  },
  
  // Flex avec direction inversée
  flexReverse: {
    display: 'flex',
    flexDirection: isRtl ? 'row-reverse' as const : 'row' as const
  },
  
  // Icône avec rotation
  icon: {
    transform: isRtl ? 'scaleX(-1)' : 'none'
  },
  
  // Margin logique
  marginStart: (value: number) => ({
    [isRtl ? 'marginRight' : 'marginLeft']: `${value}px`
  }),
  
  marginEnd: (value: number) => ({
    [isRtl ? 'marginLeft' : 'marginRight']: `${value}px`
  }),
  
  // Padding logique
  paddingStart: (value: number) => ({
    [isRtl ? 'paddingRight' : 'paddingLeft']: `${value}px`
  }),
  
  paddingEnd: (value: number) => ({
    [isRtl ? 'paddingLeft' : 'paddingRight']: `${value}px`
  }),
  
  // Position absolue
  positionStart: (value: number) => ({
    position: 'absolute' as const,
    [isRtl ? 'right' : 'left']: `${value}px`
  }),
  
  positionEnd: (value: number) => ({
    position: 'absolute' as const,
    [isRtl ? 'left' : 'right']: `${value}px`
  })
});

// Type pour les propriétés RTL mappables
interface RTLMappableProps {
  marginLeft?: any;
  marginRight?: any;
  paddingLeft?: any;
  paddingRight?: any;
  left?: any;
  right?: any;
  [key: string]: any;
}

// Mapper les props pour les composants
export const mapRTLProps = <T extends RTLMappableProps>(
  props: T,
  isRtl: boolean
): T => {
  const mappedProps = { ...props } as T;
  
  // Mapper les marges
  if ('marginLeft' in props && isRtl) {
    (mappedProps as any).marginRight = props.marginLeft;
    delete (mappedProps as any).marginLeft;
  }
  if ('marginRight' in props && isRtl) {
    (mappedProps as any).marginLeft = props.marginRight;
    delete (mappedProps as any).marginRight;
  }
  
  // Mapper les paddings
  if ('paddingLeft' in props && isRtl) {
    (mappedProps as any).paddingRight = props.paddingLeft;
    delete (mappedProps as any).paddingLeft;
  }
  if ('paddingRight' in props && isRtl) {
    (mappedProps as any).paddingLeft = props.paddingRight;
    delete (mappedProps as any).paddingRight;
  }
  
  // Mapper les positions
  if ('left' in props && isRtl) {
    (mappedProps as any).right = props.left;
    delete (mappedProps as any).left;
  }
  if ('right' in props && isRtl) {
    (mappedProps as any).left = props.right;
    delete (mappedProps as any).right;
  }
  
  return mappedProps;
};

// Icônes directionnelles
export const directionalIcons = {
  chevronStart: (isRtl: boolean) => 
    isRtl ? 'ChevronRight' : 'ChevronLeft',
  chevronEnd: (isRtl: boolean) => 
    isRtl ? 'ChevronLeft' : 'ChevronRight',
  arrowStart: (isRtl: boolean) => 
    isRtl ? 'ArrowRight' : 'ArrowLeft',
  arrowEnd: (isRtl: boolean) => 
    isRtl ? 'ArrowLeft' : 'ArrowRight',
  caretStart: (isRtl: boolean) => 
    isRtl ? 'CaretRight' : 'CaretLeft',
  caretEnd: (isRtl: boolean) => 
    isRtl ? 'CaretLeft' : 'CaretRight'
};

// Helper pour les animations directionnelles
export const rtlAnimations = (isRtl: boolean) => ({
  slideInStart: isRtl ? 'slideInRight' : 'slideInLeft',
  slideInEnd: isRtl ? 'slideInLeft' : 'slideInRight',
  slideOutStart: isRtl ? 'slideOutRight' : 'slideOutLeft',
  slideOutEnd: isRtl ? 'slideOutLeft' : 'slideOutRight',
  fadeInStart: isRtl ? 'fadeInRight' : 'fadeInLeft',
  fadeInEnd: isRtl ? 'fadeInLeft' : 'fadeInRight'
});

// Configuration Tailwind pour RTL
export const tailwindRTLConfig = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      // Support des propriétés logiques CSS
      spacing: {
        'start-0': 'var(--spacing-start-0)',
        'start-1': 'var(--spacing-start-1)',
        'start-2': 'var(--spacing-start-2)',
        'start-3': 'var(--spacing-start-3)',
        'start-4': 'var(--spacing-start-4)',
        // ... continuer selon les besoins
      },
      // Polices arabes recommandées pour un site algérien
      fontFamily: {
        'arabic': ['Noto Kufi Arabic', 'Tajawal', 'Cairo', 'Amiri', 'sans-serif'],
        'arabic-display': ['Readex Pro', 'Tajawal', 'sans-serif'],
        'arabic-traditional': ['Amiri', 'Scheherazade New', 'serif'],
      }
    }
  },
  plugins: [
    // Plugin personnalisé pour RTL
    function({ addUtilities }: any) {
      const rtlUtilities = {
        '.dir-rtl': {
          direction: 'rtl'
        },
        '.dir-ltr': {
          direction: 'ltr'
        },
        // Utilités pour les marges logiques
        '.ms-auto': {
          marginInlineStart: 'auto'
        },
        '.me-auto': {
          marginInlineEnd: 'auto'
        },
        // Utilités pour les paddings logiques
        '.ps-0': {
          paddingInlineStart: '0'
        },
        '.pe-0': {
          paddingInlineEnd: '0'
        },
        // Rotation pour les icônes RTL
        '.rtl-rotate': {
          '[dir="rtl"] &': {
            transform: 'scaleX(-1)'
          }
        },
        // Styles spécifiques pour l'arabe algérien
        '.locale-ar-dz': {
          fontFamily: 'var(--font-arabic)',
          lineHeight: '1.8',
          letterSpacing: '0.02em'
        }
      };
      
      addUtilities(rtlUtilities);
    }
  ]
};

// Styles CSS globaux recommandés pour un site algérien
export const algerianSiteStyles = `
  /* Polices Google Fonts recommandées */
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@200;300;400;500;700;800;900&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@200;300;400;500;600;700;800;900&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@100;200;300;400;500;600;700;800;900&display=swap');
  
  :root {
    --font-arabic: 'Tajawal', 'Cairo', 'Noto Kufi Arabic', sans-serif;
    --font-arabic-display: 'Cairo', 'Tajawal', sans-serif;
  }
  
  /* Styles de base pour RTL */
  html[dir="rtl"] {
    font-family: var(--font-arabic);
  }
  
  /* Améliorer la lisibilité du texte arabe */
  html[lang="ar-DZ"] {
    font-size: 18px;
    line-height: 1.8;
  }
  
  /* Ajustements pour les titres */
  html[lang="ar-DZ"] h1,
  html[lang="ar-DZ"] h2,
  html[lang="ar-DZ"] h3,
  html[lang="ar-DZ"] h4,
  html[lang="ar-DZ"] h5,
  html[lang="ar-DZ"] h6 {
    font-family: var(--font-arabic-display);
    font-weight: 700;
    line-height: 1.5;
  }
  
  /* Styles pour les nombres arabes */
  .arabic-numerals {
    font-feature-settings: "numr";
  }
  
  /* Ajustements pour les formulaires RTL */
  html[dir="rtl"] input,
  html[dir="rtl"] textarea,
  html[dir="rtl"] select {
    text-align: right;
    font-family: var(--font-arabic);
  }
  
  /* Placeholder en RTL */
  html[dir="rtl"] input::placeholder,
  html[dir="rtl"] textarea::placeholder {
    text-align: right;
  }
`;

// Helper pour détecter le script d'écriture
export const getScriptDirection = (text: string): 'rtl' | 'ltr' => {
  // Regex pour détecter les caractères arabes
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  
  // Regex pour détecter les caractères hébreux
  const hebrewRegex = /[\u0590-\u05FF\uFB1D-\uFB4F]/;
  
  if (arabicRegex.test(text) || hebrewRegex.test(text)) {
    return 'rtl';
  }
  
  return 'ltr';
};

// Initialiser le document pour un site algérien
export const initializeAlgerianSite = (): void => {
  // Définir la direction RTL par défaut
  document.documentElement.dir = 'rtl';
  document.documentElement.lang = 'ar-DZ';

  // Ajouter les classes CSS nécessaires
  document.documentElement.classList.add('dir-rtl', 'locale-ar-dz');

  // Note: La direction RTL est gérée via l'attribut dir sur documentElement,
  // pas via la meta viewport (qui ne supporte pas l'attribut direction)
};

// Hook React pour la gestion RTL
export const useRTL = (language: string = DEFAULT_LOCALE) => {
  const isRtl = isRTL(language);
  
  React.useEffect(() => {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language, isRtl]);
  
  return {
    isRtl,
    direction: isRtl ? 'rtl' : 'ltr' as const,
    language,
    rtlClasses: {
      marginStart: (value: string | number) => rtlClasses.marginStart(value, isRtl),
      marginEnd: (value: string | number) => rtlClasses.marginEnd(value, isRtl),
      paddingStart: (value: string | number) => rtlClasses.paddingStart(value, isRtl),
      paddingEnd: (value: string | number) => rtlClasses.paddingEnd(value, isRtl),
      textStart: () => rtlClasses.textStart(isRtl),
      textEnd: () => rtlClasses.textEnd(isRtl),
    },
    formatNumber: (value: number) => formatNumber(value, language),
    formatCurrency: (value: number) => formatCurrency(value, language),
    formatDate: (date: Date) => formatDate(date, language),
  };
};

// Helper pour mélanger du texte RTL et LTR
export const bidirectionalText = (
  text: string,
  baseDirection: 'rtl' | 'ltr' = 'ltr'
): string => {
  // Ajouter les marqueurs de direction Unicode si nécessaire
  const rtlMark = '\u200F'; // Right-to-Left Mark
  const ltrMark = '\u200E'; // Left-to-Right Mark
  
  if (baseDirection === 'rtl') {
    return rtlMark + text;
  }
  
  return ltrMark + text;
};

// Convertisseurs de chiffres
const ARABIC_NUMERALS: Record<string, string> = {
  '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
  '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩',
  '.': '٫', ',': '٬'
};

const LATIN_NUMERALS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '٫': '.', '٬': ','
};

// Convertir les chiffres latins en arabes
export const toArabicNumerals = (text: string): string => {
  return text.replace(/[0-9.,]/g, (match) => ARABIC_NUMERALS[match] || match);
};

// Convertir les chiffres arabes en latins
export const toLatinNumerals = (text: string): string => {
  return text.replace(/[٠-٩٫٬]/g, (match) => LATIN_NUMERALS[match] || match);
};

// Helper pour formater automatiquement les nombres selon la langue
export const localizeNumber = (value: number | string, language: string): string => {
  const stringValue = value.toString();
  // Pour l'arabe et les sites algériens, toujours utiliser les chiffres arabes
  return ['ar', 'ar-DZ'].includes(language) ? toArabicNumerals(stringValue) : stringValue;
};

// Formater les nombres pour l'affichage (avec séparateurs de milliers)
export const formatNumber = (value: number, language: string): string => {
  // Pour l'arabe, utiliser les chiffres arabes avec les séparateurs appropriés
  if (['ar', 'ar-DZ'].includes(language)) {
    const formatted = value.toLocaleString('ar-DZ');
    return toArabicNumerals(formatted);
  }
  return value.toLocaleString(language);
};

// Formater les prix en dinars algériens
export const formatCurrency = (value: number, language: string = 'ar-DZ'): string => {
  if (['ar', 'ar-DZ'].includes(language)) {
    // Format: ٥٬٠٠٠ د.ج
    const formatted = value.toLocaleString('ar-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
    return toArabicNumerals(formatted);
  }
  return value.toLocaleString(language, {
    style: 'currency',
    currency: 'DZD'
  });
};

// Formater les dates en arabe
export const formatDate = (date: Date, language: string = 'ar-DZ'): string => {
  if (['ar', 'ar-DZ'].includes(language)) {
    const formatted = date.toLocaleDateString('ar-DZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    return toArabicNumerals(formatted);
  }
  return date.toLocaleDateString(language);
};

/**
 * Exemples d'utilisation pour un site algérien:
 * 
 * // Initialiser le site au chargement
 * initializeAlgerianSite();
 * 
 * // Dans un composant React
 * const { isRtl, formatNumber, formatCurrency } = useRTL('ar-DZ');
 * 
 * // Affichage des prix
 * const price = 5000;
 * console.log(formatCurrency(price)); // ٥٬٠٠٠ د.ج
 * 
 * // Affichage des nombres
 * const quantity = 123;
 * console.log(formatNumber(quantity)); // ١٢٣
 * 
 * // Classes conditionnelles
 * <div className={rtlClasses.marginStart(4, true)}> // mr-4 en RTL
 * 
 * // Icônes directionnelles
 * const ChevronIcon = directionalIcons.chevronEnd(true); // ChevronLeft en RTL
 */

// Jours de la semaine en arabe algérien
export const WEEKDAYS_AR_DZ = [
  'الأحد',    // Dimanche
  'الإثنين',  // Lundi
  'الثلاثاء', // Mardi
  'الأربعاء', // Mercredi
  'الخميس',   // Jeudi
  'الجمعة',   // Vendredi
  'السبت'     // Samedi
];

// Mois en arabe algérien
export const MONTHS_AR_DZ = [
  'جانفي',    // Janvier
  'فيفري',    // Février
  'مارس',     // Mars
  'أفريل',    // Avril
  'ماي',      // Mai
  'جوان',     // Juin
  'جويلية',   // Juillet
  'أوت',      // Août
  'سبتمبر',   // Septembre
  'أكتوبر',   // Octobre
  'نوفمبر',   // Novembre
  'ديسمبر'    // Décembre
];

// Formater une date complète en arabe algérien
export const formatFullDateArabic = (date: Date): string => {
  const day = date.getDate();
  const month = MONTHS_AR_DZ[date.getMonth()];
  const year = date.getFullYear();
  const weekday = WEEKDAYS_AR_DZ[date.getDay()];
  
  // Format: الأحد ١٥ جانفي ٢٠٢٤
  return `${weekday} ${toArabicNumerals(day.toString())} ${month} ${toArabicNumerals(year.toString())}`;
};

// Obtenir le nom du jour en arabe
export const getWeekdayNameArabic = (dayIndex: number): string => {
  return WEEKDAYS_AR_DZ[dayIndex % 7];
};

// Obtenir le nom du mois en arabe
export const getMonthNameArabic = (monthIndex: number): string => {
  return MONTHS_AR_DZ[monthIndex % 12];
};