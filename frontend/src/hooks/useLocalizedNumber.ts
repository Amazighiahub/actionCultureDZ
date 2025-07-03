import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';

/**
 * Hook pour la localisation des nombres avec support des chiffres arabes-indiens
 * et gestion des langues Tamazight
 */

type NumberFormat = 'decimal' | 'currency' | 'percent' | 'unit';

interface LocalizedNumberOptions {
  style?: NumberFormat;
  currency?: string;
  currencyDisplay?: 'symbol' | 'narrowSymbol' | 'code' | 'name';
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  notation?: 'standard' | 'scientific' | 'engineering' | 'compact';
  compactDisplay?: 'short' | 'long';
  unit?: string;
  unitDisplay?: 'short' | 'long' | 'narrow';
  signDisplay?: 'auto' | 'never' | 'always' | 'exceptZero';
}

// Mapping des codes de langue personnalisés vers les codes BCP 47 valides
const LOCALE_MAPPING: Record<string, string> = {
  'ar': 'ar-DZ',
  'ar-DZ': 'ar-DZ',
  'fr': 'fr-FR',
  'en': 'en-US',
  'tz-ltn': 'fr-FR', // Utilise le français comme fallback pour Tamazight Latin
  'tz-tfng': 'fr-FR', // Utilise le français comme fallback pour Tifinagh
};

// Systèmes de numération par langue
const NUMBERING_SYSTEMS: Record<string, string> = {
  'ar': 'arab', // Chiffres arabes-indiens ٠١٢٣٤٥٦٧٨٩
  'ar-DZ': 'arab',
  'fr': 'latn', // Chiffres latins 0123456789
  'en': 'latn',
  'tz-ltn': 'latn',
  'tz-tfng': 'latn' // Tifinagh utilise généralement les chiffres latins
};

// Convertisseur de chiffres latins vers arabes-indiens
const ARABIC_NUMERALS: Record<string, string> = {
  '0': '٠',
  '1': '١',
  '2': '٢',
  '3': '٣',
  '4': '٤',
  '5': '٥',
  '6': '٦',
  '7': '٧',
  '8': '٨',
  '9': '٩',
  '.': '٫', // Séparateur décimal arabe
  ',': '٬', // Séparateur de milliers arabe
};

// Convertisseur inverse (arabe vers latin)
const LATIN_NUMERALS: Record<string, string> = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
  '٫': '.',
  '٬': ',',
};

// Fonction pour convertir les nombres en chiffres arabes
const convertToArabicNumerals = (text: string): string => {
  return text.replace(/[0-9.,]/g, (match) => ARABIC_NUMERALS[match] || match);
};

// Fonction pour convertir les chiffres arabes en latins
const convertToLatinNumerals = (text: string): string => {
  return text.replace(/[٠-٩٫٬]/g, (match) => LATIN_NUMERALS[match] || match);
};

// Devise par défaut selon la langue
const DEFAULT_CURRENCIES: Record<string, string> = {
  'ar': 'DZD',
  'ar-DZ': 'DZD',
  'fr': 'DZD',
  'en': 'DZD',
  'tz-ltn': 'DZD',
  'tz-tfng': 'DZD'
};

// Unités de mesure courantes
const UNITS: Record<string, Record<string, string>> = {
  'fr': {
    meter: 'mètre',
    kilometer: 'kilomètre',
    gram: 'gramme',
    kilogram: 'kilogramme',
    liter: 'litre',
    degree: 'degré',
    percent: 'pourcent',
    day: 'jour',
    hour: 'heure',
    minute: 'minute',
    second: 'seconde'
  },
  'ar': {
    meter: 'متر',
    kilometer: 'كيلومتر',
    gram: 'غرام',
    kilogram: 'كيلوغرام',
    liter: 'لتر',
    degree: 'درجة',
    percent: 'بالمائة',
    day: 'يوم',
    hour: 'ساعة',
    minute: 'دقيقة',
    second: 'ثانية'
  },
  'en': {
    meter: 'meter',
    kilometer: 'kilometer',
    gram: 'gram',
    kilogram: 'kilogram',
    liter: 'liter',
    degree: 'degree',
    percent: 'percent',
    day: 'day',
    hour: 'hour',
    minute: 'minute',
    second: 'second'
  },
  'tz-ltn': {
    meter: 'lmitru',
    kilometer: 'akilumitr',
    gram: 'agram',
    kilogram: 'akilugram',
    liter: 'lalitr',
    degree: 'tafesna',
    percent: 'tamiḍi',
    day: 'ass',
    hour: 'tasragt',
    minute: 'tasdat',
    second: 'tasint'
  },
  'tz-tfng': {
    meter: 'ⵍⵎⵉⵜⵔⵓ',
    kilometer: 'ⴰⴽⵉⵍⵓⵎⵉⵜⵔ',
    gram: 'ⴰⴳⵔⴰⵎ',
    kilogram: 'ⴰⴽⵉⵍⵓⴳⵔⴰⵎ',
    liter: 'ⵍⴰⵍⵉⵜⵔ',
    degree: 'ⵜⴰⴼⵙⵏⴰ',
    percent: 'ⵜⴰⵎⵉⴹⵉ',
    day: 'ⴰⵙⵙ',
    hour: 'ⵜⴰⵙⵔⴰⴳⵜ',
    minute: 'ⵜⴰⵙⴷⴰⵜ',
    second: 'ⵜⴰⵙⵉⵏⵜ'
  }
};

// Formats de nombres courants
const NUMBER_FORMATS: Record<string, Record<string, string>> = {
  'fr': {
    thousand: 'mille',
    million: 'million',
    billion: 'milliard',
    approximately: 'environ',
    lessThan: 'moins de',
    moreThan: 'plus de',
    between: 'entre',
    and: 'et'
  },
  'ar': {
    thousand: 'ألف',
    million: 'مليون',
    billion: 'مليار',
    approximately: 'حوالي',
    lessThan: 'أقل من',
    moreThan: 'أكثر من',
    between: 'بين',
    and: 'و'
  },
  'en': {
    thousand: 'thousand',
    million: 'million',
    billion: 'billion',
    approximately: 'approximately',
    lessThan: 'less than',
    moreThan: 'more than',
    between: 'between',
    and: 'and'
  },
  'tz-ltn': {
    thousand: 'agim',
    million: 'amelyun',
    billion: 'amelyar',
    approximately: 'azal n',
    lessThan: 'ddaw n',
    moreThan: 'ugar n',
    between: 'gar',
    and: 'd'
  },
  'tz-tfng': {
    thousand: 'ⴰⴳⵉⵎ',
    million: 'ⴰⵎⵍⵢⵓⵏ',
    billion: 'ⴰⵎⵍⵢⴰⵔ',
    approximately: 'ⴰⵣⴰⵍ ⵏ',
    lessThan: 'ⴷⴷⴰⵡ ⵏ',
    moreThan: 'ⵓⴳⴰⵔ ⵏ',
    between: 'ⴳⴰⵔ',
    and: 'ⴷ'
  }
};

export const useLocalizedNumber = () => {
  const { i18n } = useTranslation();
  
  // Obtenir la locale valide pour Intl
  const getValidLocale = (language: string): string => {
    return LOCALE_MAPPING[language] || 'fr-FR';
  };
  
  const formatters = useMemo(() => {
    const language = i18n.language;
    const locale = getValidLocale(language);
    
    try {
      return {
        decimal: new Intl.NumberFormat(locale),
        currency: new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: DEFAULT_CURRENCIES[language] || 'DZD'
        }),
        percent: new Intl.NumberFormat(locale, {
          style: 'percent'
        }),
        compact: new Intl.NumberFormat(locale, {
          notation: 'compact',
          compactDisplay: 'short'
        }),
        compactLong: new Intl.NumberFormat(locale, {
          notation: 'compact',
          compactDisplay: 'long'
        })
      };
    } catch (error) {
      console.warn(`Failed to create formatter for locale ${locale}, falling back to fr-FR`, error);
      // Fallback en cas d'erreur
      const fallbackLocale = 'fr-FR';
      return {
        decimal: new Intl.NumberFormat(fallbackLocale),
        currency: new Intl.NumberFormat(fallbackLocale, {
          style: 'currency',
          currency: 'DZD'
        }),
        percent: new Intl.NumberFormat(fallbackLocale, {
          style: 'percent'
        }),
        compact: new Intl.NumberFormat(fallbackLocale, {
          notation: 'compact',
          compactDisplay: 'short'
        }),
        compactLong: new Intl.NumberFormat(fallbackLocale, {
          notation: 'compact',
          compactDisplay: 'long'
        })
      };
    }
  }, [i18n.language]);

  // Formater un nombre
  const formatNumber = (
    value: number,
    options: LocalizedNumberOptions = {}
  ): string => {
    const language = i18n.language;
    const locale = getValidLocale(language);
    
    const {
      style = 'decimal',
      currency = DEFAULT_CURRENCIES[language] || 'DZD',
      currencyDisplay = 'symbol',
      minimumFractionDigits,
      maximumFractionDigits,
      notation = 'standard',
      compactDisplay = 'short',
      unit,
      unitDisplay = 'short',
      signDisplay = 'auto'
    } = options;

    const formatOptions: Intl.NumberFormatOptions = {
      minimumFractionDigits,
      maximumFractionDigits,
      notation,
      signDisplay
    };

    let formatted = '';

    try {
      // Format selon le style
      switch (style) {
        case 'currency':
          formatted = new Intl.NumberFormat(locale, {
            ...formatOptions,
            style: 'currency',
            currency,
            currencyDisplay
          }).format(value);
          break;

        case 'percent':
          formatted = new Intl.NumberFormat(locale, {
            ...formatOptions,
            style: 'percent'
          }).format(value / 100);
          break;

        case 'unit':
          if (unit) {
            // Certaines unités peuvent ne pas être supportées dans toutes les locales
            try {
              formatted = new Intl.NumberFormat(locale, {
                ...formatOptions,
                style: 'unit',
                unit,
                unitDisplay
              }).format(value);
            } catch {
              // Fallback: formater le nombre et ajouter l'unité manuellement
              formatted = `${formatters.decimal.format(value)} ${unit}`;
            }
          } else {
            formatted = formatters.decimal.format(value);
          }
          break;

        default:
          if (notation === 'compact') {
            formatted = compactDisplay === 'long' 
              ? formatters.compactLong.format(value)
              : formatters.compact.format(value);
          } else {
            formatted = formatters.decimal.format(value);
          }
      }
    } catch (error) {
      console.warn('Error formatting number:', error);
      // Fallback basique
      formatted = value.toString();
    }

    // Convertir en chiffres arabes-indiens si la langue est l'arabe
    if (language === 'ar' || language === 'ar-DZ') {
      formatted = convertToArabicNumerals(formatted);
    }

    return formatted;
  };

  // Formater une plage de nombres
  const formatNumberRange = (
    min: number,
    max: number,
    options: LocalizedNumberOptions = {}
  ): string => {
    const formattedMin = formatNumber(min, options);
    const formattedMax = formatNumber(max, options);
    const translations = NUMBER_FORMATS[i18n.language] || NUMBER_FORMATS['fr'];
    
    return `${formattedMin} - ${formattedMax}`;
  };

  // Formater un nombre approximatif
  const formatApproximateNumber = (
    value: number,
    options: LocalizedNumberOptions = {}
  ): string => {
    const formatted = formatNumber(value, options);
    const translations = NUMBER_FORMATS[i18n.language] || NUMBER_FORMATS['fr'];
    
    return `${translations.approximately} ${formatted}`;
  };

  // Formater "moins de" ou "plus de"
  const formatThreshold = (
    value: number,
    type: 'lessThan' | 'moreThan',
    options: LocalizedNumberOptions = {}
  ): string => {
    const formatted = formatNumber(value, options);
    const translations = NUMBER_FORMATS[i18n.language] || NUMBER_FORMATS['fr'];
    
    return `${translations[type]} ${formatted}`;
  };

  // Formater un prix (avec gestion spéciale)
  const formatPrice = (
    value: number,
    currency: string = DEFAULT_CURRENCIES[i18n.language] || 'DZD',
    showFree: boolean = true
  ): string => {
    if (value === 0 && showFree) {
      switch (i18n.language) {
        case 'ar':
        case 'ar-DZ': 
          return 'مجاني';
        case 'en': 
          return 'Free';
        case 'tz-ltn': 
          return 'Baṭṭal';
        case 'tz-tfng': 
          return 'ⴱⴰⵟⵟⴰⵍ';
        default: 
          return 'Gratuit';
      }
    }
    
    return formatNumber(value, { 
      style: 'currency', 
      currency,
      maximumFractionDigits: currency === 'DZD' ? 0 : 2
    });
  };

  // Formater un pourcentage
  const formatPercentage = (
    value: number,
    decimals: number = 0
  ): string => {
    return formatNumber(value, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  // Formater une distance
  const formatDistance = (
    value: number,
    unit: 'meter' | 'kilometer' = 'kilometer'
  ): string => {
    const unitTranslations = UNITS[i18n.language] || UNITS['fr'];
    
    // Convertir en kilomètres si nécessaire
    if (unit === 'meter' && value >= 1000) {
      value = value / 1000;
      unit = 'kilometer';
    }
    
    const formatted = formatNumber(value, {
      minimumFractionDigits: unit === 'kilometer' ? 1 : 0,
      maximumFractionDigits: unit === 'kilometer' ? 1 : 0
    });
    
    return `${formatted} ${unitTranslations[unit]}`;
  };

  // Formater une durée
  const formatDuration = (
    value: number,
    unit: 'second' | 'minute' | 'hour' | 'day' = 'minute'
  ): string => {
    const unitTranslations = UNITS[i18n.language] || UNITS['fr'];
    
    // Convertir automatiquement dans l'unité la plus appropriée
    if (unit === 'second' && value >= 60) {
      value = value / 60;
      unit = 'minute';
    }
    if (unit === 'minute' && value >= 60) {
      value = value / 60;
      unit = 'hour';
    }
    if (unit === 'hour' && value >= 24) {
      value = value / 24;
      unit = 'day';
    }
    
    const formatted = formatNumber(value, {
      maximumFractionDigits: 0
    });
    
    // Gestion du pluriel pour le français
    if (i18n.language === 'fr' && value > 1) {
      return `${formatted} ${unitTranslations[unit]}s`;
    }
    
    return `${formatted} ${unitTranslations[unit]}`;
  };

  // Obtenir le séparateur décimal
  const getDecimalSeparator = (): string => {
    if (i18n.language === 'ar' || i18n.language === 'ar-DZ') {
      return '٫';
    }
    const formatted = formatters.decimal.format(1.1);
    return formatted.charAt(1);
  };

  // Obtenir le séparateur de milliers
  const getThousandsSeparator = (): string => {
    if (i18n.language === 'ar' || i18n.language === 'ar-DZ') {
      return '٬';
    }
    const formatted = formatters.decimal.format(1000);
    return formatted.charAt(1);
  };

  return {
    formatNumber,
    formatNumberRange,
    formatApproximateNumber,
    formatThreshold,
    formatPrice,
    formatPercentage,
    formatDistance,
    formatDuration,
    getDecimalSeparator,
    getThousandsSeparator,
    convertToArabicNumerals: (i18n.language === 'ar' || i18n.language === 'ar-DZ') ? convertToArabicNumerals : (text: string) => text,
    locale: i18n.language
  };
};