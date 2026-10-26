/**
 * Tarif d'un événement : gratuit, payant (un prix par personne) ou selon le profil du participant
 * (un prix par profil, pour tout l'événement, avec une réduction possible pour une présence partielle).
 *
 * evenement.tarification = {
 *   mode: 'gratuit' | 'payant' | 'profil',
 *   profils?: [{ valeur: 'Étudiant', label: { fr, ar, en }, prix: 2000 }],   // mode 'profil'
 *   partiel_pourcent?: 70                                                       // mode 'profil', facultatif
 * }
 * evenement.tarif reste le prix affiché dans les listes : 0 (gratuit), le prix (payant) ou le plus
 * petit prix des profils. Les anciens événements (tarification vide) se lisent depuis tarif.
 *
 * Le montant d'une inscription est toujours calculé ici, à partir des réponses enregistrées :
 * le participant ne choisit pas son prix.
 */

const MODES = ['gratuit', 'payant', 'profil'];
const PRIX_MAX = 10000000;
const PROFILS_MAX = 20;

/** Profils proposés quand le formulaire du type d'événement ne demande pas le profil */
const PROFILS_DEFAUT = [
  { valeur: 'Étudiant', label: { fr: 'Étudiant', ar: 'طالب', en: 'Student' } },
  { valeur: 'Professionnel', label: { fr: 'Professionnel', ar: 'مهني', en: 'Professional' } },
  { valeur: 'Retraité', label: { fr: 'Retraité', ar: 'متقاعد', en: 'Retired' } },
  { valeur: 'Bénévole', label: { fr: 'Bénévole', ar: 'متطوع', en: 'Volunteer' } }
];

/** Question « présence » d'un formulaire (chantier-école) : une présence « Partielle » paie une part du prix */
const PRESENCE = { cle: 'presence', valeur: 'Partielle' };

const lireJson = (v) => {
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { return undefined; }
};

const nombre = (v) => {
  if (v === '' || v === null || v === undefined) return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

const texteLabel = (label) => {
  if (!label) return '';
  if (typeof label === 'string') return label.trim();
  return String(label.fr || label.ar || label.en || '').trim();
};

/**
 * Lit la tarification envoyée par le formulaire de l'événement.
 * @returns {{ tarification: object, tarif: number } | { erreur: string } | null} null = rien envoyé
 */
function lireTarification(brut, tarifBrut) {
  const t = lireJson(brut);
  if (t === undefined || t === null || t === '') return null;
  if (typeof t !== 'object' || !MODES.includes(t.mode)) return { erreur: 'Choisissez le tarif : gratuit, payant ou selon le profil' };

  if (t.mode === 'gratuit') return { tarification: { mode: 'gratuit' }, tarif: 0 };

  if (t.mode === 'payant') {
    const prix = nombre(t.prix ?? tarifBrut);
    if (!(prix > 0) || prix > PRIX_MAX) return { erreur: 'Indiquez le prix de l\'événement' };
    return { tarification: { mode: 'payant' }, tarif: prix };
  }

  // Selon le profil
  if (!Array.isArray(t.profils) || t.profils.length === 0 || t.profils.length > PROFILS_MAX) {
    return { erreur: 'Indiquez au moins un profil et son prix' };
  }
  const profils = [];
  for (const p of t.profils) {
    const valeur = String(p?.valeur ?? texteLabel(p?.label)).trim().slice(0, 80);
    const prix = nombre(p?.prix);
    if (!valeur) return { erreur: 'Chaque profil doit avoir un nom' };
    if (!(prix >= 0) || prix > PRIX_MAX) return { erreur: `Indiquez le prix du profil « ${valeur} »` };
    if (profils.some(x => x.valeur === valeur)) return { erreur: `Le profil « ${valeur} » est en double` };
    const label = p?.label && typeof p.label === 'object' ? p.label : { fr: valeur };
    profils.push({ valeur, label, prix });
  }
  let partiel = null;
  if (t.partiel_pourcent !== undefined && t.partiel_pourcent !== null && t.partiel_pourcent !== '') {
    partiel = nombre(t.partiel_pourcent);
    if (!Number.isInteger(partiel) || partiel < 1 || partiel > 100) return { erreur: 'La part payée pour une présence partielle va de 1 à 100 %' };
  }
  return {
    tarification: { mode: 'profil', profils, ...(partiel ? { partiel_pourcent: partiel } : {}) },
    tarif: Math.min(...profils.map(p => p.prix))
  };
}

/** Tarification d'un événement, y compris des anciens (sans tarification : lue depuis tarif) */
function tarificationDe(evenement) {
  const t = lireJson(evenement?.tarification);
  if (t && MODES.includes(t.mode)) return t;
  return Number(evenement?.tarif) > 0 ? { mode: 'payant' } : { mode: 'gratuit' };
}

const aQuestionProfil = (config) =>
  !!config?.sections?.some(s => (s.champs || []).some(c => c.cle === 'profil'));

/**
 * Formulaire d'inscription réellement posé : celui du type d'événement, plus la question
 * « Vous êtes » quand le tarif dépend du profil et que le formulaire ne la pose pas.
 */
function configAvecProfil(config, tarification) {
  if (tarification?.mode !== 'profil' || aQuestionProfil(config)) return config || null;
  const section = {
    titre: { fr: 'Votre profil', ar: 'صفتكم', en: 'Your profile' },
    champs: [{
      cle: 'profil', type: 'choix', requis: true,
      label: { fr: 'Vous êtes', ar: 'صفتكم', en: 'You are' },
      options: (tarification.profils || []).map(p => ({ valeur: p.valeur, label: p.label || { fr: p.valeur } }))
    }]
  };
  if (!config || !Array.isArray(config.sections) || !config.sections.length) {
    // Le formulaire de base (nombre de personnes, commentaire) reste posé à côté
    return { version: 1, remplace_formulaire_base: false, sections: [section] };
  }
  return { ...config, sections: [section, ...config.sections] };
}

/**
 * Montant dû pour une inscription (DA), d'après la tarification et les réponses enregistrées.
 * null : montant inconnu (profil sans prix) ; 0 : gratuit.
 */
function montantInscription(evenement, reponses = {}) {
  const t = tarificationDe(evenement);
  const personnes = Number.isInteger(reponses?.nombre_personnes) && reponses.nombre_personnes > 1 ? reponses.nombre_personnes : 1;
  if (t.mode === 'gratuit') return 0;
  if (t.mode === 'payant') return Math.round(Number(evenement.tarif) * personnes * 100) / 100;

  const profil = (t.profils || []).find(p => p.valeur === reponses?.profil);
  if (!profil) return null;
  let prix = Number(profil.prix);
  if (t.partiel_pourcent && reponses?.[PRESENCE.cle] === PRESENCE.valeur) prix = prix * t.partiel_pourcent / 100;
  return Math.round(prix * personnes * 100) / 100;
}

module.exports = { MODES, PROFILS_DEFAUT, PRESENCE, lireTarification, tarificationDe, configAvecProfil, montantInscription };
