// types/models/programme.types.ts

import { StatutProgramme, TypeActivite, NiveauRequis } from '../enums/programme.enums';
import { MaterielRequis } from './specific-types';
import { Evenement } from './evenement.types';
import { Lieu } from './lieu.types';
import { Intervenant } from './intervenant.types';
import { User } from './user.types';

export interface Programme {
  id_programme: number;
  titre: string;
  description?: string;
  id_evenement: number;
  id_lieu?: number;
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
  Users?: User[];
}

// Type pour la création d'un programme
export type CreateProgrammeDTO = Omit<Programme, 'id_programme'>;

// Type pour la mise à jour d'un programme
export type UpdateProgrammeDTO = Partial<CreateProgrammeDTO>;