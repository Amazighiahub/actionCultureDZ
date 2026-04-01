/**
 * getLocalizedText - Utilitaire pour extraire le texte localisé d'un objet multilingue
 * Remplace les duplications dans les 6 onglets admin
 */
export const getLocalizedText = (value: unknown, lang: string = 'fr', fallback: string = ''): string => {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    return String(obj[lang] || obj.fr || obj.ar || obj.en || Object.values(obj)[0] || fallback);
  }
  return String(value);
};

export default getLocalizedText;
