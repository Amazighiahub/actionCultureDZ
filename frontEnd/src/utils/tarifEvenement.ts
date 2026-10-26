/**
 * Tarif d'un événement : gratuit, payant (un prix par personne) ou selon le profil du participant
 * (un prix par profil pour tout l'événement, part réduite pour une présence partielle).
 * Même calcul que le serveur (backend/services/evenement/tarification.js) : ici pour l'afficher,
 * le serveur reste seul à enregistrer le montant d'une inscription.
 */
import { listerChamps, type ConfigInscription, type LibelleMultilingue } from '@/utils/formulaireInscription';

export type ModeTarif = 'gratuit' | 'payant' | 'profil';

export interface ProfilTarif {
  valeur: string;
  label?: LibelleMultilingue;
  prix: number | string;
}

export interface Tarification {
  mode: ModeTarif;
  profils?: ProfilTarif[];
  partiel_pourcent?: number;
}

/** Profils proposés quand le formulaire du type d'événement ne demande pas le profil */
export const PROFILS_DEFAUT: ProfilTarif[] = [
  { valeur: 'Étudiant', label: { fr: 'Étudiant', ar: 'طالب', en: 'Student' }, prix: '' },
  { valeur: 'Professionnel', label: { fr: 'Professionnel', ar: 'مهني', en: 'Professional' }, prix: '' },
  { valeur: 'Retraité', label: { fr: 'Retraité', ar: 'متقاعد', en: 'Retired' }, prix: '' },
  { valeur: 'Bénévole', label: { fr: 'Bénévole', ar: 'متطوع', en: 'Volunteer' }, prix: '' },
];

/** Question « présence » d'un formulaire (chantier-école) : une présence « Partielle » paie une part du prix */
export const PRESENCE_PARTIELLE = { cle: 'presence', valeur: 'Partielle' };

/** Profil « Autre » : son prix peut rester vide (prix à convenir avec l'organisateur) */
export const PROFIL_AUTRE = 'Autre';

const sansPrix = (prix: unknown) => prix === '' || prix === null || prix === undefined;

const lireJson = (v: unknown): unknown => {
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { return undefined; }
};

interface EvenementTarife { tarif?: number | string | null; tarification?: unknown }

/** Tarification d'un événement, y compris des anciens (sans tarification : lue depuis tarif) */
export function tarificationDe(evenement: EvenementTarife | null | undefined): Tarification {
  const t = lireJson(evenement?.tarification) as Tarification | undefined;
  if (t && ['gratuit', 'payant', 'profil'].includes(t.mode)) return t;
  return Number(evenement?.tarif) > 0 ? { mode: 'payant' } : { mode: 'gratuit' };
}

/** Options de la question « Vous êtes » (clé profil) du formulaire du type, s'il la pose */
export function optionsProfilDuFormulaire(config: ConfigInscription | null | undefined): ProfilTarif[] | null {
  const champ = listerChamps(config).find(c => c.cle === 'profil' && Array.isArray(c.options) && c.options.length);
  return champ ? champ.options!.map(o => ({ valeur: o.valeur, label: o.label, prix: '' })) : null;
}

/** Le formulaire du type demande-t-il une présence « Partielle » ? */
export function aPresencePartielle(config: ConfigInscription | null | undefined): boolean {
  return listerChamps(config).some(c => c.cle === PRESENCE_PARTIELLE.cle && (c.options || []).some(o => o.valeur === PRESENCE_PARTIELLE.valeur));
}

/** Le profil choisi n'a pas de prix (« Autre ») : à convenir avec l'organisateur */
export function prixAConvenir(evenement: EvenementTarife, reponses: Record<string, unknown> = {}): boolean {
  const t = tarificationDe(evenement);
  const profil = t.mode === 'profil' ? (t.profils || []).find(p => p.valeur === reponses.profil) : undefined;
  return !!profil && sansPrix(profil.prix);
}

/** Montant à payer (DA) ; null quand il dépend d'un profil pas encore choisi ; 0 = gratuit */
export function montantInscription(
  evenement: EvenementTarife,
  reponses: Record<string, unknown> = {},
  nombrePersonnes = 1
): number | null {
  const t = tarificationDe(evenement);
  const personnes = nombrePersonnes > 1 ? nombrePersonnes : 1;
  if (t.mode === 'gratuit') return 0;
  if (t.mode === 'payant') return Math.round(Number(evenement.tarif) * personnes * 100) / 100;
  const profil = (t.profils || []).find(p => p.valeur === reponses.profil);
  if (!profil || sansPrix(profil.prix)) return null;
  let prix = Number(profil.prix);
  if (t.partiel_pourcent && reponses[PRESENCE_PARTIELLE.cle] === PRESENCE_PARTIELLE.valeur) prix = prix * t.partiel_pourcent / 100;
  return Math.round(prix * personnes * 100) / 100;
}
