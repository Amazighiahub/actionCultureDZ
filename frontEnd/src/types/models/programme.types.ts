// types/models/programme.types.ts

import { StatutProgramme, TypeActivite, NiveauRequis } from '../enums/programme.enums';
import { MaterielRequis } from './specific-types';
import { Evenement } from './evenement.types';
import { Lieu } from './lieu.types';
import { User } from './user.types';

/** Données pivot ProgrammeIntervenant (through table) */
export interface ProgrammeIntervenantData {
  role_intervenant?: 'principal' | 'co_intervenant' | 'moderateur' | 'invite' | 'animateur';
  statut_confirmation?: 'en_attente' | 'confirme' | 'decline' | 'annule';
  sujet_intervention?: string;
  ordre_intervention?: number;
  duree_intervention?: number;
  biographie_courte?: string;
}

/** Un User en tant qu'intervenant dans un programme */
export interface ProgrammeIntervenant extends User {
  ProgrammeIntervenant?: ProgrammeIntervenantData;
}

export interface Programme {
  id_programme: number;
  titre: string;
  description?: string;
  id_evenement: number;
  id_lieu?: number;
  date_programme?: Date;
  heure_debut?: string;
  heure_fin?: string;
  lieu_specifique?: string;
  ordre: number;
  statut: StatutProgramme;
  type_activite: TypeActivite;
  duree_estimee?: number;
  nb_participants_max?: number;
  materiel_requis: MaterielRequis[];
  niveau_requis?: NiveauRequis;
  langue_principale: string;
  traduction_disponible: boolean;
  enregistrement_autorise: boolean;
  diffusion_live: boolean;
  support_numerique: boolean;
  notes_organisateur?: string;

  // Relations (optionnelles)
  Evenement?: Evenement;
  Lieu?: Lieu;
  /** @deprecated Utiliser Intervenants à la place */
  Users?: User[];
  /** Intervenants avec données pivot (rôle, sujet, bio...) */
  Intervenants?: ProgrammeIntervenant[];
}

// Type pour la création d'un programme
export type CreateProgrammeDTO = Omit<Programme, 'id_programme'>;

// Type pour la mise à jour d'un programme
export type UpdateProgrammeDTO = Partial<CreateProgrammeDTO>;