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

// Type (et non interface) : reste assignable à TranslatableValue, qui a une signature d'index
export type RequiredTranslatableValue = {
  fr: string;
  ar: string;
  en: string;
  'tz-ltn'?: string;
  'tz-tfng'?: string;
};

/** Texte saisi dans une ou plusieurs langues, ou ancien texte simple (audit V11 COD-8) */
export type TexteMultilingue = string | TranslatableValue | null | undefined;

export type SupportedLanguage = 'fr' | 'ar' | 'en' | 'tz-ltn' | 'tz-tfng';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['fr', 'ar', 'en', 'tz-ltn', 'tz-tfng'];

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  fr: 'Français',
  ar: 'العربية',
  en: 'English',
  'tz-ltn': 'Tamaziɣt',
  'tz-tfng': 'ⵜⴰⵎⴰⵣⵉⵖⵜ'
};

// Codes courts plutôt que des drapeaux : une langue n'est pas un pays, et Windows affiche
// les drapeaux en lettres (« GBEnglish »)
export const LANGUAGE_FLAGS: Record<SupportedLanguage, string> = {
  fr: 'FR',
  ar: 'ع',
  en: 'EN',
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

/** Vrai si le code est l'une des 5 langues du site */
export function estLangueSupportee(code: unknown): code is SupportedLanguage {
  return typeof code === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(code);
}

/** Sens d'écriture d'une langue (ltr pour une langue inconnue) */
export function directionLangue(code: string): 'ltr' | 'rtl' {
  return estLangueSupportee(code) ? LANGUAGE_DIRECTIONS[code] : 'ltr';
}

/** Nom d'une langue écrit dans cette langue (le code lui-même pour une langue inconnue) */
export function nomLangue(code: string): string {
  return estLangueSupportee(code) ? LANGUAGE_LABELS[code] : code;
}

/** Tout ce qu'il faut pour afficher une langue : nom, sens, code court et code HTML */
export interface InfoLangue {
  code: SupportedLanguage;
  label: string;
  dir: 'ltr' | 'rtl';
  flag: string;
  htmlLang: string;
}

export function infoLangue(code: SupportedLanguage): InfoLangue {
  return {
    code,
    label: LANGUAGE_LABELS[code],
    dir: LANGUAGE_DIRECTIONS[code],
    flag: LANGUAGE_FLAGS[code],
    htmlLang: toHtmlLang(code),
  };
}

/**
 * Seul endroit qui pose la langue et le sens de la page (<html lang dir>), appelé par i18n/config.ts au
 * démarrage et à chaque changement de langue. Code BCP 47 (ber-Latn / ber-Tfng pour le tamazight, jamais
 * « tz-ltn »), « ar » en arabe (audit V11 COD-3).
 */
export function appliquerLangueDocument(lang: string): void {
  if (typeof document === 'undefined' || !lang) return;
  const html = document.documentElement;
  html.lang = toHtmlLang(lang);
  html.dir = directionLangue(lang);
}

export const LANGUAGE_FONT_CLASSES: Partial<Record<SupportedLanguage, string>> = {
  ar: 'font-arabic',
  'tz-tfng': 'tifinagh-font'
};
