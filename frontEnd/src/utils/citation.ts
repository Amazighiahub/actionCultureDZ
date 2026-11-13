/**
 * « Citer cette page » (audit V11 OUT-6) : références prêtes à copier pour les étudiants, enseignants
 * et chercheurs. Formats APA (7e éd.), Chicago (notes et bibliographie, version web) et BibTeX.
 * Date de consultation du jour, à l'heure de l'Algérie ; auteur et année seulement s'ils sont connus.
 */

export interface SourceCitation {
  /** Identifiant stable (clé BibTeX) */
  cle: string;
  titre: string;
  auteur?: string | null;
  /** Année de publication de l'œuvre ou de la fiche */
  annee?: number | string | null;
  url: string;
}

const FUSEAU = 'Africa/Algiers';
const SITE = 'Tala DZ';

const consulte = (langue: string, jour: Date) => {
  const locale = langue.startsWith('ar') ? 'ar-DZ-u-nu-latn' : langue.startsWith('en') ? 'en-GB' : 'fr-FR';
  const date = jour.toLocaleDateString(locale, { timeZone: FUSEAU, day: 'numeric', month: 'long', year: 'numeric' });
  if (langue.startsWith('en')) return `Accessed ${date}`;
  if (langue.startsWith('ar')) return `تاريخ الاطلاع: ${date}`;
  return `Consulté le ${date}`;
};

const sansFin = (t: string) => t.trim().replace(/[.\s]+$/, '');

export function citationApa(s: SourceCitation, langue = 'fr', jour = new Date()): string {
  const auteur = s.auteur ? `${sansFin(s.auteur)}. ` : '';
  const annee = s.annee ? `(${s.annee}). ` : langue.startsWith('en') ? '(n.d.). ' : '(s. d.). ';
  return `${auteur}${annee}${sansFin(s.titre)}. ${SITE}. ${consulte(langue, jour)}, ${s.url}`;
}

export function citationChicago(s: SourceCitation, langue = 'fr', jour = new Date()): string {
  const auteur = s.auteur ? `${sansFin(s.auteur)}. ` : '';
  const [ouvre, ferme] = langue.startsWith('fr') ? ['« ', ' »'] : ['“', '”'];
  const annee = s.annee ? ` ${s.annee}.` : '';
  return `${auteur}${ouvre}${sansFin(s.titre)}.${ferme} ${SITE}.${annee} ${consulte(langue, jour)}. ${s.url}.`;
}

/** Accolades et caractères spéciaux de LaTeX neutralisés dans les champs */
const latex = (t: string) => t.replace(/[\\{}]/g, '').replace(/([&%$#_])/g, '\\$1');

export function citationBibtex(s: SourceCitation, jour = new Date()): string {
  const cle = `taladz_${s.cle}`.replace(/[^A-Za-z0-9_:-]/g, '_');
  const consultation = jour.toLocaleDateString('en-CA', { timeZone: FUSEAU });
  return [
    `@misc{${cle},`,
    `  title = {${latex(sansFin(s.titre))}},`,
    ...(s.auteur ? [`  author = {${latex(sansFin(s.auteur))}},`] : []),
    ...(s.annee ? [`  year = {${s.annee}},`] : []),
    `  howpublished = {${SITE}},`,
    `  url = {${s.url}},`,
    `  urldate = {${consultation}}`,
    '}'
  ].join('\n');
}
