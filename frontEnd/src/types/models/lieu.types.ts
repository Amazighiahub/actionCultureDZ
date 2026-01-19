// types/models/lieu.types.ts

import { TypeLieu } from '../enums/evenement.enums';
import { Commune, Localite } from './geography.types';
import { DetailLieu, Service, LieuMedia, Parcours, QrCode } from './lieux-details.types';
import { Evenement } from './evenement.types';
import { Programme } from './programme.types';

export interface Lieu {
  id_lieu: number;
  typeLieu: TypeLieu;
  communeId: number; // ✅ OBLIGATOIRE maintenant
  localiteId?: number; // Optionnel
  nom: string;
  adresse: string;
  latitude: number; // Validation : -90 à 90
  longitude: number; // Validation : -180 à 180
  typeLieuCulturel?: string;
  createdAt?: string;
  updatedAt?: string;
  
  // Relations (optionnelles)
  Commune?: Commune; // ✅ Accès à Daira et Wilaya via Commune
  Localite?: Localite;
  DetailLieu?: DetailLieu;
  Services?: Service[]; // ✅ Relation directe avec Service
  Media?: LieuMedia[];
  QrCodes?: QrCode[];
  Evenements?: Evenement[];
  Programmes?: Programme[];
  Parcours?: Parcours[];
}

// Type pour la création d'un lieu
export type CreateLieuDTO = Omit<Lieu, 
  | 'id_lieu' 
  | 'createdAt' 
  | 'updatedAt'
  | 'Commune'
  | 'Localite'
  | 'DetailLieu'
  | 'Services'
  | 'Media'
  | 'QrCodes'
  | 'Evenements'
  | 'Programmes'
  | 'Parcours'
>;

// Type pour la mise à jour d'un lieu
export type UpdateLieuDTO = Partial<CreateLieuDTO>;

// Type pour la validation des coordonnées GPS
export interface GPSCoordinates {
  latitude: number;
  longitude: number;
}

// Fonction de validation GPS
export function validateGPSCoordinates(coords: GPSCoordinates): boolean {
  return (
    coords.latitude >= -90 && 
    coords.latitude <= 90 && 
    coords.longitude >= -180 && 
    coords.longitude <= 180
  );
}

// Type pour la réponse avec hiérarchie géographique aplatie
export interface LieuWithHierarchy extends Lieu {
  wilaya?: {
    id_wilaya: number;
    nom: string;
    codeW: string;
  };
  daira?: {
    id_daira: number;
    nom: string;
  };
  commune?: {
    id_commune: number;
    nom: string;
  };
}