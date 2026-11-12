/**
 * Chiffres, nombres, prix, dates et listes selon la langue (usage algérien : chiffres 0-9 en arabe aussi).
 * Le sens d'écriture et <html lang dir> ne sont plus ici : voir types/common/multilingual.types.ts
 * (appliquerLangueDocument, LANGUAGE_DIRECTIONS) et hooks/useRTL.ts (audit V11 COD-3, COD-25).
 */

// Chiffres arabes-indiens → chiffres occidentaux
const LATIN_NUMERALS: Record<string, string> = {
  '\u0660': '0', '\u0661': '1', '\u0662': '2', '\u0663': '3', '\u0664': '4',
  '\u0665': '5', '\u0666': '6', '\u0667': '7', '\u0668': '8', '\u0669': '9',
  '\u066B': '.', '\u066C': ','
};

// Convertir les chiffres arabes en latins
export const toLatinNumerals = (text: string): string => {
  return text.replace(/[\u0660-\u0669\u066B\u066C]/g, (match) => LATIN_NUMERALS[match] || match);
};

// Chiffres occidentaux (0-9) en arabe aussi : usage algérien, comme useLocalizedNumber et le reste du site
// (avant : chiffres arabes-indiens « ٥٬٠٠٠ » forcés, audit V11 UX-30).
const LOCALE_ARABE_DZ = 'ar-DZ-u-nu-latn';
const localeAffichage = (language: string): string => (['ar', 'ar-DZ'].includes(language) ? LOCALE_ARABE_DZ : language);

// Helper pour formater automatiquement les nombres selon la langue
export const localizeNumber = (value: number | string, language: string): string => {
  const stringValue = value.toString();
  // Chiffres arabes-indiens saisis : ramenés aux chiffres occidentaux en arabe
  return ['ar', 'ar-DZ'].includes(language) ? toLatinNumerals(stringValue) : stringValue;
};

// Formater les nombres pour l'affichage (avec séparateurs de milliers)
export const formatNumber = (value: number, language: string): string =>
  value.toLocaleString(localeAffichage(language));

// Formater les prix en dinars algériens
export const formatCurrency = (value: number, language: string = 'ar-DZ'): string => {
  if (['ar', 'ar-DZ'].includes(language)) {
    // Format : 5.000 د.ج.
    return value.toLocaleString(LOCALE_ARABE_DZ, {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }
  return value.toLocaleString(language, {
    style: 'currency',
    currency: 'DZD'
  });
};

// Formater les dates en arabe
export const formatDate = (date: Date, language: string = 'ar-DZ'): string => {
  if (['ar', 'ar-DZ'].includes(language)) {
    return date.toLocaleDateString(LOCALE_ARABE_DZ, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  return date.toLocaleDateString(language);
};

/**
 * Séparateur d'une liste affichée (adresse, rôles…) : virgule arabe « ، » en arabe, virgule latine sinon
 * (audit V11 UX-30). Ex. : [commune, wilaya].filter(Boolean).join(separateurListe(lang))
 */
export const separateurListe = (language?: string | null): string =>
  (language || '').toLowerCase().startsWith('ar') ? '، ' : ', ';
