/**
 * Crédit et droits d'une photo de lieu : photographe ou source, et licence.
 * Une photo libre (Wikimedia Commons…) se publie avec la mention de son auteur ; une photo
 * « tous droits réservés » demande l'accord du photographe (case cochée dans le formulaire).
 */
const LICENCES = ['tous_droits_reserves', 'cc_by', 'cc_by_sa', 'domaine_public'];

/** Texte simple : sans balise ni retour à la ligne, `max` caractères au plus ; vide → null */
function texteSimple(valeur, max) {
  if (valeur === undefined) return undefined;
  const texte = String(valeur ?? '').replace(/<[^>]*>/g, '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
  return texte || null;
}

/** Photographe ou source (ou nom de la personne enregistrée) : 150 caractères au plus */
const lireCredit = (valeur) => texteSimple(valeur, 150);

/** Licence connue, sinon null (non précisée) */
function lireLicence(valeur) {
  if (valeur === undefined) return undefined;
  return LICENCES.includes(valeur) ? valeur : null;
}

/** { credit, licence } à enregistrer, à partir d'un formulaire ; clés absentes = inchangées */
function champsCredit(source = {}) {
  const champs = {};
  const credit = lireCredit(source.credit);
  const licence = lireLicence(source.licence);
  if (credit !== undefined) champs.credit = credit;
  if (licence !== undefined) champs.licence = licence;
  return champs;
}

module.exports = { LICENCES, texteSimple, lireCredit, lireLicence, champsCredit };
