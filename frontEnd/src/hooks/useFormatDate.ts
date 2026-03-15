// hooks/useFormatDate.ts — locale-aware date/time formatting
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// Mapping des codes de langue vers les codes BCP 47 valides (même mapping que useLocalizedNumber)
const DATE_LOCALE_MAPPING: Record<string, string> = {
  'ar': 'ar-DZ',
  'ar-DZ': 'ar-DZ',
  'fr': 'fr-FR',
  'en': 'en-US',
  'tz-ltn': 'fr-FR',
  'tz-tfng': 'fr-FR',
};

/** Get the BCP 47 locale for a given i18n language code */
export function getDateLocale(language: string): string {
  return DATE_LOCALE_MAPPING[language] || 'fr-FR';
}

/**
 * Standalone date formatting (for non-component contexts like services/utils).
 * Pass the i18n language code directly.
 */
export function formatDateWithLocale(
  date: string | Date,
  language: string,
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return String(date);
    return d.toLocaleDateString(getDateLocale(language), options);
  } catch {
    return String(date);
  }
}

export function formatTimeWithLocale(
  date: string | Date,
  language: string,
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return String(date);
    return d.toLocaleTimeString(getDateLocale(language), options);
  } catch {
    return String(date);
  }
}

/**
 * React hook for locale-aware date/time formatting.
 * Uses the current i18n language to determine the locale.
 */
export function useFormatDate() {
  const { i18n } = useTranslation();
  const locale = getDateLocale(i18n.language);

  const formatDate = useCallback(
    (date: string | Date, options?: Intl.DateTimeFormatOptions) => {
      try {
        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime())) return String(date);
        return d.toLocaleDateString(locale, options);
      } catch {
        return String(date);
      }
    },
    [locale]
  );

  const formatTime = useCallback(
    (date: string | Date, options?: Intl.DateTimeFormatOptions) => {
      try {
        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime())) return String(date);
        return d.toLocaleTimeString(locale, options);
      } catch {
        return String(date);
      }
    },
    [locale]
  );

  const formatDateTime = useCallback(
    (date: string | Date, options?: Intl.DateTimeFormatOptions) => {
      try {
        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime())) return String(date);
        return d.toLocaleString(locale, options);
      } catch {
        return String(date);
      }
    },
    [locale]
  );

  return { formatDate, formatTime, formatDateTime, locale };
}
