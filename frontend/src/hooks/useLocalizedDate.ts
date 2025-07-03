import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';

type DateFormat = 'short' | 'medium' | 'long' | 'full';
type TimeFormat = 'short' | 'medium' | 'long';

interface LocalizedDateOptions {
  dateStyle?: DateFormat;
  timeStyle?: TimeFormat;
  showTime?: boolean;
  relative?: boolean;
  calendar?: boolean;
}

// Calendriers locaux
const CALENDAR_SYSTEMS: Record<string, string> = {
  'ar': 'islamic-civil', // Calendrier Hégirien pour l'arabe
  'fr': 'gregory',
  'en': 'gregory',
  'tz-ltn': 'gregory',
  'tz-tfng': 'gregory'
};

// Formats de date personnalisés par langue
const DATE_FORMATS: Record<string, Record<DateFormat, Intl.DateTimeFormatOptions>> = {
  'ar': {
    short: { day: 'numeric', month: 'numeric', year: 'numeric' },
    medium: { day: 'numeric', month: 'short', year: 'numeric' },
    long: { day: 'numeric', month: 'long', year: 'numeric' },
    full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
  },
  'fr': {
    short: { day: '2-digit', month: '2-digit', year: 'numeric' },
    medium: { day: 'numeric', month: 'short', year: 'numeric' },
    long: { day: 'numeric', month: 'long', year: 'numeric' },
    full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
  },
  'en': {
    short: { month: '2-digit', day: '2-digit', year: 'numeric' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { month: 'long', day: 'numeric', year: 'numeric' },
    full: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
  },
  'tz-ltn': {
    short: { day: '2-digit', month: '2-digit', year: 'numeric' },
    medium: { day: 'numeric', month: 'short', year: 'numeric' },
    long: { day: 'numeric', month: 'long', year: 'numeric' },
    full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
  },
  'tz-tfng': {
    short: { day: '2-digit', month: '2-digit', year: 'numeric' },
    medium: { day: 'numeric', month: 'short', year: 'numeric' },
    long: { day: 'numeric', month: 'long', year: 'numeric' },
    full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
  }
};

// Traductions pour les dates relatives
const RELATIVE_TIME_TRANSLATIONS: Record<string, Record<string, string>> = {
  'fr': {
    today: "Aujourd'hui",
    yesterday: 'Hier',
    tomorrow: 'Demain',
    thisWeek: 'Cette semaine',
    lastWeek: 'Semaine dernière',
    nextWeek: 'Semaine prochaine',
    thisMonth: 'Ce mois',
    lastMonth: 'Mois dernier',
    nextMonth: 'Mois prochain',
    daysAgo: 'il y a {count} jours',
    inDays: 'dans {count} jours',
    monthsAgo: 'il y a {count} mois',
    inMonths: 'dans {count} mois',
    yearsAgo: 'il y a {count} ans',
    inYears: 'dans {count} ans'
  },
  'ar': {
    today: 'اليوم',
    yesterday: 'أمس',
    tomorrow: 'غداً',
    thisWeek: 'هذا الأسبوع',
    lastWeek: 'الأسبوع الماضي',
    nextWeek: 'الأسبوع القادم',
    thisMonth: 'هذا الشهر',
    lastMonth: 'الشهر الماضي',
    nextMonth: 'الشهر القادم',
    daysAgo: 'منذ {count} أيام',
    inDays: 'بعد {count} أيام',
    monthsAgo: 'منذ {count} أشهر',
    inMonths: 'بعد {count} أشهر',
    yearsAgo: 'منذ {count} سنوات',
    inYears: 'بعد {count} سنوات'
  },
  'en': {
    today: 'Today',
    yesterday: 'Yesterday',
    tomorrow: 'Tomorrow',
    thisWeek: 'This week',
    lastWeek: 'Last week',
    nextWeek: 'Next week',
    thisMonth: 'This month',
    lastMonth: 'Last month',
    nextMonth: 'Next month',
    daysAgo: '{count} days ago',
    inDays: 'in {count} days',
    monthsAgo: '{count} months ago',
    inMonths: 'in {count} months',
    yearsAgo: '{count} years ago',
    inYears: 'in {count} years'
  },
  'tz-ltn': {
    today: 'Assa',
    yesterday: 'Iḍelli',
    tomorrow: 'Azekka',
    thisWeek: 'Imalas-a',
    lastWeek: 'Imalas iεeddan',
    nextWeek: 'Imalas d-iteddun',
    thisMonth: 'Aggur-a',
    lastMonth: 'Aggur iεeddan',
    nextMonth: 'Aggur d-iteddun',
    daysAgo: '{count} wussan aya',
    inDays: 'deg {count} wussan',
    monthsAgo: '{count} wagguren aya',
    inMonths: 'deg {count} wagguren',
    yearsAgo: '{count} iseggasen aya',
    inYears: 'deg {count} iseggasen'
  },
  'tz-tfng': {
    today: 'ⴰⵙⵙⴰ',
    yesterday: 'ⵉⴹⵍⵍⵉ',
    tomorrow: 'ⴰⵣⴽⴽⴰ',
    thisWeek: 'ⵉⵎⴰⵍⴰⵙ-ⴰ',
    lastWeek: 'ⵉⵎⴰⵍⴰⵙ ⵉⵄⴷⴷⴰⵏ',
    nextWeek: 'ⵉⵎⴰⵍⴰⵙ ⴷ-ⵉⵜⴷⴷⵓⵏ',
    thisMonth: 'ⴰⴳⴳⵓⵔ-ⴰ',
    lastMonth: 'ⴰⴳⴳⵓⵔ ⵉⵄⴷⴷⴰⵏ',
    nextMonth: 'ⴰⴳⴳⵓⵔ ⴷ-ⵉⵜⴷⴷⵓⵏ',
    daysAgo: '{count} ⵡⵓⵙⵙⴰⵏ ⴰⵢⴰ',
    inDays: 'ⴷⴳ {count} ⵡⵓⵙⵙⴰⵏ',
    monthsAgo: '{count} ⵡⴰⴳⴳⵓⵔⵏ ⴰⵢⴰ',
    inMonths: 'ⴷⴳ {count} ⵡⴰⴳⴳⵓⵔⵏ',
    yearsAgo: '{count} ⵉⵙⴳⴳⴰⵙⵏ ⴰⵢⴰ',
    inYears: 'ⴷⴳ {count} ⵉⵙⴳⴳⴰⵙⵏ'
  }
};

export const useLocalizedDate = () => {
  const { i18n, t } = useTranslation();
  
  const formatters = useMemo(() => {
    const locale = i18n.language;
    const formats = DATE_FORMATS[locale] || DATE_FORMATS['fr'];
    
    return {
      short: new Intl.DateTimeFormat(locale, formats.short),
      medium: new Intl.DateTimeFormat(locale, formats.medium),
      long: new Intl.DateTimeFormat(locale, formats.long),
      full: new Intl.DateTimeFormat(locale, formats.full),
      time: new Intl.DateTimeFormat(locale, { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      datetime: new Intl.DateTimeFormat(locale, {
        ...formats.medium,
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  }, [i18n.language]);

  // Formater une date
  const formatDate = (
    date: Date | string | number,
    options: LocalizedDateOptions = {}
  ): string => {
    const dateObj = typeof date === 'string' || typeof date === 'number' 
      ? new Date(date) 
      : date;
      
    if (isNaN(dateObj.getTime())) {
      return t('common.invalidDate', 'Date invalide');
    }

    const { 
      dateStyle = 'medium', 
      timeStyle, 
      showTime = false,
      relative = false,
      calendar = false
    } = options;

    // Format relatif
    if (relative) {
      return getRelativeTime(dateObj);
    }

    // Format calendrier
    if (calendar) {
      return getCalendarTime(dateObj);
    }

    // Format standard
    let formatter = formatters[dateStyle];
    
    if (showTime || timeStyle) {
      if (timeStyle) {
        const customOptions: Intl.DateTimeFormatOptions = {
          ...DATE_FORMATS[i18n.language][dateStyle],
          timeStyle
        };
        formatter = new Intl.DateTimeFormat(i18n.language, customOptions);
      } else {
        formatter = formatters.datetime;
      }
    }

    return formatter.format(dateObj);
  };

  // Obtenir le temps relatif
  const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffInMillis = date.getTime() - now.getTime();
    const diffInDays = Math.floor(diffInMillis / (1000 * 60 * 60 * 24));
    const translations = RELATIVE_TIME_TRANSLATIONS[i18n.language] || RELATIVE_TIME_TRANSLATIONS['fr'];

    if (diffInDays === 0) return translations.today;
    if (diffInDays === -1) return translations.yesterday;
    if (diffInDays === 1) return translations.tomorrow;
    
    if (Math.abs(diffInDays) < 7) {
      if (diffInDays < 0) {
        return translations.daysAgo.replace('{count}', Math.abs(diffInDays).toString());
      }
      return translations.inDays.replace('{count}', diffInDays.toString());
    }
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (Math.abs(diffInMonths) < 12) {
      if (diffInMonths < 0) {
        return translations.monthsAgo.replace('{count}', Math.abs(diffInMonths).toString());
      }
      return translations.inMonths.replace('{count}', diffInMonths.toString());
    }
    
    const diffInYears = Math.floor(diffInDays / 365);
    if (diffInYears < 0) {
      return translations.yearsAgo.replace('{count}', Math.abs(diffInYears).toString());
    }
    return translations.inYears.replace('{count}', diffInYears.toString());
  };

  // Obtenir le format calendrier
  const getCalendarTime = (date: Date): string => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffInDays = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const translations = RELATIVE_TIME_TRANSLATIONS[i18n.language] || RELATIVE_TIME_TRANSLATIONS['fr'];

    if (diffInDays === 0) return `${translations.today} ${formatters.time.format(date)}`;
    if (diffInDays === -1) return `${translations.yesterday} ${formatters.time.format(date)}`;
    if (diffInDays === 1) return `${translations.tomorrow} ${formatters.time.format(date)}`;
    
    if (diffInDays > -7 && diffInDays < 0) {
      return `${translations.lastWeek} ${formatters.time.format(date)}`;
    }
    
    if (diffInDays > 0 && diffInDays < 7) {
      return `${translations.nextWeek} ${formatters.time.format(date)}`;
    }

    return formatters.datetime.format(date);
  };

  // Formater une plage de dates
  const formatDateRange = (
    startDate: Date | string | number,
    endDate: Date | string | number,
    options: LocalizedDateOptions = {}
  ): string => {
    const start = typeof startDate === 'string' || typeof startDate === 'number' 
      ? new Date(startDate) 
      : startDate;
      
    const end = typeof endDate === 'string' || typeof endDate === 'number' 
      ? new Date(endDate) 
      : endDate;

    const { dateStyle = 'medium' } = options;
    
    // Si les dates sont le même jour
    if (start.toDateString() === end.toDateString()) {
      return `${formatDate(start, { dateStyle })} ${formatters.time.format(start)} - ${formatters.time.format(end)}`;
    }

    // Si les dates sont dans le même mois
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      const formatter = new Intl.DateTimeFormat(i18n.language, { day: 'numeric' });
      return `${formatter.format(start)} - ${formatDate(end, { dateStyle })}`;
    }

    // Dates différentes
    return `${formatDate(start, { dateStyle })} - ${formatDate(end, { dateStyle })}`;
  };

  // Obtenir les noms des mois
  const getMonthNames = (format: 'long' | 'short' = 'long'): string[] => {
    const formatter = new Intl.DateTimeFormat(i18n.language, { month: format });
    return Array.from({ length: 12 }, (_, i) => 
      formatter.format(new Date(2000, i, 1))
    );
  };

  // Obtenir les noms des jours
  const getDayNames = (format: 'long' | 'short' | 'narrow' = 'long'): string[] => {
    const formatter = new Intl.DateTimeFormat(i18n.language, { weekday: format });
    return Array.from({ length: 7 }, (_, i) => 
      formatter.format(new Date(2024, 0, i + 1))
    );
  };

  return {
    formatDate,
    formatDateRange,
    getRelativeTime,
    getCalendarTime,
    getMonthNames,
    getDayNames,
    locale: i18n.language
  };
};