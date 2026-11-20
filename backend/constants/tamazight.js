/**
 * Section Tamazight (2026-11-20, demande de la responsable) : textes et voix en tamazight, partagés librement pour
 * la recherche (traduction, reconnaissance de la parole, lecture à voix haute). Règles communes au serveur.
 *
 * - Langues de la base : 1 = tamazight en lettres latines (code « tm »), 2 = tamazight en tifinagh (« tif »).
 * - Variante : kabyle, chaoui, mozabite… (les parlers d'Algérie, plus « autre »).
 * - Partage ouvert : seulement un texte écrit par une personne (une traduction automatique remise dans les
 *   données apprendrait ses propres erreurs aux outils), avec l'accord de l'auteur, sous licence CC BY-SA 4.0,
 *   et après la relecture d'un modérateur.
 */
const LANGUES_TAMAZIGHT = Object.freeze([1, 2]);
const ECRITURE_PAR_LANGUE = Object.freeze({ 1: 'latin', 2: 'tifinagh' });
const VARIANTES = Object.freeze(['kabyle', 'chaoui', 'mozabite', 'chenoui', 'touareg', 'zenete', 'ouargli', 'autre']);
const LICENCE_OUVERTE = 'cc_by_sa';
const LICENCE_LIBELLE = 'CC BY-SA 4.0';
const LICENCE_URL = 'https://creativecommons.org/licenses/by-sa/4.0/deed.fr';

const vrai = (v) => v === true || v === 'true' || v === 1 || v === '1';

/**
 * Champs tamazight d'une œuvre envoyés par le site, nettoyés. Seuls les champs présents sont rendus
 * (mise à jour partielle) ; une variante inconnue est ignorée.
 * @param {object} data - corps de la requête
 * @returns {{ variante_amazighe?: string|null, ecrit_par_humain?: boolean, partage_ouvert?: boolean }}
 */
function champsTamazight(data = {}) {
  const champs = {};
  if (data.variante_amazighe !== undefined) {
    champs.variante_amazighe = VARIANTES.includes(data.variante_amazighe) ? data.variante_amazighe : null;
  }
  if (data.ecrit_par_humain !== undefined) champs.ecrit_par_humain = vrai(data.ecrit_par_humain);
  if (data.partage_ouvert !== undefined) champs.partage_ouvert = vrai(data.partage_ouvert);
  return champs;
}

/**
 * Valeurs à enregistrer : le partage ouvert exige un texte écrit par une personne ; l'accord est daté et la
 * licence fixée. Tout changement du texte ou de l'accord demande une nouvelle relecture.
 * @param {object} champs - sortie de champsTamazight
 * @param {object} [actuel] - œuvre enregistrée (mise à jour)
 */
function valeursTamazight(champs, actuel = {}) {
  const v = { ...champs };
  const humain = v.ecrit_par_humain ?? actuel.ecrit_par_humain;
  const partage = (v.partage_ouvert ?? actuel.partage_ouvert) && humain === true;
  if (v.partage_ouvert !== undefined || v.ecrit_par_humain !== undefined) {
    v.partage_ouvert = !!partage;
    v.licence = partage ? LICENCE_OUVERTE : null;
    if (partage && !actuel.partage_ouvert) v.partage_ouvert_le = new Date();
    // Accord retiré : le texte sort aussitôt des données ouvertes
    if (!partage) Object.assign(v, { partage_ouvert_le: null, donnees_ouvertes_valide: false, donnees_ouvertes_par: null, donnees_ouvertes_le: null });
  }
  return v;
}

module.exports = {
  LANGUES_TAMAZIGHT, ECRITURE_PAR_LANGUE, VARIANTES, LICENCE_OUVERTE, LICENCE_LIBELLE, LICENCE_URL,
  champsTamazight, valeursTamazight
};
