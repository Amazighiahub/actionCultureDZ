/**
 * Valeur du réglage Express 'trust proxy'.
 * Par défaut exactement 1 saut (nginx, qui ajoute $remote_addr à droite de
 * X-Forwarded-For) : req.ip = vraie IP du client, non usurpable.
 * Ne pas utiliser 'loopback' : nginx tourne dans un autre conteneur Docker,
 * tous les clients auraient alors l'IP de nginx (rate-limit commun à tous).
 * @param {string|undefined} envValue - TRUSTED_PROXY_IP : nombre de sauts ("2")
 *   ou liste d'adresses / sous-réseaux séparés par des virgules ("loopback, 172.28.0.0/24")
 */
function resolveTrustProxy(envValue) {
  if (!envValue || !envValue.trim()) return 1;
  const hops = Number(envValue);
  return Number.isInteger(hops) ? hops : envValue.split(',').map(s => s.trim()).filter(Boolean);
}

module.exports = { resolveTrustProxy };
