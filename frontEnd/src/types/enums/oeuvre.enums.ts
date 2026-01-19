// types/enums/oeuvre.enums.ts

export type StatutOeuvre = 
  | 'brouillon' 
  | 'en_attente' 
  | 'publie' 
  | 'rejete' 
  | 'archive' 
  | 'supprime';

export enum StatutOeuvreEnum {
  BROUILLON = 'brouillon',
  EN_ATTENTE = 'en_attente',
  PUBLIE = 'publie',
  REJETE = 'rejete',
  ARCHIVE = 'archive',
  SUPPRIME = 'supprime'
}