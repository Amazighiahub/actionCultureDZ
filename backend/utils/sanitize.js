/**
 * Sanitize une chaine pour utilisation dans un LIKE SQL
 * Echappe les caracteres speciaux LIKE (%, _, \) et limite la longueur
 * @param {string} input - Chaine utilisateur brute
 * @param {number} maxLength - Longueur max (defaut 200)
 * @returns {string} Chaine sanitisee, prete pour `%${result}%`
 */
function sanitizeLike(input, maxLength = 200) {
  if (!input || typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .substring(0, maxLength);
}

module.exports = { sanitizeLike };
