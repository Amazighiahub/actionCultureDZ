/**
 * Date de naissance d'un compte : une seule règle, utilisée à l'inscription (CreateUserDTO)
 * et quand la personne complète son profil (UpdateUserDTO).
 */
const AGE_MINIMUM = 13;

/**
 * @param {string|null|undefined} valeur date AAAA-MM-JJ
 * @param {Date} [aujourdhui]
 * @returns {string|null} message d'erreur, ou null si la date est acceptable
 */
function erreurDateNaissance(valeur, aujourdhui = new Date()) {
  if (!valeur) return null;
  const naissance = new Date(valeur);
  if (!/^\d{4}-\d{2}-\d{2}/.test(String(valeur)) || isNaN(naissance.getTime())) {
    return 'Date de naissance invalide';
  }
  if (naissance > aujourdhui) return 'La date de naissance ne peut pas être dans le futur';
  let age = aujourdhui.getFullYear() - naissance.getFullYear();
  const mois = aujourdhui.getMonth() - naissance.getMonth();
  if (mois < 0 || (mois === 0 && aujourdhui.getDate() < naissance.getDate())) age--;
  if (age < AGE_MINIMUM) return `Vous devez avoir au moins ${AGE_MINIMUM} ans`;
  return null;
}

module.exports = { AGE_MINIMUM, erreurDateNaissance };
