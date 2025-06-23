// types/enums/programme.enums.ts

export type StatutProgramme = 
  | 'planifie' 
  | 'en_cours' 
  | 'termine' 
  | 'annule' 
  | 'reporte';

export type TypeActivite = 
  | 'conference' 
  | 'atelier' 
  | 'spectacle' 
  | 'exposition'
  | 'visite' 
  | 'degustation' 
  | 'projection' 
  | 'concert'
  | 'lecture' 
  | 'debat' 
  | 'formation' 
  | 'ceremonie' 
  | 'autre';

export type NiveauRequis = 
  | 'debutant' 
  | 'intermediaire' 
  | 'avance' 
  | 'expert';

export enum StatutProgrammeEnum {
  PLANIFIE = 'planifie',
  EN_COURS = 'en_cours',
  TERMINE = 'termine',
  ANNULE = 'annule',
  REPORTE = 'reporte'
}

export enum TypeActiviteEnum {
  CONFERENCE = 'conference',
  ATELIER = 'atelier',
  SPECTACLE = 'spectacle',
  EXPOSITION = 'exposition',
  VISITE = 'visite',
  DEGUSTATION = 'degustation',
  PROJECTION = 'projection',
  CONCERT = 'concert',
  LECTURE = 'lecture',
  DEBAT = 'debat',
  FORMATION = 'formation',
  CEREMONIE = 'ceremonie',
  AUTRE = 'autre'
}

export enum NiveauRequisEnum {
  DEBUTANT = 'debutant',
  INTERMEDIAIRE = 'intermediaire',
  AVANCE = 'avance',
  EXPERT = 'expert'
}