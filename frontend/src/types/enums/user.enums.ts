// types/enums/user.enums.ts


export type Sexe = 'M' | 'F';

export type StatutUser = 'actif' | 'inactif' | 'suspendu' | 'banni';

export type StatutValidation = 'en_attente' | 'valide' | 'rejete' | 'suspendu';

export type ThemePrefere = 'light' | 'dark' | 'auto';



export enum StatutUserEnum {
  ACTIF = 'actif',
  INACTIF = 'inactif',
  SUSPENDU = 'suspendu',
  BANNI = 'banni'
}

export enum StatutValidationEnum {
  EN_ATTENTE = 'en_attente',
  VALIDE = 'valide',
  REJETE = 'rejete',
  SUSPENDU = 'suspendu'
}

export enum ThemePrefereEnum {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto'
}