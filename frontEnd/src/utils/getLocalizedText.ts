/**
 * getLocalizedText - Utilitaire pour extraire le texte localisé d'un objet multilingue
 * Remplace les duplications dans les 6 onglets admin
 */
/**
 * Ordre de lecture d'un texte multilingue : la langue demandée, l'autre écriture du tamazight
 * (latin ↔ tifinagh), puis le français, l'arabe, l'anglais et le tamazight. Un texte écrit dans
 * une seule langue, même en tamazight, s'affiche donc toujours.
 */
export const ordreLangues = (lang: string): string[] => {
  const autreTamazight = lang === 'tz-ltn' ? 'tz-tfng' : lang === 'tz-tfng' ? 'tz-ltn' : null;
  return [lang, ...(autreTamazight ? [autreTamazight] : []), 'fr', 'ar', 'en', 'tz-ltn', 'tz-tfng'];
};

export const getLocalizedText = (value: unknown, lang: string = 'fr', fallback: string = ''): string => {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    for (const l of ordreLangues(lang)) {
      if (typeof obj[l] === 'string' && (obj[l] as string).trim()) return obj[l] as string;
    }
    const autre = Object.values(obj).find(v => typeof v === 'string' && v.trim());
    return autre ? String(autre) : fallback;
  }
  return String(value);
};

/** Le texte est-il rempli dans au moins une langue (le tamazight compte comme les autres) ? */
export const aDuTexte = (value: unknown): boolean => {
  if (!value) return false;
  if (typeof value === 'string') return !!value.trim();
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).some(v => typeof v === 'string' && !!v.trim());
  return false;
};

export default getLocalizedText;
