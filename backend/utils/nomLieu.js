/**
 * Comparaison de noms de lieux pour repérer les doublons : « COMMUNE  AIT SMAIL » et « Aït Smaïl »
 * désignent le même lieu. Accents, casse, ponctuation et mots génériques (commune, ville,
 * village, de, la…) sont ignorés ; les noms en arabe sont comparés sans espaces superflus.
 */
const { slugify } = require('./slug');

const MOTS_GENERIQUES = new Set([
  'commune', 'ville', 'village', 'douar', 'quartier', 'cite', 'site', 'lieu',
  'de', 'du', 'des', 'la', 'le', 'les', 'l', 'd', 'el', 'al'
]);

/** Clé de comparaison d'un nom ('' si rien d'exploitable) */
function cleNomLieu(nom) {
  const texte = String(nom || '').trim();
  if (!texte) return '';
  const latin = slugify(texte).split('-').filter(m => m && !MOTS_GENERIQUES.has(m)).join(' ');
  if (latin) return latin;
  // Écriture arabe ou tifinagh : slugify ne garde rien
  return texte.replace(/\s+/g, ' ').replace(/^(بلدية|مدينة|قرية)\s+/, '');
}

/** Même lieu probable : clés égales, ou l'une contient l'autre (au moins 4 caractères) */
function nomsSimilaires(a, b) {
  const ca = cleNomLieu(a);
  const cb = cleNomLieu(b);
  if (!ca || !cb) return false;
  if (ca === cb) return true;
  const [court, long] = ca.length <= cb.length ? [ca, cb] : [cb, ca];
  return court.length >= 4 && long.includes(court);
}

/** Textes d'un nom multilingue (objet { fr, ar, … }, texte JSON ou texte simple) */
function textesNom(nom) {
  if (!nom) return [];
  if (typeof nom === 'string') {
    try { const o = JSON.parse(nom); if (o && typeof o === 'object') return textesNom(o); } catch { /* texte simple */ }
    return [nom];
  }
  return Object.values(nom).filter(v => typeof v === 'string' && v.trim());
}

module.exports = { cleNomLieu, nomsSimilaires, textesNom };
