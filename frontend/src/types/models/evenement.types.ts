// types/models/evenement.types.ts

import { StatutEvenement } from '../enums/evenement.enums';
import { User } from './user.types';
import { TypeEvenement } from './references.types';
import { Lieu } from './lieu.types';
import { Programme } from './programme.types';
import { Media } from './media.types';
import { Oeuvre } from './oeuvre.types';
import { Organisation } from './organisation.types';

export interface Evenement {
  id_evenement: number;
  nom_evenement: string;
  description?: string;
  date_debut?: string;
  date_fin?: string;
  contact_email?: string;
  contact_telephone?: string;
  image_url?: string;
  id_lieu: number;
  id_user: number;
  id_type_evenement: number;
  statut: StatutEvenement;
  capacite_max?: number;
  tarif: number;
  inscription_requise: boolean;
  age_minimum?: number;
  accessibilite?: string;
  certificat_delivre: boolean;
  date_limite_inscription?: string;
  date_creation: string;
  date_modification: string;
  
  // Champs virtuels
  nombre_participants?: number;
  nombre_inscrits?: number;
  est_complet?: boolean;
  duree_totale?: number;
  note_moyenne?: number;
  
  // Relations (optionnelles)
  TypeEvenement?: TypeEvenement;
  Lieu?: Lieu;
  Organisateur?: User;
  Programmes?: Programme[];
  Media?: Media[];
  Participants?: User[];
  Oeuvres?: Oeuvre[];
  Organisations?: Organisation[];
}

// Interface pour les champs virtuels d'un événement
export interface EvenementVirtual {
  nombre_participants: number;
  nombre_inscrits: number;
  est_complet: boolean;
  duree_totale: number | null;
  note_moyenne: number | null;
}

// Type pour la création d'un événement
export type CreateEvenementDTO = Omit<Evenement, 
  | 'id_evenement' 
  | 'date_creation' 
  | 'date_modification'
  | 'nombre_participants'
  | 'nombre_inscrits'
  | 'est_complet'
  | 'duree_totale'
  | 'note_moyenne'
>;

// Type pour la mise à jour d'un événement
export type UpdateEvenementDTO = Partial<CreateEvenementDTO>;