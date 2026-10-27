/**
 * Règle unique « l'auteur ou la modération ».
 * Les identifiants sont comparés en nombre : selon la requête, la base ou le jeton
 * peuvent donner « 12 » ou 12, et une comparaison stricte refuserait l'auteur à tort.
 */

/** Même utilisateur ; faux si l'un des deux manque (visiteur non connecté, auteur supprimé) */
const memeUtilisateur = (a, b) => a != null && b != null && a !== '' && Number(a) === Number(b);

/**
 * @param {number|string|Array<number|string|null|undefined>} auteurs - id(s) des personnes autorisées
 * @param {{ userId?: number|null, isModerator?: boolean }} droits
 */
const peutGerer = (auteurs, { userId = null, isModerator = false } = {}) =>
  !!isModerator || [].concat(auteurs).some(id => memeUtilisateur(id, userId));

/** Administration ou modération (req.user rempli par authenticate / optionalAuth) */
const estModeration = (user) => user?.isAdmin === true || user?.isModerateur === true;

module.exports = { memeUtilisateur, peutGerer, estModeration };
