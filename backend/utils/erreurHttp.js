/**
 * Erreur à renvoyer telle quelle au client : message (traduit par utils/traductionServeur), code HTTP et code
 * éventuel lu par le site (AUTO_VALIDATION, CIBLE_ANNULEE…). Lot 3 doublons (2026-11-19) : la même petite
 * fonction était recopiée dans 10 fichiers, et « Object.assign(new Error(…), { statusCode }) » écrit à la main
 * dans une vingtaine d'autres.
 * @param {string} message
 * @param {number} [statusCode=400]
 * @param {string} [code]
 * @returns {Error & { statusCode: number, code?: string }}
 */
function erreurHttp(message, statusCode = 400, code) {
  return Object.assign(new Error(message), { statusCode, ...(code ? { code } : {}) });
}

module.exports = { erreurHttp };
