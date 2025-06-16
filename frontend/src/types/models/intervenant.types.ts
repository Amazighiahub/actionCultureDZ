// types/models/intervenant.types.ts

import { User } from './user.types';
import { ReseauxSociaux, LangueParlée } from './specific-types';
import { Programme } from './programme.types';

export interface Intervenant {
  id_intervenant: number;
  nom: string;
  prenom: string;
  titre_professionnel?: string;
  organisation?: string;
  email?: string;
  telephone?: string;
  biographie?: string;
  photo_url?: string;
  specialites: string[];
  site_web?: string;
  reseaux_sociaux: ReseauxSociaux;
  pays_origine?: string;
  langues_parlees: LangueParlée[];
  id_user?: number;
  actif: boolean;
  verifie: boolean;
  
  // Relations (optionnelles)
  User?: User;
  Programmes?: Programme[];
}

// Type pour la création d'un intervenant
export type CreateIntervenantDTO = Omit<Intervenant, 'id_intervenant'>;

// Type pour la mise à jour d'un intervenant
export type UpdateIntervenantDTO = Partial<CreateIntervenantDTO>;