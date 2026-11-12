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

/**
 * Échappe les caractères HTML (& < > " ') d'un texte à insérer dans une page ou un e-mail.
 * null / undefined → '' ; toute autre valeur est convertie en texte (0 → « 0 »).
 * @param {*} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

module.exports = { sanitizeLike, escapeHtml };
