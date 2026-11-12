/**
 * Intervenants d'une activité de programme, au format du formulaire.
 * Un intervenant n'a pas forcément de compte sur le site (potière, centre de recherche…) :
 * il est identifié par sa fiche (id_intervenant), son prénom et son nom.
 */
import type { IntervenantData } from '@/services/programme.service';
import type { TexteMultilingue } from '@/types/common/multilingual.types';
import { getLocalizedText } from '@/utils/getLocalizedText';

interface IntervenantApi {
  id_intervenant?: number;
  id_user?: number | null;
  prenom?: TexteMultilingue;
  nom?: TexteMultilingue;
  ProgrammeIntervenant?: {
    role_intervenant?: IntervenantData['role_intervenant'];
    sujet_intervention?: string | null;
    biographie_courte?: string | null;
    ordre_intervention?: number | null;
    duree_intervention?: number | null;
  };
}

/** Intervenants renvoyés par l'API (programme.Intervenants) → lignes du formulaire */
export function intervenantsPourFormulaire(intervenants: unknown, langue = 'fr'): IntervenantData[] {
  if (!Array.isArray(intervenants)) return [];
  return (intervenants as IntervenantApi[]).map((i, index) => ({
    id_intervenant: i.id_intervenant,
    id_user: i.id_user ?? undefined,
    prenom: getLocalizedText(i.prenom, langue),
    nom: getLocalizedText(i.nom, langue),
    role_intervenant: i.ProgrammeIntervenant?.role_intervenant || 'principal',
    sujet_intervention: i.ProgrammeIntervenant?.sujet_intervention || '',
    biographie_courte: i.ProgrammeIntervenant?.biographie_courte || '',
    ordre_intervention: i.ProgrammeIntervenant?.ordre_intervention || index + 1,
    duree_intervention: i.ProgrammeIntervenant?.duree_intervention ?? undefined
  }));
}

/** Un intervenant est valide s'il est choisi parmi les fiches existantes ou s'il a un nom */
export const intervenantValide = (i: IntervenantData): boolean =>
  !!i.id_intervenant || !!(i.nom?.trim() || i.prenom?.trim());
