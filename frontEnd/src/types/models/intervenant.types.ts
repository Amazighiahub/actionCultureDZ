// types/models/intervenant.types.ts

import { User } from './user.types';
import { Programme } from './programme.types';
import { OeuvreIntervenant } from './associations.types';
import { ProgrammeIntervenant } from './associations.types';
import { ReseauxSociaux } from './specific-types';

// Type spécifique pour les prix et distinctions
export interface PrixDistinction {
  nom: string;
  annee: number;
  description?: string;
}

export interface Intervenant {
  id_intervenant: number;
  
  // Informations personnelles
  nom: string;
  prenom: string;
  date_naissance?: string; // DATEONLY
  lieu_naissance?: string;
  date_deces?: string; // DATEONLY
  lieu_deces?: string;
  
  // Distinctions et liens
  prix_distinctions: PrixDistinction[];
  wikipedia_url?: string;
  reseaux_sociaux: ReseauxSociaux;
  
  // Informations professionnelles
  titre_professionnel?: string;
  organisation?: string;
  email?: string;
  telephone?: string;
  biographie?: string;
  photo_url?: string;
  specialites: string[];
  site_web?: string;
  
  // Informations culturelles
  pays_origine?: string;
  langues_parlees: string[]; // Par défaut ['ar']
  
  // Lien avec utilisateur
  id_user?: number;
  
  // Statut
  actif: boolean;
  verifie: boolean;
  
  // Timestamps
  date_creation: string;
  date_modification: string;
  
  // Relations (optionnelles)
  UserAccount?: User;
  OeuvreIntervenants?: OeuvreIntervenant[];
  Programmes?: Programme[];
  ProgrammeIntervenants?: ProgrammeIntervenant[];
}

// Type pour la création d'un intervenant
export type CreateIntervenantDTO = Omit<Intervenant, 
  | 'id_intervenant' 
  | 'date_creation' 
  | 'date_modification'
  | 'UserAccount'
  | 'OeuvreIntervenants'
  | 'Programmes'
  | 'ProgrammeIntervenants'
>;

// Type pour la mise à jour d'un intervenant
export type UpdateIntervenantDTO = Partial<CreateIntervenantDTO>;

// Helpers
export function getIntervenantNomComplet(intervenant: Intervenant): string {
  let nom = '';
  if (intervenant.titre_professionnel) {
    nom += intervenant.titre_professionnel + ' ';
  }
  nom += intervenant.prenom + ' ' + intervenant.nom;
  return nom;
}

export function ajouterSpecialite(intervenant: Intervenant, specialite: string): string[] {
  const specialites = intervenant.specialites || [];
  if (!specialites.includes(specialite)) {
    specialites.push(specialite);
  }
  return specialites;
}

// Types pour les statistiques
export interface IntervenantStatistiques {
  nombreProgrammes: number;
  nombreEvenements: number;
  prochaineProgramme: Programme | null;
}