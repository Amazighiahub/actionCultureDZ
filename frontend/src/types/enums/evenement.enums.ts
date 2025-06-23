// types/enums/evenement.enums.ts

export type StatutEvenement = 
  | 'planifie' 
  | 'en_cours' 
  | 'termine' 
  | 'annule' 
  | 'reporte';

export type TypeLieu = 'Wilaya' | 'Daira' | 'Commune';

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