/**
 * Poèmes dans les articles : un bloc de texte peut être affiché « en vers » (metadata.forme = 'poeme') :
 * vers centrés, interligne aéré, strophes séparées par les lignes vides de l'auteur.
 */
export const STYLE_POEME = 'poeme';

/** Le bloc est-il marqué « poème » dans l'éditeur ? */
export const estBlocPoeme = (metadata: unknown): boolean =>
  (metadata as { forme?: unknown } | null | undefined)?.forme === STYLE_POEME;

/**
 * Un texte sans style choisi ressemble-t-il à des vers ? Sert seulement au résumé affiché à la place d'un
 * article sans bloc de texte : au moins 6 lignes, courtes en moyenne (45 signes au plus).
 */
export function ressembleAPoeme(texte: string | null | undefined): boolean {
  const lignes = String(texte || '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (lignes.length < 6) return false;
  const moyenne = lignes.reduce((total, l) => total + l.length, 0) / lignes.length;
  return moyenne <= 45;
}
