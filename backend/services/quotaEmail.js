/**
 * Quota journalier d'e-mails du fournisseur (Brevo : 300 par jour avec l'offre actuelle).
 * Une part est réservée aux e-mails importants (validations, mots de passe, annulations) : une annonce
 * ou un message à tous les participants ne peut plus les priver d'envoi pour le reste de la journée.
 * Compte seulement ce que le site envoie, à titre indicatif : le compteur du fournisseur fait foi.
 */
const { getClient } = require('../utils/redisClient');

const entier = (valeur, defaut) => {
  const n = parseInt(valeur, 10);
  return Number.isNaN(n) ? defaut : n;
};
const quota = () => entier(process.env.EMAIL_QUOTA_JOUR, 300);
const reserve = () => entier(process.env.EMAIL_RESERVE_IMPORTANTS, 80);
const cleDuJour = () => `email:envoyes:${new Date().toISOString().slice(0, 10)}`;

// Redis absent : compteur en mémoire, perdu au redémarrage mais suffisant pour ne pas tout bloquer
const memoire = { cle: null, n: 0 };

async function compterEnvoi() {
  const cle = cleDuJour();
  if (memoire.cle !== cle) { memoire.cle = cle; memoire.n = 0; }
  memoire.n += 1;
  try {
    const redis = getClient();
    if (redis) {
      await redis.incr(cle);
      await redis.expire(cle, 2 * 24 * 3600);
    }
  } catch {
    // Le compteur ne doit jamais empêcher un envoi
  }
}

async function envoyesAujourdhui() {
  const cle = cleDuJour();
  const local = memoire.cle === cle ? memoire.n : 0;
  try {
    const redis = getClient();
    if (redis) return Math.max(entier(await redis.get(cle), 0), local);
  } catch {
    // Compteur en mémoire
  }
  return local;
}

/** Nombre d'e-mails qu'un envoi groupé peut encore utiliser aujourd'hui */
async function budgetEnvoiGroupe() {
  return Math.max(0, quota() - reserve() - await envoyesAujourdhui());
}

module.exports = { compterEnvoi, envoyesAujourdhui, budgetEnvoiGroupe };
