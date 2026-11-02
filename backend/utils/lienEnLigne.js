/**
 * Lien d'un événement en ligne (Google Meet, Zoom…) : réservé aux personnes dont l'inscription est validée,
 * à l'organisateur et à l'équipe. Il part aussi dans l'e-mail d'acceptation.
 * Toutes les réponses JSON passent par retirerLienEnLigne : un événement peut sortir de nombreuses
 * requêtes (listes, programmes, favoris…), le retrait à un seul endroit évite tout oubli. Les autres
 * ne reçoivent que en_ligne: true. Une personne autorisée reçoit le lien dans lien_en_ligne (fiche de l'événement).
 */
const STATUTS_AVEC_LIEN = ['confirme', 'present'];

/** Pour app.set('json replacer') : ne modifie jamais l'objet d'origine (il peut venir du cache) */
function retirerLienEnLigne(_cle, valeur) {
  if (!valeur || typeof valeur !== 'object' || Array.isArray(valeur)) return valeur;
  if (!Object.prototype.hasOwnProperty.call(valeur, 'url_virtuel')) return valeur;
  const { url_virtuel: lien, ...reste } = valeur;
  return { ...reste, en_ligne: Boolean(lien) };
}

/**
 * @param {{url_virtuel?: string, id_user?: number}} evenement
 * @param {{peutGerer: boolean, inscription?: {statut_participation?: string}|null}} droits
 * @returns {string|null} le lien, si la personne y a droit
 */
function lienPour(evenement, { peutGerer = false, inscription = null } = {}) {
  if (!evenement?.url_virtuel) return null;
  if (peutGerer) return evenement.url_virtuel;
  return STATUTS_AVEC_LIEN.includes(inscription?.statut_participation) ? evenement.url_virtuel : null;
}

/** Lien pour un e-mail : seulement http(s), jamais pour un événement annulé ou terminé */
function lienPourEmail(evenement) {
  if (!evenement?.url_virtuel || ['annule', 'termine'].includes(evenement.statut)) return null;
  try {
    const adresse = new URL(String(evenement.url_virtuel).trim());
    return ['http:', 'https:'].includes(adresse.protocol) ? adresse.href : null;
  } catch {
    return null;
  }
}

module.exports = { retirerLienEnLigne, lienPour, lienPourEmail, STATUTS_AVEC_LIEN };
