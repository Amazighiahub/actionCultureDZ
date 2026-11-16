/**
 * Détails d'un service « comme TripAdvisor », lot 2 (accord de la responsable, 2026-11-16) :
 * équipements, langues parlées, capacité, bouton « Réserver » (lien de réservation, WhatsApp).
 * Listes fermées : le site traduit chaque clé ; une clé inconnue est ignorée (jamais de texte libre).
 */
const EQUIPEMENTS = [
  'wifi', 'parking', 'climatisation', 'chauffage', 'acces_handicape', 'terrasse', 'piscine',
  'petit_dejeuner', 'cuisine_traditionnelle', 'vegetarien', 'livraison', 'a_emporter', 'paiement_carte',
  'famille', 'salle_priere', 'transfert_aeroport', 'animaux', 'non_fumeur'
];
const LANGUES = ['ar', 'dz', 'tz', 'fr', 'en', 'es', 'it', 'de', 'tr', 'zh'];
const CAPACITE_MAX = 100000;

const erreur = (message) => Object.assign(new Error(message), { statusCode: 400 });

/** Liste fermée : clés connues, sans doublon, dans l'ordre de la liste ; vide → null */
function listeFermee(valeur, permises) {
  if (valeur === undefined) return undefined;
  if (valeur === null || valeur === '') return null;
  // Liste envoyée en texte JSON (formulaire multipart) : '["wifi"]'
  if (typeof valeur === 'string' && valeur.trim().startsWith('[')) {
    try { valeur = JSON.parse(valeur); } catch { /* texte simple : traité comme une seule clé */ }
  }
  const choisies = new Set((Array.isArray(valeur) ? valeur : [valeur]).map((v) => String(v)));
  const liste = permises.filter((p) => choisies.has(p));
  return liste.length ? liste : null;
}

/**
 * Champs du lot 2 présents dans `data`, vérifiés ; un champ absent reste absent (pas de remplacement).
 * @returns {object} colonnes à enregistrer
 */
function detailsService(data = {}) {
  const sortie = {};
  const equipements = listeFermee(data.equipements, EQUIPEMENTS);
  if (equipements !== undefined) sortie.equipements = equipements;
  const langues = listeFermee(data.langues, LANGUES);
  if (langues !== undefined) sortie.langues = langues;

  if (data.capacite !== undefined) {
    if (data.capacite === null || data.capacite === '') sortie.capacite = null;
    else {
      const n = Number(data.capacite);
      if (!Number.isInteger(n) || n < 1 || n > CAPACITE_MAX) throw erreur('Capacité invalide : un nombre entier entre 1 et 100 000');
      sortie.capacite = n;
    }
  }

  if (data.lien_reservation !== undefined) {
    const lien = String(data.lien_reservation || '').trim();
    if (!lien) sortie.lien_reservation = null;
    else {
      let adresse;
      try { adresse = new URL(lien); } catch { throw erreur('Lien de réservation invalide : une adresse qui commence par https://'); }
      // Longueur de l'adresse enregistrée (les accents encodés l'allongent), pas du texte saisi
      if (!['https:', 'http:'].includes(adresse.protocol) || adresse.href.length > 500) {
        throw erreur('Lien de réservation invalide : une adresse qui commence par https://');
      }
      sortie.lien_reservation = adresse.href;
    }
  }

  if (data.whatsapp !== undefined) {
    const brut = String(data.whatsapp || '').trim();
    if (!brut) sortie.whatsapp = null;
    else {
      // Gardé tel que saisi (chiffres, +, espaces) ; le site en fait un lien wa.me
      if (!/^\+?[0-9\s().-]{8,20}$/.test(brut)) throw erreur('Numéro WhatsApp invalide');
      sortie.whatsapp = brut;
    }
  }
  return sortie;
}

module.exports = { detailsService, EQUIPEMENTS, LANGUES, CAPACITE_MAX };
