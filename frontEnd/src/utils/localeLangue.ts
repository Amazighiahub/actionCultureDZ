/**
 * Langue du site → locale Intl (dates, heures, nombres, prix, tris). Table unique (audit V11 COD-7) :
 * useFormatDate, useLocalizedNumber et les notifications la lisent, au lieu de trois copies.
 *
 * - Arabe : « ar-DZ-u-nu-latn » impose les chiffres occidentaux (0-9), usage algérien, quel que
 *   soit le navigateur (audit V11 UX-30).
 * - Français : fr-FR et non fr-DZ, qui affiche l'heure sur 12 h (« 06:30 PM »).
 * - Tamazight (tz-ltn, tz-tfng) : pas de données Intl fiables, dates et nombres en français.
 */
const LOCALES_LANGUE: Record<string, string> = {
  ar: 'ar-DZ-u-nu-latn',
  'ar-DZ': 'ar-DZ-u-nu-latn',
  fr: 'fr-FR',
  en: 'en-US',
  'tz-ltn': 'fr-FR',
  'tz-tfng': 'fr-FR',
};

/** Locale par défaut, pour une langue absente ou inconnue */
export const LOCALE_PAR_DEFAUT = 'fr-FR';

/** Locale Intl d'une langue du site (fr-FR pour une langue inconnue) */
export function localeDeLangue(langue?: string | null): string {
  return (langue && LOCALES_LANGUE[langue]) || LOCALE_PAR_DEFAUT;
}
