/** Métiers enregistrés d'un professionnel (liste, ou texte JSON pour d'anciennes données) */
export const lireSpecialites = (v: unknown): string[] => {
  const liste = typeof v === 'string' ? (() => { try { return JSON.parse(v); } catch { return []; } })() : v;
  return Array.isArray(liste) ? liste.filter((s): s is string => typeof s === 'string' && !!s.trim()) : [];
};
