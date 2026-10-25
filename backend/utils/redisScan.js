/**
 * Parcourt les clés Redis qui correspondent à un motif (SCAN, sans bloquer Redis comme KEYS).
 *
 * node-redis v5 exige un curseur texte (« 0 ») et le renvoie en texte ; la v4 utilisait un nombre.
 * Un curseur numérique fait échouer SCAN en v5 : les invalidations de cache échouaient en silence.
 *
 * @param {object} redis - client node-redis connecté
 * @param {string} match - motif MATCH (ex. « cache:*professionnel* »)
 * @param {(keys: string[]) => Promise<void>} surCles - appelé pour chaque lot de clés trouvé
 * @param {number} [count=200] - taille indicative des lots
 */
async function parcourirCles(redis, match, surCles, count = 200) {
  let cursor = '0';
  do {
    const reply = await redis.scan(cursor, { MATCH: match, COUNT: count });
    cursor = String(reply.cursor);
    if (reply.keys.length > 0) await surCles(reply.keys);
  } while (cursor !== '0');
}

module.exports = { parcourirCles };
