// types/enums/evenement.enums.ts

export type StatutEvenement = 
  | 'planifie' 
  | 'en_cours' 
  | 'termine' 
  | 'annule' 
  | 'reporte';



export enum StatutEvenementEnum {
  PLANIFIE = 'planifie',
  EN_COURS = 'en_cours',
  TERMINE = 'termine',
  ANNULE = 'annule',
  REPORTE = 'reporte'
}

export enum TypeLieuEnum {
  WILAYA = 'Wilaya',
  DAIRA = 'Daira',
  COMMUNE = 'Commune'
}
export enum TypeLieu {
  SALLE_SPECTACLE = 'salle_spectacle',
  GALERIE = 'galerie',
  ESPACE_CULTUREL = 'espace_culturel',
  MUSEE = 'musee',
  BIBLIOTHEQUE = 'bibliotheque',
  CINEMA = 'cinema',
  PLEIN_AIR = 'plein_air',
  AUTRE = 'autre'
}



export enum TypeInscription {
  LIBRE = 'libre',
  VALIDATION_REQUISE = 'validation_requise',
  SUR_INVITATION = 'sur_invitation'
}