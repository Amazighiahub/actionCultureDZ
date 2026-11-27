/**
 * Texte multilingue à enregistrer en modification (2026-11-27).
 * Le serveur garde une langue absente ou vide (un formulaire qui n'envoie que la langue saisie
 * n'efface pas les traductions) : vider une traduction ne l'effaçait donc jamais. Règle commune :
 * une langue qui avait un texte au chargement et que la personne a vidée est envoyée à null,
 * et le serveur l'efface (helpers/i18n mergeTranslations, dto/baseDTO mergeMultilang).
 */
type Multilingue = Record<string, string | null | undefined>;

const rempli = (v: unknown) => typeof v === 'string' && v.trim() !== '';

export function avecEffacements(nouveau: unknown, charge: unknown): Record<string, string | null> {
  const resultat: Record<string, string | null> = {};
  const n = (nouveau && typeof nouveau === 'object' ? nouveau : {}) as Multilingue;
  const c = (charge && typeof charge === 'object' ? charge : {}) as Multilingue;
  for (const [langue, valeur] of Object.entries(n)) {
    if (rempli(valeur)) resultat[langue] = String(valeur);
  }
  for (const [langue, avant] of Object.entries(c)) {
    if (rempli(avant) && !rempli(n[langue])) resultat[langue] = null;
  }
  return resultat;
}
