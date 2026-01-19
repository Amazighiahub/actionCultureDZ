// types/enums/media.enums.ts

export type TypeMedia = 
  | 'image' 
  | 'video' 
  | 'document' 
  | 'diaporama' 
  | 'audio';

export type QualiteMedia = 
  | 'basse' 
  | 'moyenne' 
  | 'haute' 
  | 'originale';

export type DroitsUsage = 
  | 'libre' 
  | 'commercial' 
  | 'presse' 
  | 'personnel' 
  | 'educatif' 
  | 'restriction';

export enum TypeMediaEnum {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  DIAPORAMA = 'diaporama',
  AUDIO = 'audio'
}

export enum QualiteMediaEnum {
  BASSE = 'basse',
  MOYENNE = 'moyenne',
  HAUTE = 'haute',
  ORIGINALE = 'originale'
}

export enum DroitsUsageEnum {
  LIBRE = 'libre',
  COMMERCIAL = 'commercial',
  PRESSE = 'presse',
  PERSONNEL = 'personnel',
  EDUCATIF = 'educatif',
  RESTRICTION = 'restriction'
}