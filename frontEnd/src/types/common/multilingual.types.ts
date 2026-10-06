// types/common/multilingual.types.ts
// Types communs pour le multilingue dans tout le projet

export interface TranslatableValue {
  fr?: string;
  ar?: string;
  en?: string;
  'tz-ltn'?: string;
  'tz-tfng'?: string;
  [key: string]: string | undefined;
}

export interface RequiredTranslatableValue {
  fr: string;
  ar: string;
  en: string;
  'tz-ltn'?: string;
  'tz-tfng'?: string;
}

export type SupportedLanguage = 'fr' | 'ar' | 'en' | 'tz-ltn' | 'tz-tfng';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['fr', 'ar', 'en', 'tz-ltn', 'tz-tfng'];

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  fr: 'Français',
  ar: 'العربية',
  en: 'English',
  'tz-ltn': 'Tamaziɣt',
  'tz-tfng': 'ⵜⴰⵎⴰⵣⵉⵖⵜ'
};

export const LANGUAGE_FLAGS: Record<SupportedLanguage, string> = {
  fr: '🇫🇷',
  ar: '🇩🇿',
  en: '🇬🇧',
  'tz-ltn': 'ⵣ',
  'tz-tfng': 'ⵣ'
};

export const LANGUAGE_DIRECTIONS: Record<SupportedLanguage, 'ltr' | 'rtl'> = {
  fr: 'ltr',
  ar: 'rtl',
  en: 'ltr',
  'tz-ltn': 'ltr',
  'tz-tfng': 'ltr'
};

// Codes BCP 47 pour l'attribut lang du HTML ("tz-ltn" / "tz-tfng" ne sont pas des codes
// valides : les synthèses vocales et les navigateurs ne reconnaîtraient pas le tamazight)
const HTML_LANG_CODES: Record<string, string> = {
  'tz-ltn': 'ber-Latn',
  'tz-tfng': 'ber-Tfng',
};

export function toHtmlLang(lang: string): string {
  return HTML_LANG_CODES[lang] || lang;
}

export const LANGUAGE_FONT_CLASSES: Partial<Record<SupportedLanguage, string>> = {
  ar: 'font-arabic',
  'tz-tfng': 'tifinagh-font'
};

// Helpers pour le multilingue
export function getTranslation(value: TranslatableValue | undefined, lang: SupportedLanguage = 'fr'): string {
  if (!value) return '';
  return value[lang] || value.fr || value.ar || value.en || '';
}

export function setTranslation(value: TranslatableValue, lang: SupportedLanguage, text: string): TranslatableValue {
  return {
    ...value,
    [lang]: text
  };
}

export function createEmptyTranslation(): RequiredTranslatableValue {
  return {
    fr: '',
    ar: '',
    en: '',
    'tz-ltn': '',
    'tz-tfng': ''
  };
}

export function hasRequiredTranslations(value: TranslatableValue): boolean {
  return !!(value.fr || value.ar || value.en);
}

export function getFirstAvailableTranslation(value: TranslatableValue): string {
  return value.fr || value.ar || value.en || value['tz-ltn'] || value['tz-tfng'] || '';
}
