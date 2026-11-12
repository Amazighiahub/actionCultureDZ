// hooks/useFormatDate.ts — dates et heures dans la langue de l'interface (seul hook de date du site,
// audit V11 COD-7 : remplace useLocalizedDate, dont il garde les options dateStyle / timeStyle /
// showTime / relative et formatDateRange)
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { localeDeLangue } from '@/utils/localeLangue';

/** Locale Intl d'une langue du site (table unique : utils/localeLangue.ts) */
export function getDateLocale(language: string): string {
  return localeDeLangue(language);
}

type StyleDate = 'short' | 'medium' | 'long' | 'full';
type StyleHeure = 'short' | 'medium' | 'long';

/**
 * Options de formatDate : options Intl habituelles (day, month…), ou raccourcis de l'ancien
 * useLocalizedDate :
 * - dateStyle : court / moyen (« 12 nov. 2026 ») / long (« 12 novembre 2026 ») / complet (avec le jour) ;
 * - timeStyle ou showTime : ajoute l'heure (« 12 nov. 2026, 14:30 ») ;
 * - relative : « Aujourd'hui », « Hier », « il y a 3 jours »…
 * dateStyle et timeStyle sont traduits en champs (jour, mois, année, heure) pour garder le rendu
 * historique ; les autres options (timeZone…) passent telles quelles.
 */
export type OptionsDate = Omit<Intl.DateTimeFormatOptions, 'dateStyle' | 'timeStyle'> & {
  dateStyle?: StyleDate;
  timeStyle?: StyleHeure;
  showTime?: boolean;
  relative?: boolean;
};

type DateEntree = string | number | Date | null | undefined;

/** Champs Intl de chaque dateStyle (rendu de l'ancien useLocalizedDate) */
function champsDuStyle(style: StyleDate, langue: string): Intl.DateTimeFormatOptions {
  switch (style) {
    case 'short':
      // L'arabe écrivait le jour et le mois sans zéro initial
      return langue.startsWith('ar')
        ? { day: 'numeric', month: 'numeric', year: 'numeric' }
        : { day: '2-digit', month: '2-digit', year: 'numeric' };
    case 'long':
      return { day: 'numeric', month: 'long', year: 'numeric' };
    case 'full':
      return { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    case 'medium':
    default:
      return { day: 'numeric', month: 'short', year: 'numeric' };
  }
}

/** Options Intl finales : raccourcis dateStyle / timeStyle / showTime convertis en champs */
function optionsIntl(options: OptionsDate | undefined, langue: string): Intl.DateTimeFormatOptions | undefined {
  if (!options) return undefined;
  const { dateStyle, timeStyle, showTime, relative: _relative, ...reste } = options;
  if (!dateStyle && !timeStyle && !showTime) return reste;
  // Avec l'heure, l'ancien hook gardait toujours la date moyenne (« 12 nov. 2026, 14:30 »)
  const avecHeure = Boolean(timeStyle || showTime);
  return {
    ...champsDuStyle(avecHeure ? 'medium' : (dateStyle ?? 'medium'), langue),
    ...(avecHeure ? { hour: '2-digit', minute: '2-digit' } : {}),
    ...reste,
  };
}

/** Date valide ou null (absente, vide ou illisible) */
function versDate(date: DateEntree): Date | null {
  if (date === null || date === undefined || date === '') return null;
  const d = date instanceof Date ? date : new Date(date);
  return isNaN(d.getTime()) ? null : d;
}

// Dates relatives, par langue (textes repris tels quels de l'ancien useLocalizedDate)
const TEXTES_RELATIFS: Record<string, Record<string, string>> = {
  fr: {
    today: "Aujourd'hui", yesterday: 'Hier', tomorrow: 'Demain',
    daysAgo: 'il y a {count} jours', inDays: 'dans {count} jours',
    monthsAgo: 'il y a {count} mois', inMonths: 'dans {count} mois',
    yearsAgo: 'il y a {count} ans', inYears: 'dans {count} ans',
  },
  ar: {
    today: 'اليوم', yesterday: 'أمس', tomorrow: 'غداً',
    daysAgo: 'منذ {count} أيام', inDays: 'بعد {count} أيام',
    monthsAgo: 'منذ {count} أشهر', inMonths: 'بعد {count} أشهر',
    yearsAgo: 'منذ {count} سنوات', inYears: 'بعد {count} سنوات',
  },
  en: {
    today: 'Today', yesterday: 'Yesterday', tomorrow: 'Tomorrow',
    daysAgo: '{count} days ago', inDays: 'in {count} days',
    monthsAgo: '{count} months ago', inMonths: 'in {count} months',
    yearsAgo: '{count} years ago', inYears: 'in {count} years',
  },
  'tz-ltn': {
    today: 'Assa', yesterday: 'Iḍelli', tomorrow: 'Azekka',
    daysAgo: '{count} wussan aya', inDays: 'deg {count} wussan',
    monthsAgo: '{count} wagguren aya', inMonths: 'deg {count} wagguren',
    yearsAgo: '{count} iseggasen aya', inYears: 'deg {count} iseggasen',
  },
  'tz-tfng': {
    today: 'ⴰⵙⵙⴰ', yesterday: 'ⵉⴹⵍⵍⵉ', tomorrow: 'ⴰⵣⴽⴽⴰ',
    daysAgo: '{count} ⵡⵓⵙⵙⴰⵏ ⴰⵢⴰ', inDays: 'ⴷⴳ {count} ⵡⵓⵙⵙⴰⵏ',
    monthsAgo: '{count} ⵡⴰⴳⴳⵓⵔⵏ ⴰⵢⴰ', inMonths: 'ⴷⴳ {count} ⵡⴰⴳⴳⵓⵔⵏ',
    yearsAgo: '{count} ⵉⵙⴳⴳⴰⵙⵏ ⴰⵢⴰ', inYears: 'ⴷⴳ {count} ⵉⵙⴳⴳⴰⵙⵏ',
  },
};

/** « Aujourd'hui », « Hier », « il y a 3 jours », « dans 2 mois »… (jours de calendrier, heure locale) */
function dateRelative(d: Date, langue: string, maintenant: Date = new Date()): string {
  // Écart en jours de calendrier : un commentaire d'il y a 10 minutes est « aujourd'hui »
  const aujourdhui = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
  const jour = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const jours = Math.round((jour.getTime() - aujourdhui.getTime()) / 86400000);
  const tr = TEXTES_RELATIFS[langue] || TEXTES_RELATIFS.fr;
  const avec = (cle: string, n: number) => tr[cle].replace('{count}', String(Math.abs(n)));

  if (jours === 0) return tr.today;
  if (jours === -1) return tr.yesterday;
  if (jours === 1) return tr.tomorrow;
  if (Math.abs(jours) < 7) return avec(jours < 0 ? 'daysAgo' : 'inDays', jours);
  const mois = Math.floor(jours / 30);
  if (Math.abs(mois) < 12) return avec(mois < 0 ? 'monthsAgo' : 'inMonths', mois);
  const ans = Math.floor(jours / 365);
  return avec(ans < 0 ? 'yearsAgo' : 'inYears', ans);
}

/**
 * Formatage des dates et heures selon la langue de l'interface.
 * Date absente : '' (et non « undefined » ni le 1er janvier 1970) ; date illisible : le texte reçu.
 */
export function useFormatDate() {
  const { i18n } = useTranslation();
  const langue = i18n.language || 'fr';
  const locale = getDateLocale(langue);

  const formatDate = useCallback(
    (date: DateEntree, options?: OptionsDate) => {
      const d = versDate(date);
      if (!d) return date === null || date === undefined ? '' : String(date);
      try {
        if (options?.relative) return dateRelative(d, langue);
        return d.toLocaleDateString(locale, optionsIntl(options, langue));
      } catch {
        return String(date);
      }
    },
    [locale, langue]
  );

  const formatTime = useCallback(
    (date: DateEntree, options?: Intl.DateTimeFormatOptions) => {
      const d = versDate(date);
      if (!d) return date === null || date === undefined ? '' : String(date);
      try {
        return d.toLocaleTimeString(locale, options);
      } catch {
        return String(date);
      }
    },
    [locale]
  );

  const formatDateTime = useCallback(
    (date: DateEntree, options?: Intl.DateTimeFormatOptions) => {
      const d = versDate(date);
      if (!d) return date === null || date === undefined ? '' : String(date);
      try {
        return d.toLocaleString(locale, options);
      } catch {
        return String(date);
      }
    },
    [locale]
  );

  /** « Aujourd'hui », « Hier », « il y a 3 jours »… ('' si la date manque) */
  const formatRelative = useCallback(
    (date: DateEntree) => {
      const d = versDate(date);
      return d ? dateRelative(d, langue) : (date === null || date === undefined ? '' : String(date));
    },
    [langue]
  );

  /**
   * Période : « 12 novembre 2026 10:00 - 18:00 » (même jour), « 12 - 15 novembre 2026 » (même mois),
   * sinon « 28 novembre 2026 - 2 décembre 2026 ». Fin absente ou illisible : la date de début seule.
   */
  const formatDateRange = useCallback(
    (debut: DateEntree, fin: DateEntree, options?: Pick<OptionsDate, 'dateStyle'>) => {
      const d = versDate(debut);
      const f = versDate(fin);
      const style = { dateStyle: options?.dateStyle ?? 'medium' } as const;
      if (!d || !f) return formatDate(debut, style);
      try {
        const heure = (x: Date) => x.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
        if (d.toDateString() === f.toDateString()) {
          return `${formatDate(d, style)} ${heure(d)} - ${heure(f)}`;
        }
        if (d.getMonth() === f.getMonth() && d.getFullYear() === f.getFullYear()) {
          return `${d.toLocaleDateString(locale, { day: 'numeric' })} - ${formatDate(f, style)}`;
        }
        return `${formatDate(d, style)} - ${formatDate(f, style)}`;
      } catch {
        return formatDate(debut, style);
      }
    },
    [formatDate, locale]
  );

  return { formatDate, formatTime, formatDateTime, formatRelative, formatDateRange, locale };
}
