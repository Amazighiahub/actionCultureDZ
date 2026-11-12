/**
 * Petits outils de texte partagés (audit V11 COD-B17 à B19) :
 * - sansAccent : clé de comparaison sans accents, en minuscules ;
 * - nomComplet : « Prénom Nom » d'une personne (champs multilingues acceptés) ;
 * - sansInvisibles / texte : saisie libre nettoyée des caractères invisibles et bornée.
 */
const AppError = require('./appError');
const { texteLisible } = require('../helpers/i18n');

/**
 * Texte sans accents, en minuscules, sans espaces au début ni à la fin.
 * { espaces: true } : les suites d'espaces deviennent un seul espace.
 */
const sansAccent = (t, { espaces = false } = {}) => {
  const s = String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return (espaces ? s.replace(/\s+/g, ' ') : s).trim();
};

/** « Prénom Nom » (texte lisible de chaque champ, parties vides omises) ; '' si rien */
const nomComplet = (u) => [texteLisible(u?.prenom), texteLisible(u?.nom)].filter(Boolean).join(' ');

// Caractères invisibles (contrôle, sens d'écriture forcé) : ils peuvent maquiller un nom ou un texte
// eslint-disable-next-line no-control-regex -- volontaire : ces caractères sont justement ceux à retirer
const INVISIBLES = /[\u0000-\u0009\u000B-\u001F\u007F\u00AD\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g;
/** Mêmes invisibles, plus le « joiner » graphique U+034F (marque combinante : retirée par son code) */
const sansInvisibles = (s) => Array.from(String(s).replace(INVISIBLES, '')).filter((ch) => ch.codePointAt(0) !== 0x034F).join('');

/**
 * Texte libre saisi : fins de ligne unifiées, invisibles retirés, espaces de bord retirés.
 * Vide → null ; autre chose qu'une chaîne ou plus de `max` caractères → erreur 400 nommant le champ.
 */
const texte = (v, max, champ) => {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string') throw AppError.badRequest(`${champ} invalide`);
  const t = sansInvisibles(v.replace(/\r\n?/g, '\n')).trim();
  if (t.length > max) throw AppError.badRequest(`${champ} : ${max} caractères au plus`);
  return t || null;
};

module.exports = { sansAccent, nomComplet, INVISIBLES, sansInvisibles, texte };
