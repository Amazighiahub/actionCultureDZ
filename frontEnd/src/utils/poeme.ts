/**
 * Mise en forme des blocs de texte d'un article (metadata.forme) : texte normal, poème (vers centrés,
 * strophes séparées par les lignes vides de l'auteur), proverbe (centré, en grand, entre guillemets),
 * encadré (note mise en valeur). Et une ou deux colonnes (metadata.colonnes = 2, sur grand écran).
 * Même liste pour la page de l'article, l'éditeur, son aperçu et l'import d'un fichier.
 */
export const STYLE_POEME = 'poeme';
export const FORMES_TEXTE = ['poeme', 'proverbe', 'encadre'] as const;
export type FormeTexte = typeof FORMES_TEXTE[number];

const lireForme = (metadata: unknown): FormeTexte | null => {
  const f = (metadata as { forme?: unknown } | null | undefined)?.forme;
  return (FORMES_TEXTE as readonly unknown[]).includes(f) ? f as FormeTexte : null;
};

/** Le bloc est-il marqué « poème » dans l'éditeur ? */
export const estBlocPoeme = (metadata: unknown): boolean => lireForme(metadata) === STYLE_POEME;

/** Forme choisie (null : texte normal) */
export const formeDuBloc = (metadata: unknown): FormeTexte | null => lireForme(metadata);

/** Deux colonnes demandées pour ce bloc ? */
export const enDeuxColonnes = (metadata: unknown): boolean =>
  Number((metadata as { colonnes?: unknown } | null | undefined)?.colonnes) === 2;

/** Classes CSS du paragraphe sur la page de l'article (feuille article-magazine.css) */
export function classesBlocTexte(metadata: unknown): string {
  const classes: string[] = [];
  const forme = lireForme(metadata);
  if (forme) classes.push(`mag-${forme}`);
  if (enDeuxColonnes(metadata)) classes.push('mag-deux-colonnes');
  return classes.join(' ');
}

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
