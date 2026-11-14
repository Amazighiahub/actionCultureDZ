/**
 * Règle unique « l'auteur ou la modération ».
 * Les identifiants sont comparés en nombre : selon la requête, la base ou le jeton
 * peuvent donner « 12 » ou 12, et une comparaison stricte refuserait l'auteur à tort.
 */

/** Numéro de compte lu en nombre ; vide, booléen ou non numérique : aucun compte */
const idCompte = (v) => (v == null || typeof v === 'boolean' || String(v).trim() === '' ? NaN : Number(v));

/**
 * Même utilisateur ; faux si l'un des deux manque (visiteur non connecté, auteur supprimé).
 * Seul un numéro de compte réel (entier positif) peut correspondre : ni 0, ni '', ni [].
 */
const memeUtilisateur = (a, b) => {
  const x = idCompte(a);
  return Number.isInteger(x) && x > 0 && x === idCompte(b);
};

/**
 * @param {number|string|Array<number|string|null|undefined>} auteurs - id(s) des personnes autorisées
 * @param {{ userId?: number|null, isModerator?: boolean }} droits
 */
const peutGerer = (auteurs, { userId = null, isModerator = false } = {}) =>
  !!isModerator || [].concat(auteurs).some(id => memeUtilisateur(id, userId));

/** Administration ou modération (req.user rempli par authenticate / optionalAuth) */
const estModeration = (user) => user?.isAdmin === true || user?.isModerateur === true;
/** Professionnel validé (compte pro actif) */
const estProValide = (user) => user?.isProfessionnel === true && user?.statut === 'actif';

/** Corps d'un refus (401/403) : le texte sous `error` (lu par le site) et sous `message` (anciens clients) */
const texteRefus = (texte) => ({ error: texte, message: texte });

module.exports = { memeUtilisateur, peutGerer, estModeration, estProValide, texteRefus };
