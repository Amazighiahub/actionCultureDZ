/**
 * Formulaire d'inscription d'un événement : vérification et normalisation des réponses.
 *
 * Un type d'événement peut définir ses propres questions (type_evenement.config_inscription).
 * Sans configuration, le formulaire de base demande le nombre de personnes et un commentaire.
 * Les réponses sont toujours ré-écrites à partir de la configuration : une clé inconnue
 * ou une question masquée par sa condition n'est jamais enregistrée.
 */

const { texteLisible } = require('../../helpers/i18n');

const LONGUEUR_MAX = { texte: 500, texte_long: 3000, email: 254, tel: 30 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEL_RE = /^\+?[\d\s().-]{6,30}$/;
const COMMENTAIRE_MAX = 2000;
const NOMBRE_PERSONNES_MAX = 50;

const texte = (v) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');

const libelle = (label) => {
  if (!label) return '';
  return texteLisible(label);
};

/** Liste à plat des questions d'une configuration */
function listerChamps(config) {
  if (!config || !Array.isArray(config.sections)) return [];
  return config.sections.flatMap((s) => (Array.isArray(s.champs) ? s.champs : []));
}

/** Une question conditionnelle n'est posée que si la réponse attendue est donnée */
function estVisible(champ, reponses) {
  if (!champ.condition) return true;
  const valeur = reponses[champ.condition.cle];
  return Array.isArray(valeur) ? valeur.includes(champ.condition.valeur) : valeur === champ.condition.valeur;
}

/**
 * Vérifie une réponse. Retourne { valeur } (undefined = pas de réponse) ou { invalide: true }.
 */
function normaliserChamp(champ, brut) {
  const valeursOptions = (champ.options || []).map((o) => o.valeur);

  switch (champ.type) {
    case 'texte':
    case 'texte_long':
    case 'email':
    case 'tel': {
      const v = texte(brut);
      if (!v) return { valeur: undefined };
      if (v.length > LONGUEUR_MAX[champ.type]) return { invalide: true };
      if (champ.type === 'email' && !EMAIL_RE.test(v)) return { invalide: true };
      if (champ.type === 'tel' && !TEL_RE.test(v)) return { invalide: true };
      return { valeur: v };
    }
    case 'nombre': {
      const v = texte(brut);
      if (!v) return { valeur: undefined };
      if (!/^-?\d+$/.test(v)) return { invalide: true };
      const n = parseInt(v, 10);
      if ((champ.min !== undefined && n < champ.min) || (champ.max !== undefined && n > champ.max)) {
        return { invalide: true };
      }
      return { valeur: n };
    }
    case 'choix': {
      const v = texte(brut);
      if (!v) return { valeur: undefined };
      return valeursOptions.includes(v) ? { valeur: v } : { invalide: true };
    }
    case 'choix_multiple': {
      if (brut === undefined || brut === null || brut === '') return { valeur: undefined };
      if (!Array.isArray(brut)) return { invalide: true };
      const choisis = [...new Set(brut.map(texte))];
      if (choisis.some((v) => !valeursOptions.includes(v))) return { invalide: true };
      // Ordre de la configuration, pour des exports lisibles
      const ordonnes = valeursOptions.filter((v) => choisis.includes(v));
      return { valeur: ordonnes.length ? ordonnes : undefined };
    }
    case 'accord':
      return { valeur: brut === true || brut === 'true' || brut === 'Oui' ? 'Oui' : 'Non' };
    default:
      return { invalide: true };
  }
}

/**
 * Vérifie les réponses au formulaire d'un type d'événement.
 * @returns {{ reponses: object, erreurs: Array<{cle: string, label: string, raison: 'requis'|'invalide'}> }}
 */
function verifierReponses(config, brutes) {
  const entree = brutes && typeof brutes === 'object' && !Array.isArray(brutes) ? brutes : {};
  const reponses = {};
  const erreurs = [];

  for (const champ of listerChamps(config)) {
    // Les conditions portent sur des questions précédentes, déjà normalisées
    if (!estVisible(champ, reponses)) continue;

    const { valeur, invalide } = normaliserChamp(champ, entree[champ.cle]);
    if (invalide) {
      erreurs.push({ cle: champ.cle, label: libelle(champ.label), raison: 'invalide' });
      continue;
    }
    const manquant = valeur === undefined || (champ.type === 'accord' && valeur !== 'Oui');
    if (champ.requis && manquant) {
      erreurs.push({ cle: champ.cle, label: libelle(champ.label), raison: 'requis' });
      continue;
    }
    if (valeur !== undefined) reponses[champ.cle] = valeur;
  }

  return { reponses, erreurs };
}

/** Réponses du formulaire de base (sans configuration de type) */
function reponsesFormulaireBase(data = {}) {
  const reponses = {};
  const n = parseInt(data.nombre_personnes, 10);
  if (Number.isInteger(n) && n > 1) reponses.nombre_personnes = Math.min(n, NOMBRE_PERSONNES_MAX);
  const commentaire = texte(data.commentaire).slice(0, COMMENTAIRE_MAX);
  if (commentaire) reponses.commentaire = commentaire;
  return Object.keys(reponses).length ? reponses : null;
}

/** Valeur d'une réponse prête pour un export (listes séparées par des virgules) */
function valeurExport(valeur) {
  if (valeur === undefined || valeur === null) return '';
  return Array.isArray(valeur) ? valeur.join(', ') : String(valeur);
}

module.exports = {
  listerChamps,
  estVisible,
  verifierReponses,
  reponsesFormulaireBase,
  valeurExport,
  libelle
};
