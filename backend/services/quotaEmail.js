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

/**
 * Le total du jour est compté à la RÉSERVATION (et rendu si l'envoi échoue) : des envois en parallèle
 * ne peuvent plus dépasser le quota. compterEnvoi reste pour un envoi qui n'aurait pas été réservé.
 */
async function compterEnvoi() {
  await prendre(cleDuJour(), Number.MAX_SAFE_INTEGER).catch(() => {});
}

async function envoyesAujourdhui() {
  return lire(cleDuJour());
}

/**
 * Parts du quota du jour par type d'e-mail : une part épuisée (inscriptions en masse, avis répétés
 * d'un organisateur, newsletter) ne peut plus priver les autres. « Mot de passe oublié » garde
 * toujours sa part. Réglables par variable d'environnement (EMAIL_PART_<TYPE>).
 */
const PARTS_PAR_DEFAUT = {
  verification: 40,       // vérifier son adresse à l'inscription
  reinitialisation: 40,   // mot de passe oublié, invitation d'un compte importé
  securite: 25,           // mot de passe ou e-mail changé, coordonnées de paiement changées
  transactionnel: 50,     // envois à une personne : inscription acceptée, commande, validation…
  annulation: 25,         // événement annulé : chaque inscrit doit le savoir
  contact: 15,            // formulaire de contact (vers l'adresse de l'équipe)
  newsletter: 15,         // confirmation d'abonnement à la newsletter
  groupe: 90,             // envois à plusieurs personnes (avis, rappels, invitations, annonces)
};
/**
 * Importants : part épuisée → ils peuvent encore puiser dans ce qui reste du quota total, en laissant
 * toujours les 20 derniers e-mails du jour au « mot de passe oublié ». Une vague de fausses
 * inscriptions ne bloque donc plus ni les vraies vérifications, ni les mots de passe oubliés.
 */
const IMPORTANTS = ['reinitialisation', 'verification', 'securite', 'annulation'];
const DERNIERS_POUR_REINITIALISATION = 20;
/** Limite par destinataire propre aux e-mails importants (un tiers ne peut pas en priver la personne) */
const PAR_DESTINATAIRE_IMPORTANTS = 5;
/** « Mot de passe oublié » : plus large, pour qu'un inconnu ne prive pas la personne de son propre lien */
const PAR_DESTINATAIRE_REINITIALISATION = 10;
const TYPES = Object.keys(PARTS_PAR_DEFAUT);
const part = (type) => entier(process.env[`EMAIL_PART_${type.toUpperCase()}`], PARTS_PAR_DEFAUT[type]);
/** E-mails par jour vers une même adresse, tous types confondus (harcèlement, bombardement) */
const parDestinataire = () => entier(process.env.EMAIL_MAX_PAR_DESTINATAIRE, 6);

const jour = () => new Date().toISOString().slice(0, 10);
const empreinte = (adresse) => require('crypto').createHash('sha256').update(String(adresse).trim().toLowerCase()).digest('hex').slice(0, 32);
const compteursMemoire = new Map();
/** Mémoire pleine : seules les clés des jours passés et les délais échus sont retirés */
function purgerMemoire() {
  const aujourdhui = jour();
  const maintenant = Date.now();
  for (const [cle, valeur] of compteursMemoire) {
    if (cle.startsWith('une-fois:') ? valeur <= maintenant : !cle.includes(aujourdhui)) compteursMemoire.delete(cle);
  }
  if (compteursMemoire.size > 20000) compteursMemoire.clear();
}

/** +1 sur un compteur du jour ; rendu si le plafond est dépassé (atomique avec Redis) */
async function prendre(cle, plafond) {
  try {
    const redis = getClient();
    if (redis) {
      const n = await redis.incr(cle);
      if (n === 1) await redis.expire(cle, 2 * 24 * 3600);
      if (n > plafond) { await redis.decr(cle); return false; }
      return true;
    }
  } catch {
    // Redis indisponible : compteur en mémoire
  }
  if (compteursMemoire.size > 20000) purgerMemoire();
  const n = (compteursMemoire.get(cle) || 0) + 1;
  if (n > plafond) return false;
  compteursMemoire.set(cle, n);
  return true;
}
async function rendre(cle) {
  try {
    const redis = getClient();
    if (redis) { await redis.decr(cle); return; }
  } catch { /* mémoire */ }
  const n = compteursMemoire.get(cle) || 0;
  if (n > 0) compteursMemoire.set(cle, n - 1);
}
async function lire(cle) {
  try {
    const redis = getClient();
    if (redis) return entier(await redis.get(cle), 0);
  } catch { /* mémoire */ }
  return compteursMemoire.get(cle) || 0;
}

/**
 * Réserve un envoi avant de l'expédier. Refusé si le quota total, la part du type ou la limite
 * par destinataire est atteinte.
 * @returns {Promise<{ ok: boolean, raison?: 'quota'|'type'|'destinataire' }>}
 */
async function reserverEnvoi(destinataire, type = 'transactionnel', { sansLimiteDestinataire = false } = {}) {
  const t = TYPES.includes(type) ? type : 'transactionnel';
  // 1. Une place dans le total du jour (atomique)
  const cleTotal = cleDuJour();
  if (!(await prendre(cleTotal, quota()))) return { ok: false, raison: 'quota' };
  const libres = quota() - await lire(cleTotal);
  // 2. Garde du « mot de passe oublié » pour TOUS les autres types : sa part non utilisée, et au moins
  //    les 20 derniers e-mails du jour (avant : seuls les importants en débordement la respectaient)
  if (t !== 'reinitialisation') {
    const garde = Math.max(DERNIERS_POUR_REINITIALISATION, part('reinitialisation') - await lire(`email:type:reinitialisation:${jour()}`));
    if (libres < garde) { await rendre(cleTotal); return { ok: false, raison: 'quota' }; }
  }
  // 3. La part du type ; un important dont la part est épuisée peut déborder (la garde est déjà assurée)
  const cleType = `email:type:${t}:${jour()}`;
  const typePris = await prendre(cleType, part(t));
  if (!typePris && !IMPORTANTS.includes(t)) { await rendre(cleTotal); return { ok: false, raison: 'type' }; }
  // Importants : leur propre compteur par destinataire (un tiers ne peut pas épuiser celui de la personne)
  const cleDest = IMPORTANTS.includes(t)
    ? `email:dest:${t}:${empreinte(destinataire)}:${jour()}`
    : `email:dest:${empreinte(destinataire)}:${jour()}`;
  const plafondDest = t === 'reinitialisation' ? PAR_DESTINATAIRE_REINITIALISATION
    : IMPORTANTS.includes(t) ? PAR_DESTINATAIRE_IMPORTANTS : parDestinataire();
  if (!sansLimiteDestinataire && !(await prendre(cleDest, plafondDest))) {
    if (typePris) await rendre(cleType);
    await rendre(cleTotal);
    return { ok: false, raison: 'destinataire' };
  }
  return { ok: true, cles: [cleTotal, typePris ? cleType : null, sansLimiteDestinataire ? null : cleDest].filter(Boolean) };
}

/** Envoi finalement impossible (et non remis en file) : les places réservées sont rendues */
async function rendreEnvoi(reservation) {
  for (const cle of reservation?.cles || []) await rendre(cle);
}

/** Nombre d'e-mails qu'un envoi groupé peut encore utiliser aujourd'hui (part « groupe » et quota total) */
async function budgetEnvoiGroupe() {
  const restantTotal = quota() - reserve() - await envoyesAujourdhui();
  const restantGroupe = part('groupe') - await lire(`email:type:groupe:${jour()}`);
  return Math.max(0, Math.min(restantTotal, restantGroupe));
}

/**
 * Vrai la première fois dans la période (clé posée pour « secondes ») : un même avis ne repart pas
 * en boucle (événement modifié plusieurs fois, participant accepté puis refusé…).
 */
async function premiereFoisPendant(cle, secondes) {
  try {
    const redis = getClient();
    if (redis) return (await redis.set(`email:une-fois:${cle}`, '1', { NX: true, EX: secondes })) === 'OK';
  } catch { /* mémoire */ }
  const k = `une-fois:${cle}`;
  const fin = compteursMemoire.get(k);
  if (fin && fin > Date.now()) return false;
  if (compteursMemoire.size > 20000) purgerMemoire();
  compteursMemoire.set(k, Date.now() + secondes * 1000);
  return true;
}

module.exports = { compterEnvoi, envoyesAujourdhui, budgetEnvoiGroupe, reserverEnvoi, rendreEnvoi, premiereFoisPendant, TYPES, PARTS_PAR_DEFAUT, IMPORTANTS };
