// types/enums/liaison.enums.ts

// EvenementUser
export type RoleParticipation = 
  | 'participant' 
  | 'organisateur' 
  | 'intervenant' 
  | 'benevole' 
  | 'staff';

export type StatutParticipation = 
  | 'inscrit' 
  | 'confirme' 
  | 'present' 
  | 'absent' 
  | 'annule';

// EvenementOrganisation
export type RoleOrganisation = 
  | 'organisateur_principal' 
  | 'co_organisateur' 
  | 'partenaire'
  | 'sponsor' 
  | 'media_partner' 
  | 'soutien';

// OeuvreUser
export type RoleDansOeuvre = 
  | 'auteur' 
  | 'realisateur' 
  | 'acteur' 
  | 'musicien' 
  | 'artiste'
  | 'artisan' 
  | 'journaliste' 
  | 'scientifique' 
  | 'collaborateur' 
  | 'autre';

// UserOrganisation
export type RoleUserOrganisation = 
  | 'membre' 
  | 'responsable' 
  | 'directeur' 
  | 'collaborateur';

export enum RoleParticipationEnum {
  PARTICIPANT = 'participant',
  ORGANISATEUR = 'organisateur',
  INTERVENANT = 'intervenant',
  BENEVOLE = 'benevole',
  STAFF = 'staff'
}

export enum StatutParticipationEnum {
  INSCRIT = 'inscrit',
  CONFIRME = 'confirme',
  PRESENT = 'present',
  ABSENT = 'absent',
  ANNULE = 'annule'
}

export enum RoleOrganisationEnum {
  ORGANISATEUR_PRINCIPAL = 'organisateur_principal',
  CO_ORGANISATEUR = 'co_organisateur',
  PARTENAIRE = 'partenaire',
  SPONSOR = 'sponsor',
  MEDIA_PARTNER = 'media_partner',
  SOUTIEN = 'soutien'
}

export enum RoleDansOeuvreEnum {
  AUTEUR = 'auteur',
  REALISATEUR = 'realisateur',
  ACTEUR = 'acteur',
  MUSICIEN = 'musicien',
  ARTISTE = 'artiste',
  ARTISAN = 'artisan',
  JOURNALISTE = 'journaliste',
  SCIENTIFIQUE = 'scientifique',
  COLLABORATEUR = 'collaborateur',
  AUTRE = 'autre'
}

export enum RoleUserOrganisationEnum {
  MEMBRE = 'membre',
  RESPONSABLE = 'responsable',
  DIRECTEUR = 'directeur',
  COLLABORATEUR = 'collaborateur'
}