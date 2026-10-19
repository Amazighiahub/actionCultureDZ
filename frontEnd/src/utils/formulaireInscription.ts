/**
 * Formulaire d'inscription propre à un type d'événement (type_evenement.config_inscription).
 * Même règles que le serveur (backend/services/evenement/formulaireInscription.js),
 * qui reste seul juge : ici on évite seulement un aller-retour inutile.
 */

/** Libellé déjà traduit par l'API (chaîne) ou multilingue (objet) */
export type LibelleMultilingue = string | Record<string, string>;

export type TypeChamp = 'texte' | 'texte_long' | 'email' | 'tel' | 'nombre' | 'choix' | 'choix_multiple' | 'accord';

export interface OptionChamp {
  valeur: string;
  label: LibelleMultilingue;
}

export interface ChampFormulaire {
  cle: string;
  type: TypeChamp;
  label: LibelleMultilingue;
  requis?: boolean;
  min?: number;
  max?: number;
  options?: OptionChamp[];
  condition?: { cle: string; valeur: string };
  placeholder?: LibelleMultilingue;
  /** Donnée du compte utilisée pour pré-remplir la réponse */
  prerempli?: 'telephone';
}

export interface ConfigInscription {
  version?: number;
  remplace_formulaire_base?: boolean;
  sections: { titre?: LibelleMultilingue; champs: ChampFormulaire[] }[];
}

export type ValeurReponse = string | string[] | boolean;
export type Reponses = Record<string, ValeurReponse | undefined>;
export type ErreurChamp = 'requis' | 'invalide';

const LONGUEUR_MAX: Partial<Record<TypeChamp, number>> = { texte: 500, texte_long: 3000, email: 254, tel: 30 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEL_RE = /^\+?[\d\s().-]{6,30}$/;

export const configInscriptionValide = (config: unknown): config is ConfigInscription =>
  !!config && typeof config === 'object' && Array.isArray((config as ConfigInscription).sections)
  && (config as ConfigInscription).sections.length > 0;

export const listerChamps = (config?: ConfigInscription | null): ChampFormulaire[] =>
  configInscriptionValide(config) ? config.sections.flatMap((s) => s.champs || []) : [];

export function estVisible(champ: ChampFormulaire, reponses: Reponses): boolean {
  if (!champ.condition) return true;
  const valeur = reponses[champ.condition.cle];
  return Array.isArray(valeur) ? valeur.includes(champ.condition.valeur) : valeur === champ.condition.valeur;
}

function erreurChamp(champ: ChampFormulaire, valeur: ValeurReponse | undefined): ErreurChamp | null {
  if (champ.type === 'accord') return champ.requis && valeur !== true ? 'requis' : null;
  if (champ.type === 'choix_multiple') {
    return champ.requis && (!Array.isArray(valeur) || valeur.length === 0) ? 'requis' : null;
  }

  const texte = typeof valeur === 'string' ? valeur.trim() : '';
  if (!texte) return champ.requis ? 'requis' : null;

  const max = LONGUEUR_MAX[champ.type];
  if (max && texte.length > max) return 'invalide';
  if (champ.type === 'email' && !EMAIL_RE.test(texte)) return 'invalide';
  if (champ.type === 'tel' && !TEL_RE.test(texte)) return 'invalide';
  if (champ.type === 'nombre') {
    if (!/^-?\d+$/.test(texte)) return 'invalide';
    const n = parseInt(texte, 10);
    if ((champ.min !== undefined && n < champ.min) || (champ.max !== undefined && n > champ.max)) return 'invalide';
  }
  return null;
}

/** Erreurs par clé de question (seules les questions visibles sont vérifiées) */
export function verifierReponses(config: ConfigInscription, reponses: Reponses): Record<string, ErreurChamp> {
  const erreurs: Record<string, ErreurChamp> = {};
  for (const champ of listerChamps(config)) {
    if (!estVisible(champ, reponses)) continue;
    const erreur = erreurChamp(champ, reponses[champ.cle]);
    if (erreur) erreurs[champ.cle] = erreur;
  }
  return erreurs;
}

/** Réponses à envoyer : sans les questions masquées ni les réponses vides */
export function reponsesAEnvoyer(config: ConfigInscription, reponses: Reponses): Reponses {
  const resultat: Reponses = {};
  for (const champ of listerChamps(config)) {
    if (!estVisible(champ, reponses)) continue;
    const valeur = reponses[champ.cle];
    if (valeur === undefined || valeur === '' || (Array.isArray(valeur) && valeur.length === 0)) continue;
    resultat[champ.cle] = typeof valeur === 'string' ? valeur.trim() : valeur;
  }
  return resultat;
}
